# QUROXA — STAGE F: ENVIRONMENT VARIABLE CHECKLIST

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Independent Patient Frontend, Staff Frontend, and Shared Express Backend  
**Stage:** Stage F — Production Readiness Audit & Deployment Planning  
**Date:** 15 November 2026  
**Status:** **TECHNICAL CHECKLIST ONLY (NO PRODUCTION SECRETS EXPOSED)**  

---

## 1. ARCHITECTURAL CLASSIFICATION OVERVIEW

Environment variables are partitioned into four distinct architectural tiers to prevent credential leakage, accidental overwrites, or broken dependencies:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QUROXA ENVIRONMENT TIERS                        │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 1: Public Patient Frontend Variables (quroxa-patient-frontend)   │
│          - Embedded into client bundle via Vite at build time.         │
│          - Completely public in browser memory. ZERO secrets.          │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 2: Public Staff Frontend Variables (clinical_management/frontend)│
│          - Existing, production-tested. MUST REMAIN UNCHANGED.         │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 3: Private Backend Secrets & Runtime Config (Node.js/Express)    │
│          - Private server environment only. Never sent to browser.     │
│          - Database, JWT signing, SMS gateway, R2 credentials.         │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 4: Proposed Configuration Updates Requiring Approval             │
│          - Additions to backend CORS_ORIGIN for the new domain.        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. TIER 1: PUBLIC PATIENT FRONTEND VARIABLES (`quroxa-patient-frontend`)

These variables are defined in Render Static Site settings for `quroxa-patient-frontend`. They are read by Vite via `import.meta.env.*`.

| Variable Key | Required | Type | Current Dev Value | Proposed Production Value | Notes & Verification Contract |
|:---|:---:|:---:|:---|:---|:---|
| `VITE_API_URL` | **MANDATORY** | Public URL | `http://localhost:5000/api` | `https://[BACKEND_DOMAIN]/api`<br>*(e.g. `https://quroxa-backend.onrender.com/api`)* | Base URL for REST calls. Must point to the shared backend Express API. Suffix `/api` is recommended. |
| `VITE_SOCKET_URL` | **MANDATORY** | Public URL | `http://localhost:5000` | `https://[BACKEND_DOMAIN]`<br>*(e.g. `https://quroxa-backend.onrender.com`)* | Base URL for Socket.IO gateway. Must point to backend root WITHOUT `/api`. |

> **AUDIT CHECK:** Verified that no other `VITE_` variables are required by `quroxa-patient-frontend/src`. Zero backend secrets, database connection strings, or cryptographic keys are referenced in the frontend application.

---

## 3. TIER 2: PUBLIC STAFF FRONTEND VARIABLES (`clinical_management/frontend`)

These variables belong to the existing Staff Frontend. **DO NOT MODIFY.**

| Variable Key | Status | Purpose | Safety Check |
|:---|:---:|:---|:---|
| `VITE_API_URL` | **EXISTING (UNCHANGED)** | Points to shared backend API for staff operations. | Must remain untouched. |
| `VITE_GOOGLE_CLIENT_ID` | **EXISTING (UNCHANGED)** | Public Google OAuth Client ID for staff Google Login. | Must remain untouched. |

---

## 4. TIER 3: PRIVATE BACKEND SECRETS (`clinical_management/backend`)

These variables exist on the Render Web Service powering the Node.js/Express backend. **THEY MUST REMAIN STRICTLY ON THE BACKEND SERVER.**

| Variable Key | Category | Sensitivity | Existing Production Requirement | Operator Verification Checklist |
|:---|:---|:---:|:---|:---|
| `NODE_ENV` | Runtime Environment | High | Must be `production` in live deployment. | Disables test backdoors and enforces strict JWT validation. |
| `PORT` | Process Config | Low | Provided dynamically by Render (defaults to 5000 locally). | Handled automatically by Render runtime. |
| `JWT_SECRET` | Cryptographic Signing | **CRITICAL** | High-entropy random hex string (>= 16 chars). | Used for signing staff & patient JWTs and salting HMAC OTPs. Must NEVER be changed once live to avoid invalidating active sessions. |
| `MONGO_URI` | Database Connection | **CRITICAL** | MongoDB Atlas connection string with authenticated least-privilege user. | Shared by both staff and patient workflows. Multi-tenant document database. |
| `CORS_ORIGIN` | Network Policy | High | Comma-separated list of allowed origins. | **Requires update: See Tier 4 below.** |
| `FRONTEND_URL` | Link Generation | Medium | Canonical staff frontend URL. | Used for staff invitations and password reset links. |
| `PUBLIC_APP_URL` | Link Generation | Medium | Optional canonical override for application links. | Configured per operator domain strategy. |
| `GOOGLE_CLIENT_ID` | Auth Provider | Low (Public) | Google OAuth client ID. | Preserved for staff authentication. |
| `SEED_DEFAULT_ADMIN` | Bootstrapping | Medium | Recommended `false` in production. | Prevents overwriting administrative accounts on restart. |
| `SMTP_HOST` | Email Transport | High | Production mail server host (e.g. Gmail / Brevo). | Used for staff password reset emails. |
| `SMTP_PORT` | Email Transport | Low | `465` (SSL) or `587` (TLS). | Standard email port. |
| `SMTP_USER` | Email Transport | High | Email username/address. | Server email sender identity. |
| `SMTP_PASS` | Email Transport | **CRITICAL** | Application password or SMTP credentials. | Authenticates email dispatch. |
| `SMTP_SECURE` | Email Transport | Low | `true` for port 465. | TLS/SSL enforcement. |
| `BREVO_API_KEY` | Email API | **CRITICAL** | Optional HTTP email provider API key. | Bypasses port 25/587 blocks on cloud providers. |
| `RESEND_API_KEY` | Email API | **CRITICAL** | Optional secondary email API key. | Automatic failover email dispatch. |
| `STORAGE_DRIVER` | File Storage | Medium | `r2` in production; `local` in offline dev. | Controls storage engine for clinical uploads. |
| `R2_ACCOUNT_ID` | Cloudflare Storage | High | Cloudflare Account ID. | Required if `STORAGE_DRIVER=r2`. |
| `R2_ACCESS_KEY_ID` | Cloudflare Storage | **CRITICAL** | Cloudflare R2 Access Key ID. | S3-compatible document vault access. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare Storage | **CRITICAL** | Cloudflare R2 Secret Access Key. | S3-compatible document vault secret. |
| `R2_BUCKET_PUBLIC` | Cloudflare Storage | Medium | Name of public assets bucket. | Public assets storage. |
| `R2_BUCKET_PRIVATE` | Cloudflare Storage | High | Name of encrypted clinical records bucket. | Patient documents and prescription attachments. |
| `R2_PUBLIC_DOMAIN` | Cloudflare Storage | Medium | Public CDN domain for R2 bucket. | Cloudflare asset distribution. |
| `PING4SMS_API_KEY` | SMS Gateway | **CRITICAL** | Transactional DLT Route 2 API key. | Dispatches live 6-digit patient portal OTPs. |
| `PING4SMS_TEMPLATE_ID` | SMS Gateway | Medium | Registered DLT Template ID (`1507165967974501361`). | Required for Telecom Regulatory Authority compliance. |
| `PING4SMS_SENDER_ID` | SMS Gateway | Medium | Approved DLT Header (`PNGOTP`). | 6-character registered sender header. |
| `PING4SMS_ROUTE` | SMS Gateway | Low | `2` (Transactional Route). | High-priority OTP channel. |
| `PING4SMS_API_URL` | SMS Gateway | Low | `https://site.ping4sms.com/api/smsapi` | Confirmed PING4SMS endpoint. |

---

## 4. TIER 4: PROPOSED CONFIGURATION UPDATES REQUIRING APPROVAL

To permit the independent patient frontend to communicate with the shared backend, the backend's allowed origins must be updated in the Render Dashboard before live cutover.

### Proposed Update to `CORS_ORIGIN` (On Backend Service)
- **Current Production Setting:** Contains only the staff frontend origin.
  - *Example:* `https://app.quroxa.com` (or `https://quroxa-staff.onrender.com`)
- **Proposed Production Setting (Requires Approval):**
  - Comma-separated list including BOTH frontends:
  ```env
  CORS_ORIGIN=https://app.quroxa.com,https://patient.quroxa.com
  ```
  *(Or if using onrender.com subdomains):*
  ```env
  CORS_ORIGIN=https://quroxa-staff.onrender.com,https://quroxa-patient-frontend.onrender.com
  ```

---

## 5. ENVIRONMENT VARIABLE INTEGRITY AUDIT

| Verification Check | Result | Evidence |
|:---|:---:|:---|
| No backend secrets committed in `quroxa-patient-frontend` repo | **PASS** | Inspected `.env.example`, `package.json`, and all `src/` modules. |
| Frontend reads strictly `VITE_API_URL` and `VITE_SOCKET_URL` | **PASS** | Grep of `import.meta.env` revealed zero other variables. |
| Backend fails closed if `JWT_SECRET` is missing or < 16 chars | **PASS** | Verified `clinical_management/backend/config/env.js`. |
| Existing staff frontend variables untouched | **PASS** | `clinical_management/frontend/.env` remains 100% identical. |
| PING4SMS DLT template ID matches registered Indian telecom format | **PASS** | Verified DLT message schema in `ping4smsService.js`. |
