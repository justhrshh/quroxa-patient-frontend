# QUROXA — STAGE G.2: PRODUCTION BACKEND CORS SECURITY HARDENING REPORT

**Project:** QUROXA Patient Portal  
**Target:** Production Backend CORS & Socket.IO Origin Security Hardening  
**Service ID:** `srv-da9t6nss728c73eooctg` (`CUROXA` on Render)  
**Backend API:** `https://curoxa.onrender.com`  
**Deploy ID:** `dep-dbsvj59lodes73a46pqg`  
**Git Commit:** `ad3bf17` (`ad3bf1783e509c1a593b1ad4bbc17ee86de8b631`)  
**Stage:** Stage G.2 — Production Backend CORS Security Hardening  
**Date:** 15 November 2026  
**Auditor / Lead Infrastructure Security Engineer:** Lead Cloud Infrastructure Engineer  
**Status:** **PASS — PRODUCTION CORS HARDENING & DEPLOYMENT COMPLETE**

---

## 1. EXECUTIVE SUMMARY

Stage G.2 authorized the complete replacement of the existing permissive production CORS configuration (`origin: true`) on the shared QUROXA backend with a hardened, explicit production origin allowlist.

The hardening was executed without touching clinical business logic, database schemas, or staff frontend code. All unit and integration security tests passed with 100% success (28/28 passed). The backend was redeployed to Render with updated environment variables, and live browser smoke tests confirmed that both the **Staff Frontend** (`https://curoxa-1.onrender.com`) and the **Patient Frontend** (`https://quroxa-patient-frontend.onrender.com`) receive exact-origin CORS headers with credentials enabled, while unapproved origins are strictly denied CORS headers.

| Metric | Target | Verified Production State | Status |
|:---|:---|:---|:---:|
| **Backend Service** | `CUROXA` (`srv-da9t6nss728c73eooctg`) | **Live** at `https://curoxa.onrender.com` | **PASS** |
| **Active Deploy ID** | `dep-dbsvj59lodes73a46pqg` | Deployed in 47.5s, Status: Live | **PASS** |
| **Deployed Commit** | `ad3bf17` | `ad3bf1783e509c1a593b1ad4bbc17ee86de8b631` | **PASS** |
| **CORS Policy** | Exact Origin Allowlist | Replaced `origin: true` with strict exact matching | **PASS** |
| **Staff Frontend CORS** | `https://curoxa-1.onrender.com` | Allowed with exact ACAO & credentials: true | **PASS** |
| **Patient Frontend CORS** | `https://quroxa-patient-frontend.onrender.com` | Allowed with exact ACAO & credentials: true | **PASS** |
| **Socket.IO Origin Policy** | Hardened handshake `allowRequest` | Exact allowlist enforced on WebSocket handshakes | **PASS** |
| **Unapproved Origins** | Cross-origin access blocked | `Access-Control-Allow-Origin` omitted on unapproved origins | **PASS** |
| **Security Test Suite** | 28 automated tests | **28/28 Passed (0 Failures)** | **PASS** |

---

## 2. SECTION A: PRE-CHANGE STATE

Prior to making any modifications, a comprehensive audit of the production backend service, environment settings, and frontends was performed:

1. **Existing CORS Implementation (`server.js`):**
   ```javascript
   const corsOptions = {
     origin: true, // Dynamically reflected any incoming browser origin!
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
     ...
   };
   ```
   Socket.IO was initialized with `cors: { origin: corsOptions.origin }`, exposing WebSocket connections to arbitrary origins without handshake origin gating.

2. **Existing Environment Configuration on Render:**
   - Total environment variables: 20 configured.
   - `CORS_ORIGIN` was set to `http://localhost:3000,http://localhost:5173`.
   - `STAFF_FRONTEND_URL` was **absent**.
   - `PATIENT_FRONTEND_URL` was **absent**.
   - Because production frontends were missing from `CORS_ORIGIN`, the previous configuration relied on `origin: true` to prevent CORS breakage.

3. **Backend Health & Deployment:**
   - Previous Live Deploy ID: `dep-dbqukv0ae00c73fbdfbg`.
   - Previous Commit: `d2f9315` ("sms integration, qr changes, cloudfare setup").
   - Service Status: **Live** (200 OK on health check `Curoxa API is running...`).
   - Staff Frontend (`https://curoxa-1.onrender.com`): **Live** (200 OK, login card loaded).

---

## 3. SECTION B: CODE CHANGES

Four scoped files were created or updated to establish the hardened origin architecture:

### 3.1 Exact Files Modified
1. **`clinical_management/backend/config/corsConfig.js` (NEW):**
   - Implements `normalizeOrigin(originStr)`: canonical URL origin normalization, trailing slash stripping, lowercase scheme/host, and rejection of `null`, `*`, `true`, `false`, and malformed protocols.
   - Implements `getParsedOriginsFromEnv()`: parses comma-separated origins from `STAFF_FRONTEND_URL`, `PATIENT_FRONTEND_URL`, `CORS_ORIGIN`, and `FRONTEND_URL`. In production (`NODE_ENV === 'production'`), localhost origins are excluded unless explicitly declared.
   - Implements `isOriginAllowed(origin, allowedOriginsSet)`: strict exact matching using a normalized `Set<string>`. Rejects substring matching and regex lookalikes.
   - Implements `getCorsOptions()`: Express CORS configuration with dynamic callback. Requests without `Origin` header (curl, mobile apps, server-to-server) proceed cleanly while standard route-level JWT/cookie authentication enforces security. `Origin: null` and unapproved origins are rejected without emitting `Access-Control-Allow-Origin`.
   - Implements `getSocketIoCorsConfig()`: Socket.IO configuration integrating exact-origin CORS and an `allowRequest(req, callback)` handshake validator to reject unapproved WebSocket origins.

2. **`clinical_management/backend/server.js` (MODIFIED):**
   - Replaced permissive `const corsOptions = { origin: true, ... }` with `getCorsOptions()` from `./config/corsConfig`.
   - Replaced permissive Socket.IO initialization with `getSocketIoCorsConfig()`.
   - Preserved all required HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`), request headers (`Content-Type`, `Authorization`, `x-tenant-id`, `x-bypass-consent-emergency`, etc.), and exposed headers (`Content-Disposition`).

3. **`clinical_management/backend/config/urls.js` (MODIFIED):**
   - Added `STAFF_FRONTEND_URL` and `PATIENT_FRONTEND_URL` to `getTrustedOrigins()` so that password resets, email invitations, and notifications reference approved frontend domains.

4. **`clinical_management/backend/tests/test_cors_hardening.js` (NEW):**
   - 28 automated tests covering normalization, environment resolution, malicious lookalike rejection, Express HTTP requests, preflight OPTIONS, and Socket.IO handshake origin validation.

---

## 4. SECTION C: SECURITY TESTS

The automated test suite (`clinical_management/backend/tests/test_cors_hardening.js`) was executed locally with 0 failures:

```text
======================================================================
  QUROXA STAGE G.2: CORS & SOCKET.IO ORIGIN HARDENING TEST SUITE      
======================================================================

--- SUITE 1: Origin Normalization & Parsing ---
  [PASS] Normalizes HTTPS origin and removes trailing slash
  [PASS] Normalizes HTTP origin with port and whitespace
  [PASS] Converts hostnames to lowercase
  [PASS] Rejects 'null' origin string
  [PASS] Rejects '*' wildcard origin string
  [PASS] Rejects invalid / malformed URLs

--- SUITE 2: Environment Variable Allowlist Resolution ---
  [PASS] Parses multiple frontend environment variables correctly
  [PASS] Provides safe localhost defaults in development if env is empty

--- SUITE 3: Exact Match & Rejection of Malicious Origins ---
  [PASS] Accepts exact staff origin
  [PASS] Accepts exact patient origin
  [PASS] Rejects lookalike domain with prefix
  [PASS] Rejects lookalike domain with suffix / subdomain
  [PASS] Rejects insecure HTTP version of HTTPS production origin
  [PASS] Rejects null origin
  [PASS] Rejects unapproved localhost in production allowlist

--- SUITE 4: Express HTTP In-Memory CORS Tests ---
  [PASS] Approved Staff origin receives Access-Control-Allow-Origin & credentials
  [PASS] Approved Patient origin receives Access-Control-Allow-Origin & credentials
  [PASS] OPTIONS preflight for approved origin returns status 204 with complete CORS headers
  [PASS] Unapproved origin GET does NOT receive Access-Control-Allow-Origin
  [PASS] Unapproved origin OPTIONS preflight does NOT receive Access-Control-Allow-Origin
  [PASS] Origin 'null' does NOT receive Access-Control-Allow-Origin
  [PASS] Non-browser request without Origin header succeeds cleanly (curl / server-to-server)

--- SUITE 5: Socket.IO Handshake Origin Policy Tests ---
  [PASS] Socket.IO allowRequest accepts approved Staff origin
  [PASS] Socket.IO allowRequest accepts approved Patient origin
  [PASS] Socket.IO allowRequest rejects unapproved external origin
  [PASS] Socket.IO allowRequest rejects lookalike origin
  [PASS] Socket.IO allowRequest rejects 'null' origin
  [PASS] Socket.IO allowRequest permits requests without Origin (non-browser clients)

======================================================================
  RESULTS: 28 PASSED | 0 FAILED
======================================================================
```

---

## 5. SECTION D: RENDER CONFIGURATION

The environment variables on Render backend Web Service `srv-da9t6nss728c73eooctg` were updated and verified via the Render dashboard:

| Variable Name | New / Updated Value | Purpose |
|:---|:---|:---|
| `CORS_ORIGIN` | `https://curoxa-1.onrender.com,https://quroxa-patient-frontend.onrender.com` | Primary comma-separated origin allowlist |
| `STAFF_FRONTEND_URL` | `https://curoxa-1.onrender.com` | Explicit Staff application origin |
| `PATIENT_FRONTEND_URL` | `https://quroxa-patient-frontend.onrender.com` | Explicit Patient application origin |

### Environment Integrity Audit
- Total variables configured: **22** (previously 20).
- Zero private secrets or database connection strings (`JWT_SECRET`, `MONGO_URI`, `SMTP_*`, `R2_*`, etc.) were modified, exposed, or deleted.
- Updating environment variables automatically triggered a clean rebuild and deploy on commit `ad3bf17`.

---

## 6. SECTION E: PRODUCTION VERIFICATION

Live verification was executed directly against production environments with zero defects:

### 6.1 Backend Service Health
- **Endpoint**: `https://curoxa.onrender.com/`
- **HTTP Status**: `200 OK`
- **Body**: `"Curoxa API is running..."`
- **Result**: **PASS**

### 6.2 Patient Frontend (`https://quroxa-patient-frontend.onrender.com`)
- **Route**: `https://quroxa-patient-frontend.onrender.com/apollo_delhi/login`
- **API Request**: `GET https://curoxa.onrender.com/api/public/portal/tenant/current?tenantId=apollo_delhi`
- **Headers Verified**:
  - `access-control-allow-origin: https://quroxa-patient-frontend.onrender.com`
  - `access-control-allow-credentials: true`
  - `access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE`
  - `vary: Origin, Accept-Encoding`
- **Console Audit**: **ZERO CORS errors**. Graceful fallback for non-existent test slug rendered cleanly.
- **Result**: **PASS**

### 6.3 Staff Frontend (`https://curoxa-1.onrender.com`)
- **Route**: `https://curoxa-1.onrender.com/login`
- **Preflight Check**: `OPTIONS https://curoxa.onrender.com/api/auth/ping` -> `204 No Content`
  - `access-control-allow-origin: https://curoxa-1.onrender.com`
  - `access-control-allow-credentials: true`
- **API Check**: `GET https://curoxa.onrender.com/api/auth/ping` -> `200 OK`
  - `access-control-allow-origin: https://curoxa-1.onrender.com`
  - `access-control-allow-credentials: true`
- **Console Audit**: **ZERO CORS errors**. Login workstation fully operational.
- **Result**: **PASS**

### 6.4 Negative Origin Validation
- **Unapproved / Non-Whitelisted Requests**:
  - `access-control-allow-origin`: **ABSENT** (Omitted by server).
  - `access-control-allow-credentials`: **ABSENT**.
  - Cross-origin browser access from unapproved domains is completely blocked.
- **Result**: **PASS**

---

## 7. SECTION F: ROLLBACK STATUS

- **Rollback Required**: **NO**.
- **Previous Deploy State**: `dep-dbqukv0ae00c73fbdfbg` (Commit `d2f9315`) preserved in Render deployment history.
- **Current Deploy State**: `dep-dbsvj59lodes73a46pqg` (Commit `ad3bf17`) is **Live**, healthy, and verified across all operational parameters.

---

## 8. SECTION G: FINAL CLASSIFICATION

### Status: **PASS**

The QUROXA backend CORS and Socket.IO origin security hardening has been successfully implemented, tested, deployed, and verified in production.

- **Staff Frontend:** `https://curoxa-1.onrender.com` (OPERATIONAL)
- **Patient Frontend:** `https://quroxa-patient-frontend.onrender.com` (OPERATIONAL)
- **Backend API:** `https://curoxa.onrender.com` (HARDENED & OPERATIONAL)
- **Render Service ID:** `srv-da9t6nss728c73eooctg`
- **Live Deploy ID:** `dep-dbsvj59lodes73a46pqg`

**Awaiting operator instruction for Stage G.3 (or next authorized stage).**
