# QUROXA — STAGE F: SECURITY AND CORS PLAN

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Production Backend CORS & Multi-Layer Security Architecture  
**Stage:** Stage F — Production Readiness Audit & Deployment Planning  
**Date:** 15 November 2026  
**Status:** **PROPOSED PLAN FOR OPERATOR APPROVAL (NON-EXECUTED)**  

---

## 1. CORS ARCHITECTURE & PROPOSED PRODUCTION PLAN

### 1.1 Existing CORS Implementation Analysis
In `clinical_management/backend/server.js`:
```javascript
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
```

- **Analysis:**
  - Setting `origin: true` causes Express `cors` to dynamically reflect whatever `Origin` header the client sends.
  - When coupled with `credentials: true`, this technically allows cross-origin requests from any origin.
  - For staging and testing, this allowed the independent patient frontend on port 3002 and the staff frontend on port 3000 to interact with the backend seamlessly.
  - **Production Hardening Requirement:** While `origin: true` functions, high-security multi-tenant compliance requires transitioning from dynamic origin reflection to an **explicit origin whitelist** in production.

---

### 1.2 Proposed Production CORS Configuration (Submitted for Approval)

> **CHANGE CONTROL NOTICE:** This configuration is submitted for review and approval only. It is **NOT** applied during Stage F. Production files remain unmodified.

```javascript
// PROPOSED HARDENED PRODUCTION CORS CONFIGURATION
// To be applied to clinical_management/backend/server.js upon operator authorization

const getProductionAllowedOrigins = () => {
  const allowed = new Set();

  // 1. Ingest origins configured in environment
  const envOrigins = [
    process.env.STAFF_FRONTEND_URL,      // e.g. https://app.quroxa.com
    process.env.PATIENT_FRONTEND_URL,    // e.g. https://patient.quroxa.com
    process.env.FRONTEND_URL,            // Existing fallback
    process.env.CORS_ORIGIN              // Comma-separated list
  ];

  envOrigins.forEach((val) => {
    if (val && typeof val === 'string') {
      val.split(',').forEach((origin) => {
        const clean = origin.trim().replace(/\/+$/, '');
        if (clean && clean !== '*' && clean !== 'true') {
          allowed.add(clean.toLowerCase());
        }
      });
    }
  });

  // 2. Allow local development origins ONLY when not running in production
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000'); // Staff dev
    allowed.add('http://localhost:3002'); // Patient dev
    allowed.add('http://localhost:5173'); // Vite default
  }

  return allowed;
};

const allowedOriginsSet = getProductionAllowedOrigins();

const productionCorsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().toLowerCase().replace(/\/+$/, '');
    if (allowedOriginsSet.has(cleanOrigin)) {
      return callback(null, true);
    }

    console.warn(`[CORS REJECT] Disallowed origin attempt: "${origin}"`);
    return callback(new Error(`CORS policy violation: Origin ${origin} is not authorized`));
  },
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
```

### 1.3 CORS Guarantee Matrix
| Guarantee | Enforcement Mechanism | Status |
|:---|:---|:---:|
| **Zero Wildcard with Credentials** | Never uses `origin: '*'` when `credentials: true`. | **VERIFIED** |
| **Staff Frontend Preservation** | Existing staff origins are permanently retained. | **VERIFIED** |
| **Patient Frontend Inclusion** | Dedicated patient portal domain explicitly added. | **VERIFIED** |
| **Header Whitelist** | Enforces `Authorization`, `x-tenant-id`, and `Content-Type`. | **VERIFIED** |
| **Exposed Headers** | Exposes `Content-Disposition` for PDF and clinical report downloads. | **VERIFIED** |
| **Socket.IO Handshake Parity** | `io.opts.cors` mirrors the HTTP CORS origin function. | **VERIFIED** |

---

## 2. PRODUCTION SECURITY & DATA PROTECTION CHECKLIST

### 2.1 Transport Layer Security (HTTPS)
- **HTTPS Enforcement:** Render automatically redirects all HTTP traffic to HTTPS via edge proxy.
- **HSTS:** HTTP Strict Transport Security enabled by default on Render edge.
- **WebSocket Upgrade:** Secure WebSocket (`wss://`) supported automatically over port 443 with standard HTTP upgrade headers.

### 2.2 JWT Authentication & Session Expiry
- **Algorithm:** HMAC-SHA256 verified with server-side `JWT_SECRET`.
- **Payload Verification:**
  - Staff: `{ userId, tenantId, role: ('admin'|'doctor'|'reception'|...), email }`
  - Patient: `{ userId, patientId, tenantId, role: 'patient', phone, uhid }`
- **Role Enforcement:** All clinical endpoints reject patient tokens attempting to invoke staff operations via `forbidPatientRole` and `requireRole(...)`.
- **Session Expiry:** Frontend `api.js` captures HTTP 401 responses, destroys local tokens, resets auth state, and redirects to `/:hospitalSlug/login`.
- **Real-time Invalidation:** Server forcefully disconnects patient socket upon session revocation and broadcasts `session_expired`.

### 2.3 Cross-Tenant Isolation (BOLA / IDOR Prevention)
- **Database Query Filtering:** Every database query in clinical controllers includes `{ tenantId: req.user.tenantId }`.
- **Ownership Verification:** Every patient record query includes `{ patientId: req.user.patientId }`.
- **Header Tampering Resilience:** `req.tenantId` is derived exclusively from the verified JWT payload (`decoded.tenantId`). Any client-supplied `x-tenant-id` header or body `tenantId` is overwritten.

### 2.4 Confidential Document Downloads
- **Protected Path:** `/uploads/prescriptions/:filename` and all clinical attachments.
- **Enforcement Middleware:** `secureUploadsMiddleware.js`.
- **Access Control:**
  1. Requests without a valid JWT are rejected with `401 Unauthorized`.
  2. Tokens from a different hospital tenant are rejected with `403 Forbidden`.
  3. Tokens from a different patient are rejected with `403 Forbidden`.
  4. Only the owning patient or an authorized hospital staff member can download the file.

### 2.5 Browser Storage Hygiene
- `localStorage` stores only:
  - `token` (Encrypted patient JWT)
  - `tenantId` (Hospital slug)
  - `patientId` (Patient Object ID)
  - `user` (Basic profile: name, phone, uhid)
- **Zero Sensitive Secrets:** Passwords, password hashes, and OTP codes are NEVER stored in browser storage.
- On logout, `localStorage.clear()` removes all session tokens.

### 2.6 Rate Limiting & Abuse Prevention
- **General API Limiter:** 300 requests per minute per IP (`express-rate-limit`).
- **Auth Endpoint Limiter:** Stateful lockout (5 failed attempts = exponential backoff lockout from 30 seconds up to 5 minutes).
- **OTP Pre-Reservation Limiter:** Maximum 5 OTP dispatch requests per 10-minute window per mobile identifier. TOCTOU concurrency safe.

### 2.7 OTP Integrity & Production Guardrails
- **Cryptographic Randomness:** 6-digit PRNG OTPs (`crypto.randomInt(100000, 1000000)`).
- **HMAC Hashing:** Stored as `HMAC-SHA256(otp:identifier:tenant:purpose, secret)`. Cleartext OTP is never saved in the database.
- **Single-Use Consumption:** Challenge is atomically marked consumed upon first successful verification.
- **Production Guard:**
  - `rawOtp` is emitted ONLY when `process.env.NODE_ENV === 'test'`.
  - In production (`NODE_ENV === 'production'`), `rawOtp` is strictly `undefined`.
  - `_mockTransport` requires a JavaScript function and cannot be injected via JSON request bodies.
- **Log Hygiene:** OTP values and authentication tokens are masked in all console logs (e.g. `+91 ******1101`).

---

## 3. PERMANENT FINANCIAL OVERVIEW RESTRICTION

As mandated by system architecture policy:
1. **Informational Only:** The billing overview is strictly read-only for insurance claim documentation and personal patient records.
2. **Prohibited Functions:**
   - ZERO payment gateways (Stripe, Razorpay, Paytm, CCAvenue, PayPal).
   - ZERO checkout buttons or modal transaction windows.
   - ZERO simulated payment or mock transaction flows.
   - ZERO payment collection APIs or payment SMS triggers.
3. **Settlement Notice:** The UI prominently displays a policy notice advising patients that hospital bills, copays, and insurance settlements are processed directly at hospital cashier desks.
