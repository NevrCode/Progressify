export const isAuthenticationRefreshFailure = (status?: number) =>
  status === 400 || status === 401;
