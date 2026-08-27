# Critical mobile E2E flows

These Maestro flows exercise active production paths. Point the test build at a
disposable backend and use a dedicated seeded account through `E2E_EMAIL` and
`E2E_PASSWORD`; never run destructive E2E against development or production.

```powershell
maestro test -e E2E_EMAIL=test@example.com `
  -e E2E_PASSWORD=local-test-secret `
  -e E2E_EXERCISE="E2E Bench Press" `
  -e E2E_CUSTOM_FOOD="E2E Chicken Bowl" e2e
```

The suite covers login, persisted-session recovery, workout and
nutrition navigation, logout, registration, password reset and account
deletion. The destructive flows require isolated fixtures:

- `E2E_NEW_NAME`, `E2E_NEW_EMAIL`, `E2E_NEW_PASSWORD`: an unused registration
  identity that the harness removes after the run;
- `E2E_RESET_EMAIL`, `E2E_RESET_TOKEN`: a disposable account and one-use reset
  token issued by the isolated backend harness;
- `E2E_DELETE_EMAIL`, `E2E_DELETE_PASSWORD`: an account created exclusively for
  the deletion flow.
- `E2E_EXERCISE`: a seeded progression with a valid first draft set;
- `E2E_CUSTOM_FOOD`: a unique name that the harness removes after the run.

Run non-destructive critical flows with:

```powershell
maestro test --include-tags critical --exclude-tags destructive `
  -e E2E_EMAIL=test@example.com `
  -e E2E_PASSWORD=local-test-secret e2e
```

Run destructive flows only after provisioning all disposable fixtures. Never
point them at development or production. Finance remains excluded until PR-008
is enabled, as required by the reviewed roadmap.
