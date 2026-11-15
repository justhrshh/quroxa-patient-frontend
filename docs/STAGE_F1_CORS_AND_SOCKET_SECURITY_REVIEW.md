# QUROXA — STAGE F.1: BACKEND CORS & SOCKET.IO SECURITY REVIEW

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** `clinical_management/backend` Network Security, Origin Validation, and Real-Time Gateway  
**Stage:** Stage F.1 — Final Production Configuration Verification  
**Date:** 15 November 2026  
**Auditor / Verification Lead:** Lead Security Architect & System Verification Engineer  
**Status:** **AUDIT & PROPOSED REPLACEMENT SPECIFICATION (READ-ONLY)**  

---

## 1. CURRENT BACKEND CORS & SOCKET.IO IMPLEMENTATION AUDIT

### 1.1 Direct Inspection of `clinical_management/backend/server.js`
In lines 49-69 and 262-269 of `clinical_management/backend/server.js`:

```javascript
// Lines 49-69: Express CORS configuration
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-tenant-id',
    'x-bypass-consent-emergency',
    'Cache-Control',
    'Pragma',
    'Expires',
    'x-requested-with',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Disposition']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ...

// Lines 262-269: Socket.IO initialization
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: corsOptions.origin,
    methods: ["GET", "POST"]
  }
});
```

### 1.2 Status of `origin: true` in Current and Deployed Production
- **Is `origin: true` actually present in source code?**  
  **YES.** It is explicitly hardcoded in `server.js` on line 51 and line 266.
- **Is `origin: true` active in the deployed production backend?**  
  **YES.** Because `corsOptions.origin` is set to `true`, the `cors` npm package inspects the incoming `Origin` HTTP request header and dynamically echoes it back in the `Access-Control-Allow-Origin` response header.
- **Architectural & Security Assessment:**
  - While this configuration permits multi-origin communication during development and cross-port testing, dynamic origin reflection combined with `credentials: true` allows any web application running in a user's browser to send authenticated cross-origin requests to the backend API if the browser possesses valid session cookies.
  - Although QUROXA's patient portal primarily uses `Authorization: Bearer <JWT>` headers (which are not automatically attached cross-origin by browsers like cookies are), staff authentication utilizes refresh cookies, and medical document downloads can be invoked via standard link navigations.
  - **Conclusion:** An explicit, strict origin whitelist is strongly recommended for production hardening.

---

## 2. PRECISE PROPOSED CORS REPLACEMENT SPECIFICATION

> **CHANGE CONTROL NOTICE:** This replacement is provided for operator review and approval only. It is **NOT** applied during Stage F.1.

### 2.1 Proposed Implementation Architecture
The proposed configuration implements:
1. **Multi-Variable Ingestion:** Reads from `CORS_ORIGIN`, `STAFF_FRONTEND_URL`, and `PATIENT_FRONTEND_URL`.
2. **Safe Comma Parsing & Whitespace Trimming:** Safely splits comma-separated strings and removes trailing slashes.
3. **Exact Matching:** Uses strict exact matching (via JavaScript `Set.has()`) rather than substring or regex matching (which are vulnerable to domain confusion attacks like `attacker-quroxa.com`).
4. **Staff Preservation:** All existing staff frontend origins are preserved.
5. **Provisional Patient Origin:** The provisional hostname `https://quroxa-patient-frontend.onrender.com` (or the actual Render-assigned hostname once provisioned) will be added to the whitelist.
6. **Zero Wildcard with Credentials:** Never returns `*` when `credentials: true`.
7. **Consistent Express & Socket.IO Policies:** Reuses the exact same origin validation logic for both HTTP requests and WebSocket handshakes.

### 2.2 Exact Proposed Code for `clinical_management/backend/server.js`

```javascript
// ═══════════════════════════════════════════════════════════════════
// HARDENED MULTI-ORIGIN CORS & SOCKET.IO CONFIGURATION (PROPOSED)
// ═══════════════════════════════════════════════════════════════════

/**
 * Builds the canonical set of authorized browser origins from environment configuration.
 * Performs strict URL normalization and sanitization.
 */
function resolveAuthorizedOrigins() {
  const authorized = new Set();

  const addOrigin = (rawVal) => {
    if (!rawVal || typeof rawVal !== 'string') return;
    rawVal.split(',').forEach((item) => {
      const clean = item.trim().replace(/\/+$/, '');
      // Reject wildcards, booleans, and malformed strings
      if (clean && clean !== '*' && clean !== 'true' && clean !== 'null') {
        authorized.add(clean.toLowerCase());
      }
    });
  };

  // 1. Ingest production environment variables
  addOrigin(process.env.CORS_ORIGIN);
  addOrigin(process.env.STAFF_FRONTEND_URL);
  addOrigin(process.env.PATIENT_FRONTEND_URL);
  addOrigin(process.env.FRONTEND_URL);
  addOrigin(process.env.PUBLIC_APP_URL);

  // 2. Ingest local development origins ONLY when not in production
  if (process.env.NODE_ENV !== 'production') {
    authorized.add('http://localhost:3000'); // Staff local dev
    authorized.add('http://localhost:3002'); // Patient local dev
    authorized.add('http://localhost:4173'); // Patient production preview
    authorized.add('http://localhost:5173'); // Vite default
  }

  return authorized;
}

const authorizedOriginsSet = resolveAuthorizedOrigins();

/**
 * Origin validation delegate for Express CORS and Socket.IO
 */
const originValidator = (origin, callback) => {
  // Allow non-browser requests (mobile apps, server-to-server, curl, Postman)
  if (!origin) {
    return callback(null, true);
  }

  const cleanOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();

  if (authorizedOriginsSet.has(cleanOrigin)) {
    return callback(null, true);
  }

  console.warn(`[SECURITY / CORS] Blocked unauthorized origin: "${cleanOrigin}"`);
  return callback(new Error(`CORS policy violation: Origin "${origin}" is not authorized.`));
};

const corsOptions = {
  origin: originValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-tenant-id',
    'x-bypass-consent-emergency',
    'Cache-Control',
    'Pragma',
    'Expires',
    'x-requested-with',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
```

---

## 3. SOCKET.IO ORIGIN & CONNECTION SECURITY

### 3.1 Why CORS Alone Is Insufficient for WebSockets
1. **No Preflight for WebSockets:** Standard CORS preflight (`OPTIONS`) requests are not sent by browsers prior to establishing a WebSocket connection.
2. **Upgrade Request Origin Header:** Browsers attach the `Origin` header to the initial HTTP GET request during the WebSocket upgrade handshake. Non-browser clients (such as Python scripts, malicious bots, or command-line tools) can forge the `Origin` header arbitrarily.
3. **Primary Security Principle:**  
   **The browser `Origin` header is a network boundary, NOT an authentication credential.**  
   Connection safety cannot rely solely on the `Origin` header.

### 3.2 Dual-Layer Socket.IO Security Architecture

```
                                  Incoming Socket.IO Connection Request
                                                    │
                                                    ▼
                     ┌─────────────────────────────────────────────────────────────┐
                     │ LAYER 1: Network Origin Validation (allowRequest)           │
                     │ - Validates that browser Origin matches authorized whitelist│
                     │ - Rejects unauthorized external web origins immediately     │
                     └──────────────────────────────┬──────────────────────────────┘
                                                    │ [Allowed]
                                                    ▼
                     ┌─────────────────────────────────────────────────────────────┐
                     │ LAYER 2: Cryptographic JWT Handshake (socketAuthMiddleware) │
                     │ - Verifies JWT signature via getJwtSecret()                 │
                     │ - Verifies token expiration                                 │
                     │ - Derives verified tenantId & role directly from token      │
                     │ - Overwrites client claims (CLIENT CLAIMS ≠ AUTHORITY)      │
                     └──────────────────────────────┬──────────────────────────────┘
                                                    │ [Authenticated]
                                                    ▼
                     ┌─────────────────────────────────────────────────────────────┐
                     │ LAYER 3: Strict Room Isolation (configureSocketTenantIsolation)│
                     │ - Patient sockets join ONLY tenant:<id>:patient & user:<id> │
                     │ - NEVER joins staff operational room <tenantId>             │
                     └─────────────────────────────────────────────────────────────┘
```

### 3.3 Proposed Socket.IO Initialization with `allowRequest`

```javascript
// Proposed Socket.IO initialization in server.js
const io = require("socket.io")(http, {
  cors: {
    origin: originValidator,
    methods: ["GET", "POST"],
    credentials: true
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    // Allow non-browser clients (e.g. native mobile apps, server probes)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
    if (authorizedOriginsSet.has(cleanOrigin)) {
      return callback(null, true);
    }

    console.warn(`[SOCKET.IO / REJECT] Connection rejected for unauthorized origin: ${cleanOrigin}`);
    return callback(3, false); // Status 3: Bad request / Unauthorized origin
  }
});
```

---

## 4. IMPACT ANALYSIS & REGRESSION TEST PLAN

### 4.1 Affected Files
- Only one file would change when this proposal is approved:  
  `clinical_management/backend/server.js` (Lines 49–70 and Lines 262–270).

### 4.2 Required Environment Variables on Backend
- `CORS_ORIGIN`: e.g. `https://quroxa-staff.onrender.com,https://quroxa-patient-frontend.onrender.com`
- Or dedicated variables:
  - `STAFF_FRONTEND_URL = https://quroxa-staff.onrender.com`
  - `PATIENT_FRONTEND_URL = https://quroxa-patient-frontend.onrender.com`

### 4.3 Mandatory Regression Tests Before Applying
Before applying this configuration to the live production backend, the following test scenarios must be executed in staging:
1. **Staff Portal Functionality:** Verify staff login, patient queue, appointments, and billing operations on the staff frontend origin.
2. **Patient Portal Functionality:** Verify patient OTP login, dashboard, appointments, and prescriptions on the patient frontend origin.
3. **Disallowed Origin Rejection:** Send an HTTP request and a Socket.IO handshake with `Origin: https://malicious-site.example.com` and verify immediate rejection with HTTP 403 / CORS policy violation error.
4. **Header Integrity:** Verify preflight `OPTIONS` requests return expected headers (`Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
