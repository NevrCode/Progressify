# Offline Cache and Synchronization

## Ownership

Authentication responses include `user_id`, the user's immutable secure UUID. Expo stores it with the token pair in SecureStore. Every SQLite cache and mutation row includes this owner ID, so data is never read or replayed for a different account. Personal workout drafts, programs, and water history also use owner-scoped AsyncStorage keys.

The SQLite filename includes a deterministic hash of the configured API base URL. Development, staging, and production therefore cannot read or replay each other's cached data. The previous environment-neutral database is deleted once during the upgrade because its rows cannot be assigned safely to an environment.

Logging out warns when unsynchronized changes exist. Confirming logout clears that user's cache and queue before clearing tokens.

## GET cache

Successful JSON GET responses are stored in `progressify-offline.db` with:

- Owner ID
- Canonical request key
- Payload
- Cache schema version
- Creation and expiration timestamps

The default TTL is 15 minutes. Expired or version-incompatible entries are not returned. Cached data is used only when the request fails because the device or server is unavailable.

## Mutation queue

JSON `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/v1/` receive a UUID `Idempotency-Key` before the initial network attempt. If connectivity fails, the same request and key are stored transactionally in SQLite.

Mutations are replayed in creation order by a single worker. The worker starts when:

- Connectivity returns
- The app becomes active
- A retry backoff expires

The worker refreshes an expired access token once and retries with the rotated token.

## Failure policy

- `2xx`: delete the local mutation.
- `408`, `425`, `429`, network failures, and `5xx`: retain and retry with bounded exponential backoff.
- `IDEMPOTENCY_IN_PROGRESS`: retain and retry.
- Other `4xx`: retain as `FAILED` for explicit retry or discard.
- Failed items are never silently deleted.
- Automatic replay stops after 8 attempts or when a queued mutation is 7 days old. The row becomes `FAILED`; an explicit user retry starts a fresh bounded retry window.

The sync badge reports offline, pending, syncing, and failed states. Pressing a failed badge offers Retry and Discard actions.

## Backend idempotency

The Spring Security chain applies `ApiIdempotencyFilter` after JWT authentication. The first `(owner_id, idempotency_key)` request creates a processing record. Responses below `500` are stored for 24 hours.

A duplicate request:

- Receives the stored status and body when the first request completed.
- Receives `409 IDEMPOTENCY_IN_PROGRESS` while the first request is still running.
- Receives `422 IDEMPOTENCY_KEY_REUSED` if the key is reused for another route or method.

Flyway migration `V4__add_api_idempotency.sql` creates the table and indexes. A daily scheduled job removes expired records.

## Boundaries

Multipart uploads are not queued. SQLite content is isolated by application sandbox, API environment, and authenticated owner but is not SQLCipher-encrypted. The deferred finance module must not rely on this queue until its production scope and at-rest encryption requirements are approved. Authentication tokens remain exclusively in SecureStore.
