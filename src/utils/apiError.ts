import { isAxiosError } from "axios";

export type ApiErrorDetail = {
  field: string | null;
  message: string;
};

type BackendErrorResponse = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  request_id?: unknown;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details: ApiErrorDetail[];
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string,
    details: ApiErrorDetail[] = [],
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseDetails = (value: unknown): ApiErrorDetail[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((detail) => {
    if (!isRecord(detail) || typeof detail.message !== "string") return [];
    return [{
      field: typeof detail.field === "string" ? detail.field : null,
      message: detail.message,
    }];
  });
};

const fallbackForStatus = (status: number) => {
  if (status === 0) return "Unable to connect. Check your internet connection and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested information could not be found.";
  if (status === 409) return "This request conflicts with existing information.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The service is temporarily unavailable. Please try again later.";
  return "The request could not be completed. Please try again.";
};

const parseRetryAfter = (value: unknown) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = isRecord(error.response?.data)
      ? error.response?.data as BackendErrorResponse
      : undefined;
    const message = typeof data?.message === "string" && data.message.trim()
      ? data.message
      : fallbackForStatus(status);
    const code = typeof data?.code === "string" && data.code.trim()
      ? data.code
      : status === 0 ? "NETWORK_ERROR" : `HTTP_${status}`;
    const requestId = typeof data?.request_id === "string"
      ? data.request_id
      : undefined;

    return new ApiError(
      message,
      status,
      code,
      requestId,
      parseDetails(data?.details),
      parseRetryAfter(error.response?.headers?.["retry-after"]),
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0, "CLIENT_ERROR");
  }
  return new ApiError(fallbackForStatus(0), 0, "NETWORK_ERROR");
};

export const getErrorMessage = (error: unknown, fallback?: string) => {
  const apiError = toApiError(error);
  return apiError.message || fallback || fallbackForStatus(apiError.status);
};

export const getFieldErrors = (error: unknown) => {
  const apiError = toApiError(error);
  return apiError.details.reduce<Record<string, string>>((fields, detail) => {
    if (detail.field && !fields[detail.field]) fields[detail.field] = detail.message;
    return fields;
  }, {});
};

export const shouldRetryApiError = (failureCount: number, error: unknown) => {
  if (failureCount >= 2) return false;
  const apiError = toApiError(error);
  if (apiError.code === "CLIENT_ERROR") return false;
  return apiError.status === 0 ||
    apiError.status === 408 ||
    apiError.status === 425 ||
    apiError.status === 429 ||
    apiError.status >= 500;
};
