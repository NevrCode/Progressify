# Progressify Production Readiness Audit

Audit date: 2026-07-14

Repositories:

- Frontend: `C:\rn\Progressify` (React Native, Expo Router)
- Backend: `C:\spring\ex-tracker` (Spring Boot, PostgreSQL)

## Executive Summary

Progressify has a good development and beta foundation, but it is not ready for a public production release. The primary blockers are exposed credentials, authorization vulnerabilities, refresh-token replay, unsafe offline synchronization, and incomplete production database ownership.

The recommended implementation order is:

1. Rotate credentials and repair authorization.
2. Redesign refresh-token rotation and logout.
3. Replace or harden the offline cache and mutation queue.
4. Make Flyway the only production schema owner.
5. Correct financial data integrity and request validation.
6. Add automated testing and CI release gates.
7. Complete store, privacy, monitoring, and operational requirements.

## Verification Performed

- Expo Doctor: 21 of 21 checks passed.
- TypeScript: `npx tsc --noEmit` passed.
- ESLint: failed with 6 errors and 61 warnings.
- Backend Maven compilation: passed.
- Flyway baseline version 1 and gym index migration version 2 were verified in PostgreSQL.
- Nine gym indexes were verified in PostgreSQL.
- No production EAS build, store submission, penetration test, load test, backup restore, or disaster-recovery test was performed.

## Existing Strengths

- Expo SDK and native dependency compatibility pass Expo Doctor.
- TypeScript compiles without type errors.
- Authentication tokens are generally stored with Expo SecureStore.
- TanStack Query is established for server-state management.
- Core gym, nutrition, account, transaction, and budget operations generally scope records to the authenticated user.
- Controllers mostly return DTOs rather than serializing JPA entities.
- Gym data follows the Exercise -> Session -> Set hierarchy.
- Historical gym calculations are derived from session and set records.
- Flyway is enabled and has successfully applied the gym index migration.

## Critical Release Blockers

### PR-001: Rotate and Remove Exposed Credentials

Severity: Critical

Evidence:

- Backend `src/main/resources/application.properties`
- Backend `src/main/resources/application-dev.properties`
- Both files are tracked by Git and contain live credential values.

Risk:

Database credentials, the JWT signing secret, and third-party API credentials can be used outside the application. Removing them from the latest commit is insufficient because they remain available in Git history.

Required work:

- [ ] Rotate the PostgreSQL password.
- [ ] Rotate the JWT signing secret and invalidate existing tokens.
- [ ] Rotate FatSecret credentials.
- [ ] Store production and development secrets in environment variables or a secret manager.
- [ ] Replace committed values with `${ENVIRONMENT_VARIABLE}` placeholders.
- [ ] Remove secrets from Git history with an approved history-rewrite procedure.
- [ ] Add secret scanning to CI.
- [ ] Confirm Render, EAS, and local development use separate credentials.

### PR-002: Prevent Public Role Assignment

Severity: Critical

Evidence:

- Frontend `src/services/authService.ts:26` sends `ROLE_ADMIN` during registration.
- Backend `src/main/java/com/nvercode/tracker/dto/UserCreateRequestDTO.java:16` accepts a role from the client.
- Backend `src/main/java/com/nvercode/tracker/service/impl/UserServiceImpl.java:43` loads and assigns the submitted role.
- `/auth/register` is publicly accessible.

Risk:

An unauthenticated caller can request a privileged role. Even where current endpoints do not enforce role separation, this creates immediate privilege-escalation risk as admin-only behavior is introduced.

Required work:

- [ ] Remove `role` from the public registration DTO.
- [ ] Assign a fixed basic-user role on the server.
- [ ] Create a separate admin-only role-management endpoint if role changes are needed.
- [ ] Normalize role codes so authorities do not become values such as `ROLE_ROLE_ADMIN`.
- [ ] Add registration and privilege-escalation security tests.

### PR-003: Repair User Authorization and Password Updates

Severity: Critical

Evidence:

- Backend `src/main/java/com/nvercode/tracker/controller/UserResource.java:33` reads arbitrary users by ID.
- Backend `src/main/java/com/nvercode/tracker/controller/UserResource.java:45` updates arbitrary users by ID.
- Backend `src/main/java/com/nvercode/tracker/controller/UserResource.java:52` deletes arbitrary users by ID.
- Backend `src/main/java/com/nvercode/tracker/controller/UserResource.java:58` exposes the user directory to any authenticated user.
- Backend `src/main/java/com/nvercode/tracker/service/impl/UserServiceImpl.java:63` stores an updated password without encoding it.

Risk:

Any authenticated user can read, modify, or delete another user's account. A password update stores plaintext and also prevents normal password verification from working.

Required work:

- [ ] Replace ID-based self-service operations with `/v1/user/me` operations.
- [ ] Require explicit admin authorization for user-directory and cross-user operations.
- [ ] Encode every password before persistence.
- [ ] Require the current password or a verified reset token before changing a password.
- [ ] Add a database unique constraint for normalized email addresses.
- [ ] Prevent deleted or disabled users from authenticating.
- [ ] Add IDOR and authorization integration tests.

### PR-004: Implement Real Refresh-Token Rotation

Severity: Critical

Evidence:

- Backend `src/main/java/com/nvercode/tracker/security/util/JWTTokenFactory.java:28`
- Backend `src/main/java/com/nvercode/tracker/security/util/JWTTokenFactory.java:48`
- Backend `src/main/java/com/nvercode/tracker/security/util/JWTTokenValidator.java:16`
- Backend `src/main/java/com/nvercode/tracker/service/impl/RefreshTokenServiceImpl.java:27`
- Access and refresh tokens use the same secret and have no enforced token type.
- Rotation creates a new refresh token without revoking the old token.
- Configured access lifetime is approximately 10 hours; refresh lifetime is approximately 416 days.

Risk:

An access token may be accepted by the refresh flow, and a stolen refresh token can be replayed repeatedly until it expires. Logout cannot revoke the server-side session.

Required work:

- [ ] Add and validate `type`, `jti`, `iss`, and `aud` claims.
- [ ] Use separate validation rules or signing keys for access and refresh tokens.
- [ ] Store only hashed refresh-token identifiers server-side.
- [ ] Rotate refresh tokens atomically and revoke the previous token.
- [ ] Detect reuse of a revoked refresh token and revoke the token family.
- [ ] Add logout and logout-all-devices endpoints.
- [ ] Shorten token lifetimes according to the chosen risk model.
- [ ] Add refresh, replay, expiry, logout, and concurrent-refresh tests.

### PR-005: Redesign Offline Cache and Mutation Synchronization

Severity: Critical

Evidence:

- Frontend `src/services/syncQueueService.ts:6` uses global cache and queue keys.
- Frontend `src/services/syncQueueService.ts:45` queues mutations without a user or session owner.
- Frontend `src/utils/api.ts:90` treats network errors and some server failures as offline behavior.
- Frontend `src/utils/api.ts:122` returns a synthetic HTTP 200 before the backend accepts a mutation.
- Frontend `src/app/(tabs)/profile.tsx:93` removes only the access token on logout.

Risk:

Cached private data can be shown to a different account after logout. A queued mutation created by user A can later execute with user B's token. A server-processed request whose response is lost can be replayed and create duplicate workouts, food entries, or financial records.

Required work:

- [ ] Include authenticated user ID and environment in every cache and queue key.
- [ ] Clear user-scoped caches and queues during logout and account changes.
- [ ] Remove both access and refresh tokens during logout.
- [ ] Never classify generic HTTP 500 responses as offline.
- [ ] Do not return synthetic success for an unconfirmed server write.
- [ ] Add explicit UI states such as `pending_sync`, `synced`, and `failed`.
- [ ] Use cryptographically strong IDs instead of `Math.random()`.
- [ ] Add an idempotency key to every replayable create operation.
- [ ] Persist idempotency keys on the backend with a uniqueness constraint.
- [ ] Add retry limits, backoff, conflict handling, expiry, and a dead-letter state.
- [ ] Consider encrypting sensitive offline health and financial records.
- [ ] Integrate React Query with network state rather than triggering queue processing after every successful response.

### PR-006: Remove Sensitive Logging

Severity: Critical

Evidence:

- Frontend `src/utils/api.ts:142` logs the refresh token.
- Frontend `src/services/accountService.ts:26` logs the access token.
- Frontend `src/services/accountService.ts:73` logs the full bearer value.
- Multiple screens and services log API response bodies and user data.

Required work:

- [ ] Remove all token and authorization-header logs.
- [ ] Replace ad hoc console logging with a production-safe logging abstraction.
- [ ] Redact credentials, emails, identifiers, health data, and financial data.
- [ ] Disable verbose logs in production builds.

## High-Priority Engineering Work

### PR-007: Make Production Configuration Explicit

Severity: High

Evidence:

- Backend `src/main/resources/application.properties:2` activates `dev` by default.
- Backend `src/main/resources/application-prod.properties:12` uses `spring.jpa.hibernate.ddl-auto=update`.
- Backend Flyway migrations currently begin with `V2__add_gym_indexes.sql`; there is no complete schema migration.

Required work:

- [ ] Remove `spring.profiles.active=dev` from shared configuration.
- [ ] Activate profiles through deployment environment variables.
- [ ] Create a complete `V1__create_schema.sql` for fresh databases.
- [ ] Move every schema change, constraint, and index into Flyway.
- [ ] Change production Hibernate behavior to `ddl-auto=validate`.
- [ ] Test migration from a production-like snapshot.
- [ ] Test building a completely empty database from migrations.
- [ ] Define rollback and forward-fix procedures.

### PR-008: Correct Financial Data Integrity

Severity: High

Evidence:

- Backend money values use `Double` in accounts, transactions, and budgets.
- Backend `src/main/java/com/nvercode/tracker/service/impl/AccountServiceImpl.java:55` has reversed account-type update logic.
- Transaction creation and account balance updates are not one atomic server operation.
- The database models shown do not use optimistic locking.

Required work:

- [ ] Replace monetary `Double` fields with `BigDecimal`.
- [ ] Use PostgreSQL `NUMERIC(precision, scale)` columns.
- [ ] Fix account-type update null handling.
- [ ] Make transaction and balance changes atomic with `@Transactional`.
- [ ] Decide whether balances are derived or maintained and enforce one model.
- [ ] Add optimistic locking with `@Version` where concurrent edits matter.
- [ ] Add database constraints for non-null values and valid ranges.
- [ ] Add financial rounding, concurrency, and rollback tests.

### PR-009: Strengthen Request and Database Validation

Severity: High

Evidence:

- Gym request DTOs accept arbitrary strings and unbounded numeric values.
- Session dates are strings rather than typed dates.
- Several update endpoints do not use `@Valid`.
- Entity constraints and database constraints are inconsistent.

Required work:

- [ ] Use enums for split values.
- [ ] Use `LocalDate` or `Instant` for dates and timestamps.
- [ ] Validate weight, reps, set number, RIR, duration, volume, and text lengths.
- [ ] Add nested `@Valid` validation for session sets.
- [ ] Reject NaN, infinity, negative macros, and invalid monetary values.
- [ ] Add foreign keys, unique constraints, check constraints, and intentional delete behavior through Flyway.
- [ ] Replace string audit timestamps with typed timestamps managed consistently.

### PR-010: Return Safe Production Errors

Severity: High

Evidence:

- Backend `src/main/java/com/nvercode/tracker/exception/ExceptionHandlerAdvice.java:84` returns exception class names and messages to clients.

Required work:

- [ ] Return stable public error codes and user-safe messages.
- [ ] Log internal exception details only on the server.
- [ ] Add a correlation/request ID to logs and error responses.
- [ ] Map conflict, duplicate, validation, unsupported operation, and upstream errors deliberately.
- [ ] Do not expose SQL, table, stack, token, or infrastructure details.

### PR-011: Add Abuse Protection

Severity: High

Required work:

- [ ] Rate-limit login, registration, refresh, password reset, and FatSecret proxy endpoints.
- [ ] Add exponential login backoff or temporary lockout.
- [ ] Restrict request sizes and upload types.
- [ ] Restrict CORS origins for supported web deployments; current backend configuration allows every origin.
- [ ] Add upstream timeouts, retry boundaries, and circuit breaking for FatSecret and storage services.
- [ ] Add server-side caching with TTL for suitable FatSecret responses only after measuring need.

## Mobile Release Requirements

### PR-012: Correct EAS Production Profiles

Severity: High

Evidence:

- Frontend `eas.json:14` configures the production Android build as an APK.
- Frontend `app.json:5`, `app.json:62`, and `package.json:4` contain inconsistent displayed versions.
- The production submit profile is empty.

Required work:

- [ ] Use Android `app-bundle` for Play Store production builds.
- [ ] Keep APK builds in preview/internal profiles.
- [ ] Add `autoIncrement` for store build numbers.
- [ ] Align app, package, and displayed versions.
- [ ] Configure internal, preview, and production environments separately.
- [ ] Configure Android and iOS submission credentials through EAS secrets.
- [ ] Release through internal testing and TestFlight before public rollout.
- [ ] Use staged/phased production rollouts.

References:

- Expo Android production builds: https://docs.expo.dev/tutorial/eas/android-production-build/
- Expo app store builds: https://docs.expo.dev/deploy/build-project/

### PR-013: Fix Static Quality Gates

Severity: High

Evidence:

- ESLint reports 6 errors and 61 warnings.
- Ref access during render is reported in:
  - Frontend `src/app/(pages)/workoutSession.tsx:392`
  - Frontend `src/app/(tabs)/foodDiary.tsx:1796`
  - Frontend `src/app/(tabs)/gymProgression.tsx:1264`
- Several hooks have missing dependency warnings.

Required work:

- [ ] Fix all ESLint errors before release.
- [ ] Review and resolve hook dependency warnings.
- [ ] Remove unused code and debug output.
- [ ] Add `typecheck` and `test` scripts to `package.json`.
- [ ] Make lint, typecheck, tests, and Expo Doctor required CI checks.

### PR-014: Complete Authentication User Experience

Severity: High

Evidence:

- Frontend `src/app/(auth)/login.tsx:207` contains placeholder forgot-password behavior.
- There is no verified password-reset flow.
- The mobile route guard checks only whether an access token exists, not whether the session is valid.

Required work:

- [ ] Implement forgot-password request and reset-token confirmation.
- [ ] Avoid exposing whether an email exists.
- [ ] Add session-expired navigation after refresh failure.
- [ ] Centralize authentication state instead of deriving it from route changes.
- [ ] Clear tokens, query state, offline state, and private caches atomically on logout.
- [ ] Support email verification if required by the product risk model.

## Privacy and Store Compliance

### PR-015: Add Account and Data Deletion

Severity: High

Progressify supports in-app account creation, so store policies require an account-deletion path.

Required work:

- [ ] Add an easy-to-find in-app account deletion flow.
- [ ] Add a public web URL for account/data deletion requests.
- [ ] Delete or anonymize associated workout, nutrition, financial, image, token, and profile data.
- [ ] Define legally required retention exceptions and communicate them clearly.
- [ ] Revoke sessions immediately when deletion begins.
- [ ] Test deletion for completeness and authorization.

References:

- Apple account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111

### PR-016: Complete Privacy and Legal Material

Severity: High

Required work:

- [ ] Publish a privacy policy and terms of service.
- [ ] Document collected health, fitness, nutrition, financial, camera, device, and diagnostic data.
- [ ] Document processing purposes, retention, deletion, security, and third-party sharing.
- [ ] Complete Apple App Privacy and Google Play Data Safety declarations accurately.
- [ ] Add required consent and permission explanations.
- [ ] Provide support and privacy contact details.
- [ ] Review applicable Indonesian and target-market privacy requirements with qualified counsel.

## Testing and Delivery

### PR-017: Build an Automated Test Pyramid

Severity: High

Current backend tests only load the application context or exercise password encoding, and no frontend test suite was found.

Required work:

- [ ] Add backend unit tests for calculations, validation, and service rules.
- [ ] Add repository tests using an isolated PostgreSQL-compatible test database or Testcontainers.
- [ ] Add Spring MockMvc integration tests for authentication, authorization, ownership, validation, and errors.
- [ ] Add migration tests from empty and previous-version databases.
- [ ] Add frontend unit tests for services, hooks, formatters, and reducers.
- [ ] Add component tests for loading, error, empty, and offline states.
- [ ] Add end-to-end tests for register, login, token refresh, workout completion, food logging, finance writes, logout, and account deletion.
- [ ] Add idempotency and offline replay tests.
- [ ] Avoid running tests against the live development or production database.

### PR-018: Add CI/CD Quality Gates

Severity: High

Required work:

- [ ] Run backend compile, tests, and Flyway validation on every pull request.
- [ ] Run frontend lint, TypeScript, tests, and Expo Doctor on every pull request.
- [ ] Add dependency and secret scanning.
- [ ] Build release candidates from immutable commits or tags.
- [ ] Require approval before production migrations and store submissions.
- [ ] Define an OTA update policy compatible with `runtimeVersion`.
- [ ] Add rollback instructions for backend deployments and Expo updates.

## Operations and Reliability

### PR-019: Add Monitoring and Health Checks

Severity: Medium

Required work:

- [ ] Add Spring Boot Actuator with carefully secured health and metrics endpoints.
- [ ] Add readiness and liveness checks for the hosting platform.
- [ ] Add structured JSON logs and correlation IDs.
- [ ] Add API latency, error rate, JVM, connection-pool, database, and upstream metrics.
- [ ] Add mobile crash reporting and release/version context.
- [ ] Alert on authentication spikes, elevated 5xx responses, migration failures, and database saturation.
- [ ] Avoid collecting sensitive payloads in logs or crash reports.

Reference: https://docs.spring.io/spring-boot/reference/actuator/index.html

### PR-020: Define Backup and Recovery

Severity: High

Required work:

- [ ] Confirm automated PostgreSQL backups and point-in-time recovery.
- [ ] Document recovery point and recovery time objectives.
- [ ] Perform and record a restore drill.
- [ ] Back up required object-storage metadata and define orphan cleanup.
- [ ] Document incident response, key rotation, and compromised-token procedures.

### PR-021: Harden Backend Deployment

Severity: Medium

Required work:

- [ ] Run the final container as a non-root user.
- [ ] Use a smaller JRE runtime image rather than a full JDK image.
- [ ] Add container and dependency vulnerability scanning.
- [ ] Configure graceful shutdown and deployment health checks.
- [ ] Set explicit JVM memory behavior for the hosting limit.
- [ ] Ensure production logs do not use debug levels.
- [ ] Verify the hosting plan avoids unacceptable cold starts and supports required availability.

### PR-022: Remove or Finish Incomplete Backend Features

Severity: Medium

Evidence:

- Backend project and task services contain `UnsupportedOperationException` placeholders.

Required work:

- [ ] Complete and secure these endpoints, or remove them from the deployed API.
- [ ] Ensure unfinished features are not reachable in production.
- [ ] Remove placeholder and development-only user-facing text.

## Production Definition of Done

The application is ready for a public production release only when all items below are true:

- [ ] No live secrets exist in source or Git history.
- [ ] Public registration cannot assign roles.
- [ ] Cross-user authorization tests pass.
- [ ] Password update and reset flows are secure.
- [ ] Refresh-token replay and logout revocation tests pass.
- [ ] Offline data is user-scoped, idempotent, and never reports false success.
- [ ] Flyway fully owns the production schema and Hibernate uses `validate`.
- [ ] Financial values and transactions are precise and atomic.
- [ ] All critical DTO and database constraints are enforced.
- [ ] TypeScript, ESLint, automated tests, and Expo Doctor pass in CI.
- [ ] Android AAB and iOS TestFlight release candidates pass real-device testing.
- [ ] Privacy policy, data safety declarations, and account deletion are complete.
- [ ] Health checks, crash reporting, metrics, alerts, backups, and restore procedures are verified.
- [ ] A staged rollout and rollback plan has been approved.

## Recommended Delivery Phases

### Phase 1: Security and Identity

Complete PR-001 through PR-006 before distributing another external beta.

### Phase 2: Data Integrity and Database Ownership

Complete PR-007 through PR-011 before accepting production user data.

### Phase 3: Release Quality and Compliance

Complete PR-012 through PR-018 before store submission.

### Phase 4: Operations and Launch

Complete PR-019 through PR-022, run a restore drill, then release through internal testing, staged rollout, and monitored production expansion.
