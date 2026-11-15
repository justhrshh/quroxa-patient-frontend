# QUROXA — STAGE F: PRODUCTION READINESS AUDIT

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Independent Patient Frontend (`quroxa-patient-frontend`), Shared Express Backend, and Infrastructure Integration  
**Stage:** Stage F — Production Readiness Audit & Deployment Planning  
**Date:** 15 November 2026  
**Auditor / Verification Lead:** Lead Security Architect & Systems Engineer  
**Status:** **CONDITIONALLY READY FOR DEPLOYMENT APPROVAL**  

---

## 1. OBJECTIVE & SCOPE

The objective of this audit is to conduct a thorough, evidence-based inspection of the existing production infrastructure, build artifacts, network policies, environment contracts, and security boundaries across the QUROXA platform prior to any production deployment.

### Architecture Scope
| Component | Implementation Repository | Hosting / Infrastructure Target | Role & Architectural Boundary |
|:---|:---|:---|:---|
| **Patient Frontend** | `quroxa-patient-frontend` | Render Static Site | Extracted, independent patient portal. Zero staff dependencies. |
| **Staff Frontend** | `clinical_management/frontend` | Render Static Site | Existing clinical management UI. Untouched and fully preserved. |
| **Shared Backend** | `clinical_management/backend` | Render Web Service (Node/Express) | Shared API, Socket.IO gateway, authentication, and clinical logic. |
| **Database** | Multi-tenant cluster | MongoDB Atlas | Single shared document database. Strict tenant isolation. |
| **File Storage** | Cloudflare R2 / Local FS | S3-compatible R2 Vault | Physical storage for medical attachments and prescriptions. |

> **IMPORTANT:** Deployment authorization is NOT granted. This audit contains planning, technical verification, and pre-deployment analysis only. No production systems or databases were modified.

---

## 2. PRODUCTION INFRASTRUCTURE AUDIT FINDINGS

### 2.1 Backend API Architecture & Route Topography
Inspection of `clinical_management/backend/server.js` confirms:
- **Port & Process:** Defaults to `process.env.PORT || 5000`. Behind Render reverse proxy, `app.set("trust proxy", 1)` is enabled to ensure accurate client IP identification for rate limiters.
- **Route Prefixes:** All backend routes are uniformly mounted under `/api/`:
  - `/api/auth`: Staff authentication, patient OTP dispatch (`/patient-portal/send-otp`), OTP verification, and multi-profile selection.
  - `/api/patients`: Patient demographic management (scoped to `req.user.patientId`).
  - `/api/appointments`: Consultation booking, token retrieval, and OPD queue tracking.
  - `/api/prescriptions`: Digital prescriptions dynamically enriched with hospital letterhead.
  - `/api/labs` & `/api/lab-tests`: Diagnostic orders and verified pathology reports.
  - `/api/emr`: Electronic medical records, consultation encounters, and vital signs.
  - `/api/billing`: Read-only financial invoices and receipts history.
  - `/api/dpo`: DPDP Act 2023 statutory consent and DPO rights withdrawal.
  - `/api/public/portal`: Public hospital resolution endpoint (`/api/public/portal/:slug`).
- **Secure File Serving:**
  - Route `/uploads` is intercepted by `secureUploadsMiddleware.js`.
  - Static files under `/uploads/prescriptions/:filename` require a valid JWT header/cookie and strictly enforce tenant and patient ownership. Unauthenticated access returns `401 Unauthorized`; cross-tenant or cross-patient access returns `403 Forbidden`.

### 2.2 CORS Configuration Audit
- **Current Backend Code (`server.js`):**
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
- **Audit Assessment:**
  - `origin: true` dynamically echoes the incoming `Origin` header. When `credentials: true` is present, browsers accept cookies and authorization headers from the calling origin.
  - While functional during development and staging, production best practice requires replacing `origin: true` with an explicit origin whitelist comprising the production staff frontend domain and the new production patient frontend domain.
  - An exact, non-breaking CORS proposal has been prepared in `STAGE_F_SECURITY_AND_CORS_PLAN.md` for operator approval.

### 2.3 Socket.IO Real-Time Gateway Audit
- **Handshake Authentication:** Guarded by `socketAuthMiddleware` in `clinical_management/backend/middleware/socketAuthMiddleware.js`. Validates the patient JWT during WebSocket handshake (`auth: { token }`).
- **Room Scoping:** Sockets with `role: 'patient'` join only `tenant:<tenantId>:patient` and `user:<userId>`. They NEVER join the staff operational room `<tenantId>`.
- **Event Scoping:**
  - Emitted to patients: strictly cache-invalidation `data_changed` (containing `{ scope: 'invalidation' }` and zero clinical details) and `session_expired`.
  - Staff operational broadcasts (`session_revoked`, `reception_queue_updated`, `ticket_created`, `hospital_subscription_updated`) are emitted to `<tenantId>` and are unreachable by patient sockets.
- **Client Service:** Verified `quroxa-patient-frontend/src/services/socketService.js` connects via `['websocket', 'polling']`, supports automatic reconnection with exponential backoff (1s to 5s, max 10 attempts), and cleanly destroys connections on user logout or session expiration.

### 2.4 Patient Frontend SPA Routing & Render Static Site Audit
- **Project Location:** `quroxa-patient-frontend/`
- **Build Tool:** Vite v5.4 with `@tailwindcss/vite` v4.0.
- **Build Verification:** Tested local production build:
  - Command: `npm run build`
  - Output directory: `dist/`
  - Result: Built in 3.21s with 0 errors.
  - Asset chunks: `dist/assets/index-BOpWDgXA.js` (497 kB / 142 kB gzip), `dist/assets/index-DVSpLnaQ.css` (43.7 kB / 8.1 kB gzip).
- **SPA Rewrites (`_redirects`):**
  - Source file: `quroxa-patient-frontend/public/_redirects`
  - Content: `/*    /index.html   200`
  - Verified that Vite copies `_redirects` directly into `dist/_redirects`.
  - On Render Static Sites, this directive instructs the edge CDN to serve `index.html` with HTTP 200 for all client-side routes (e.g. `/:hospitalSlug/dashboard`, `/:hospitalSlug/prescriptions`), preventing 404 errors on deep linking and browser refresh.
- **Git & Lockfile Audit (Stage F.1 Update):**
  - Git repository: `clinical_management/` is linked to `https://github.com/justhrshh/CUROXA.git` (branch `main`). `quroxa-patient-frontend/` is currently in the parent directory and will need to be pushed to its target deployment repository.
  - `package-lock.json` requires synchronization for `socket.io-client` (added in Stage D/E) so that Render's clean build command `npm ci && npm run build` executes without lockfile drift errors.

### 2.5 Staff Frontend Preservation Audit
- **Project Location:** `clinical_management/frontend/`
- **Build Verification:** Tested local production build:
  - Command: `npm run build`
  - Output directory: `dist/`
  - Result: Built in 10.24s with 0 errors.
- **File Integrity:** Verified that `clinical_management/frontend/src/pages/PatientDashboard.jsx` (approx. 8,794 lines) was NOT deleted, modified, or altered. It remains 100% operational in the staff application.

---

## 3. SECURITY & AUTHENTICATION AUDIT

### 3.1 OTP Challenge & Verification Rigor
- **Cryptographic Randomness:** OTPs are generated using `crypto.randomInt(100000, 1000000)` in `clinical_management/backend/services/otp/otpService.js`.
- **Server HMAC Hashing:** Codes are stored as HMAC-SHA256 hashes bound to `code:targetIdentifier:tenantId:purpose` salted by `getJwtSecret()`.
- **Brute-Force Lockout:** Atomically locks the account after 5 consecutive failed verification attempts for 15 minutes.
- **Rate Limiting:** Atomic pre-dispatch reservation limits requests to 5 per 10-minute window per identifier, preventing TOCTOU concurrency bypasses.
- **Test Backdoor Audit:** Verified that `NODE_ENV === 'test'` check protects `rawOtp` leakage (`rawOtp: process.env.NODE_ENV === 'test' ? rawOtp : undefined`). In production (`NODE_ENV === 'production'`), `rawOtp` is strictly `undefined`.
- **Zero Fixed Codes:** Exhaustive audit confirmed no hardcoded OTP bypasses (such as `'123456'`) exist in operational controllers or routes.

### 3.2 Confidential Document Protection
- Prescriptions and clinical attachments served from `/uploads/prescriptions/` are protected by `secureUploadsMiddleware.js`.
- Direct unauthenticated access is rejected with `401 Unauthorized`.
- Cross-tenant or mismatched patient access is rejected with `403 Forbidden`.

### 3.3 Financial Read-Only Compliance
- Verified that `quroxa-patient-frontend/src/pages/billing/BillingPage.jsx` and `FinancialOverviewCard.jsx` render read-only statement summaries.
- Zero payment gateway SDKs (Razorpay, Stripe, Paytm, etc.) are installed.
- Zero simulated payment, checkout, or transaction processing buttons exist.

---

## 4. AUDIT FINDINGS: BLOCKED VS UNRESOLVED ITEMS

### 4.1 Production Blockers
- **Status: NONE.**  
  There are zero architectural, cryptographic, or operational blockers preventing deployment preparation.

### 4.2 Items Requiring Confirmation / Approval Before Production Live Deployment
1. **Initial Hostname Resolution (Decided in Stage F.1):**
   - The initial deployment will use the provisional Render-assigned hostname (e.g. `https://quroxa-patient-frontend.onrender.com`). Custom domain `patient.quroxa.com` is deferred until production smoke testing passes.
2. **Backend CORS Whitelist Update:**
   - Operator approval required to update `CORS_ORIGIN` on the backend Web Service once the exact Render-assigned hostname is confirmed.
3. **PING4SMS Production Gateway Balance:**
   - Production OTP delivery relies on active PING4SMS Route 2 DLT gateway credentials and sufficient account SMS credits.
4. **Git Repository Push Target & Lockfile Sync:**
   - Push `quroxa-patient-frontend` to target deployment repository and sync `package-lock.json` with `socket.io-client` for `npm ci`.

---

## 5. AUDIT CONCLUSION & READINESS VERDICT

| Category | Assessment | Status |
|:---|:---|:---:|
| **Frontend Architecture** | Modular, independent, zero staff dependencies | **PASS** |
| **Build Stability** | 0 errors, reproducible Vite builds | **PASS** |
| **SPA Deep Routing** | `dist/_redirects` verified | **PASS** |
| **API & Socket Isolation** | Strict role and room scoping | **PASS** |
| **Clinical Ownership (BOLA)** | Object-level authorization enforced | **PASS** |
| **Read-Only Financials** | Strictly informational; 0 payment code | **PASS** |
| **Staff Application Safety** | Zero modifications, 100% intact | **PASS** |
| **Infrastructure Readiness** | Render Static Site target confirmed | **CONDITIONALLY READY** |

**VERDICT: CONDITIONALLY READY FOR DEPLOYMENT APPROVAL**  
*(Pending operator confirmation of production domain, environment variables, and explicit CORS whitelist).*
