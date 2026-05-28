# Security Policy

## Supported versions

This project is pre-1.0 and currently supports only the latest `main` branch and latest npm release.

## Reporting a vulnerability

Please report vulnerabilities privately by opening a GitHub Security Advisory draft in the repository.
Do not open public issues for security vulnerabilities.

Include:
- affected version and environment
- reproduction steps
- impact assessment
- suggested remediation (if available)

## Response targets

- Initial triage: within 3 business days
- Status update: within 7 business days
- Fix timeline: based on severity and exploitability

## Security model notes

`vite-plugin-approuter` is a build-time/codegen tool.
Generated client-side `middleware.ts` hooks run in the browser runtime only.
They are not a server-side security boundary and must not be used as authorization enforcement.
