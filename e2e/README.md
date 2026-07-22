# Critical mobile E2E flows

These Maestro flows exercise active production paths. Point the test build at a
disposable backend and use a dedicated seeded account through `E2E_EMAIL` and
`E2E_PASSWORD`; never run destructive E2E against development or production.

```powershell
maestro test -e E2E_EMAIL=test@example.com -e E2E_PASSWORD=local-test-secret e2e
```

The current flows cover login, workout and nutrition navigation, and logout.
Registration, password reset and account deletion require disposable email and
reset-token fixtures from the isolated E2E backend harness. Finance remains
excluded until PR-008 is enabled, as required by the reviewed roadmap.
