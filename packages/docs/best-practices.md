---
order: 40
---

# Best practices

This page lists a selection of useful best practices that we recommend abiding by when implementing your application.

## Security

**Encryption Key**: The `SESSION_ENCRYPTION_KEY` (used for [authentication](./backend/authentication.md)) must be at least 32 characters and kept secret. It signs JWTs and encrypts OAuth state. The server validates this on startup.

**HTTPS**: Always use HTTPS in production. Tokens sent over HTTP can be intercepted.

