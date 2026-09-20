# 📜 API Contract Specification — CareerTracker REST API v1

This document specifies the exact JSON request/response envelope schemas, HTTP status codes, authorization mechanisms, and endpoint signatures for the CareerTracker API (`/api/v1`).

---

## 1. Global Transport Protocol & Envelopes

All API requests and responses utilize versioned JSON payloads under `/api/v1/*`.

### Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address provided.",
    "details": [
      { "field": "email", "issue": "must be a valid email" }
    ]
  }
}
```

---

## 2. Standard HTTP Status Codes

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `200` | **OK** | Request completed successfully. |
| `201` | **Created** | Resource created successfully. |
| `400` | **Bad Request** | Validation failed or invalid payload syntax. |
| `401` | **Unauthorized** | Missing, invalid, or expired access token. |
| `403` | **Forbidden** | Insufficient permissions for resource. |
| `404` | **Not Found** | Resource or endpoint does not exist. |
| `409` | **Conflict** | Resource state conflict (e.g., duplicate email). |
| `413` | **Payload Too Large** | Upload exceeds 10 MB limit. |
| `429` | **Too Many Requests** | Rate limit quota exceeded. |
| `500` | **Internal Server Error** | Unexpected backend server error. |
| `503` | **Service Unavailable** | AI or database service temporarily offline. |

---

## 3. Endpoints Contract Reference

### 🔐 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e4e27b08-28a2-4e25-b7f4-1c8b16f1e429",
        "fullName": "Jane Doe",
        "email": "jane@university.edu",
        "role": "STUDENT"
      }
    }
  }
  ```

#### `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@university.edu",
    "password": "SecurePassword123!",
    "rememberMe": true
  }
  ```
- **Response `200 OK`** (Sets `HttpOnly` cookie `ct_refresh`):
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "expiresIn": 900
    }
  }
  ```

#### `POST /api/v1/auth/refresh`
- **Headers**: Reads `ct_refresh` cookie automatically.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "expiresIn": 900
    }
  }
  ```

#### `POST /api/v1/auth/logout`
- **Response `200 OK`**: Clears `ct_refresh` cookie.
  ```json
  {
    "success": true,
    "data": { "status": "SIGNED_OUT" }
  }
  ```

---

### 👤 Profile & User (`/api/v1/profile`)

#### `GET /api/v1/profile`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "b3f6d7a1-...",
      "college": "Stanford University",
      "degree": "B.S.",
      "branch": "Computer Science",
      "academicYear": "2025-2026",
      "semester": 7,
      "cgpa": 3.85,
      "targetRole": "Full Stack Developer",
      "targetCompany": "Google",
      "preferredStack": ["TypeScript", "Next.js", "PostgreSQL", "NestJS"],
      "studyHoursPerDay": 3.5,
      "placementTimelineMonths": 6
    }
  }
  ```

#### `PATCH /api/v1/profile`
- **Request Body**: Partial update object matching profile schema.
- **Response `200 OK`**: Updated profile object.

---

### 📄 Resume System (`/api/v1/resumes`)

#### `POST /api/v1/resumes/upload`
- **Content-Type**: `multipart/form-data` (Field: `file`)
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "res_827a1...",
      "fileName": "Jane_Doe_Resume.pdf",
      "fileSizeBytes": 482019,
      "status": "PENDING"
    }
  }
  ```

#### `POST /api/v1/resumes/analyze`
- **Request Body**: `{ "resumeId": "res_827a1..." }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "resumeId": "res_827a1...",
      "atsScore": 84,
      "resumeHealth": "HEALTHY",
      "keywordCoverage": 78,
      "quantifiedImpactCount": 12,
      "findings": [
        {
          "category": "KEYWORDS",
          "severity": "HIGH",
          "title": "Missing Core Stack Keyword: NestJS",
          "detail": "Target role Full Stack Developer requires NestJS expertise.",
          "recommendation": "Highlight backend NestJS modules in your projects section."
        }
      ]
    }
  }
  ```

---

### 📊 Dashboard & Readiness (`/api/v1/dashboard`)

#### `GET /api/v1/dashboard`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "readinessOverall": 78,
      "atsScore": 84,
      "streakDays": 14,
      "targetRole": "Full Stack Developer",
      "topSkillGaps": [
        { "name": "NestJS Architecture", "currentLevel": 4, "requiredLevel": 8 }
      ],
      "todayTasks": [
        { "id": "task_12", "title": "Build NestJS JWT Guard", "progress": 50 }
      ]
    }
  }
  ```

---

### 🗺️ Learning Roadmap (`/api/v1/roadmap`)

#### `POST /api/v1/roadmap/generate`
- **Response `200 OK`**: Renders generated roadmap phases and tasks.

#### `PATCH /api/v1/roadmap/task`
- **Request Body**:
  ```json
  {
    "taskId": "task_12",
    "status": "COMPLETED",
    "progress": 100
  }
  ```
- **Response `200 OK`**: Updated task object & recalculated readiness score.

---

### 🤖 AI Career Coach (`/api/v1/ai/chat`)

#### `POST /api/v1/ai/chat`
- **Request Body**:
  ```json
  {
    "message": "What should I learn today to prepare for Google interviews?"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "answer": "Based on your 78/100 readiness score and target role Full Stack Developer...",
      "provider": "openai",
      "model": "gpt-5.5",
      "degraded": false,
      "latencyMs": 420,
      "groundedIn": [
        "Readiness 78/100",
        "Resume ATS 84",
        "Top gap: NestJS Architecture"
      ]
    }
  }
  ```
