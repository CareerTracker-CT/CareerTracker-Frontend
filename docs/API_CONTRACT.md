# CareerTracker — Versioned REST API Contract

Base path: `/api/v1`

## Envelopes

Every successful response:

```jsonc
{
  "success": true,
  "data": { /* resource or collection */ },
  "meta": { /* optional: totals, filters, cache info */ }
}
```

Every failure:

```jsonc
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields and try again.",
    "details": { "email": ["Enter a valid email address."] },
    "correlationId": "8f14e45f-ea3a-4c93-9d21-6f0b1c6a1e77"
  }
}
```

`message` is always human and actionable. Stack traces, SQL messages and provider errors are
logged server-side against `correlationId` and never returned.

## Error codes

| HTTP | Code                     | Typical cause                                    |
| ---- | ------------------------ | ------------------------------------------------ |
| 400  | `VALIDATION_ERROR`       | DTO / query validation failed                    |
| 401  | `UNAUTHORIZED`           | Missing, expired or malformed access token       |
| 403  | `FORBIDDEN`              | Authenticated but lacking the required role      |
| 404  | `NOT_FOUND`              | Resource does not exist or is soft-deleted       |
| 409  | `CONFLICT`               | Duplicate email, stale write, invalid transition |
| 413  | `PAYLOAD_TOO_LARGE`      | Upload exceeds `MAX_UPLOAD_BYTES`                |
| 415  | `UNSUPPORTED_MEDIA_TYPE` | MIME/extension not in the allow-list             |
| 429  | `RATE_LIMITED`           | Throttle window exceeded                         |
| 500  | `INTERNAL_ERROR`         | Unhandled server failure                         |
| 503  | `SERVICE_UNAVAILABLE`    | Dependency (AI provider, storage) unavailable    |

## Resources

### Auth — `/api/v1/auth`

| Method | Path        | Description                                        |
| ------ | ----------- | -------------------------------------------------- |
| POST   | `/register` | Create an account. Returns `PENDING_VERIFICATION`. |
| POST   | `/login`    | Verify credentials, set HTTP-only refresh cookie.  |
| POST   | `/refresh`  | Rotate tokens using the refresh cookie.            |
| POST   | `/logout`   | Revoke the refresh token and clear the cookie.     |

### Profile — `/api/v1/profile`

| Method | Path | Description                                  |
| ------ | ---- | -------------------------------------------- |
| GET    | `/`  | Current user + career profile                |
| PUT    | `/`  | Partial update; only supplied fields change  |

### Resumes — `/api/v1/resumes`

| Method | Path          | Description                                       |
| ------ | ------------- | ------------------------------------------------- |
| GET    | `/`           | Resume history with analysis + findings           |
| POST   | `/`           | Upload (multipart). Validates MIME, size, extension |
| POST   | `/:id/analyse`| Enqueue analysis job (returns `202`)              |
| DELETE | `/:id`        | Soft-delete                                       |

### Skills — `/api/v1/skills`

| Method | Path | Description                                     |
| ------ | ---- | ----------------------------------------------- |
| GET    | `/`  | Tracked skills + `meta.coverage`, `meta.highPriorityGaps` |
| POST   | `/`  | Add a skill                                     |
| PATCH  | `/:id` | Update level/progress                         |

### Roadmap — `/api/v1/roadmap`

| Method | Path           | Description                            |
| ------ | -------------- | -------------------------------------- |
| GET    | `/`            | Tasks + `meta.phases` summary          |
| POST   | `/generate`    | Enqueue roadmap generation (BullMQ)    |
| PATCH  | `/tasks/:id`   | Update status / progress               |

### Dashboard — `/api/v1/dashboard`

| Method | Path | Description                                                    |
| ------ | ---- | -------------------------------------------------------------- |
| GET    | `/`  | Readiness, metrics, today's tasks, gaps, recommendations, activity |

### AI — `/api/v1/ai`

| Method | Path    | Description                                                     |
| ------ | ------- | --------------------------------------------------------------- |
| POST   | `/chat` | Contextual assistant. Streams when `Accept: text/event-stream`. |
| GET    | `/providers` | Which providers are configured (never exposes keys)         |

### Notifications — `/api/v1/notifications`

| Method | Path      | Description              |
| ------ | --------- | ------------------------ |
| GET    | `/`       | List, `meta.unread`      |
| PATCH  | `/`       | Mark read (`{ id }`)     |

## Conventions

- **Versioning** — URI based (`/api/v1`). Breaking changes ship under `/api/v2`.
- **Pagination** — `?limit=20&cursor=<opaque>`; responses include `meta.nextCursor`.
- **Filtering** — `?status=INTERVIEW&sort=-appliedAt`.
- **Idempotency** — `Idempotency-Key` header honoured on all POSTs that create resources.
- **Rate limiting** — `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers.
- **Caching** — `ETag` / `If-None-Match` on GETs for read-heavy endpoints.
