# QUROXA — STAGE F.1: FINAL ENVIRONMENT VARIABLE CHECKLIST

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Independent Patient Frontend (`quroxa-patient-frontend`) & Shared Express Backend  
**Stage:** Stage F.1 — Final Production Configuration Verification  
**Date:** 15 November 2026  
**Auditor / Verification Lead:** Lead DevOps & Cloud Infrastructure Engineer  
**Status:** **AUDITED CLASSIFICATION CHECKLIST (READ-ONLY)**  

---

## 1. PATIENT FRONTEND VARIABLES (`quroxa-patient-frontend`)

These variables are defined in the Render Dashboard under **Static Site Settings -> Environment Variables**.  
Because they are compiled by Vite into the client JavaScript bundle, they are **completely public in browser memory**. **NEVER PLACE SECRETS HERE.**

| Variable Name | Classification | Format & Requirement Details | Verification Evidence in Source Code |
|:---|:---:|:---|:---|
| `VITE_API_URL` | **Required** | Fully qualified URL pointing to backend API.<br>• *Expected format:* `https://<backend-host>/api`<br>• *Example:* `https://quroxa-backend.onrender.com/api`<br>• *Note on `/api`:* The client in `api.js` automatically strips trailing slashes and safely appends `/api` if omitted. Providing the full path with `/api` is the recommended standard convention. | `quroxa-patient-frontend/src/services/api.js` (Lines 13–31). Falls back to relative `'/api'` if unset. |
| `VITE_SOCKET_URL` | **Optional** | Fully qualified URL pointing to the root server host (WITHOUT `/api`).<br>• *Expected format:* `https://<backend-host>`<br>• *Example:* `https://quroxa-backend.onrender.com`<br>• *Note:* If omitted, `socketService.js` automatically derives the host by stripping `/api` from `VITE_API_URL`. | `quroxa-patient-frontend/src/services/socketService.js` (Lines 19–38). |

---

## 2. BACKEND SERVER VARIABLES (`clinical_management/backend`)

These variables are configured in the Render Dashboard under **Web Service Settings -> Environment Variables**.  
They are accessible only to the Node.js process and are **never exposed to the browser bundle**.

| Variable Name | Classification | Category | Functional Purpose & Usage Verification | Operator Action / Status |
|:---|:---:|:---|:---|:---|
| `NODE_ENV` | **Required** | Runtime | Set to `production`. Disables development backdoors, prevents raw OTP leakage, disables simulated logins, and enforces strict JWT signing. | Mandatory in production. |
| `PORT` | **Required** | Process | Server listen port. Automatically assigned by Render runtime (default: 10000 or 5000). | Handled by Render. |
| `JWT_SECRET` | **Required** | Cryptographic | High-entropy signing secret (>= 16 characters, 64-hex recommended). Used for staff/patient JWT verification and HMAC OTP hashing. Process crashes on boot if missing or < 16 chars. | Must be set and preserved. |
| `MONGO_URI` | **Required** | Database | MongoDB Atlas connection string. Authenticates to multi-tenant cluster with least-privilege credentials. | Existing production URI. |
| `CORS_ORIGIN` | **Required** | Network | Comma-separated list of authorized browser origins. Must be updated to include the assigned patient frontend URL: `https://quroxa-staff.onrender.com,https://quroxa-patient-frontend.onrender.com` | **Requires operator update upon service creation.** |
| `STAFF_FRONTEND_URL` | **Optional** | Network | Explicit staff portal origin. Parsed by `resolveAuthorizedOrigins()` and `urls.js`. | Optional alternative to `CORS_ORIGIN`. |
| `PATIENT_FRONTEND_URL` | **Optional** | Network | Explicit patient portal origin. Parsed by `resolveAuthorizedOrigins()` and `urls.js`. | Optional alternative to `CORS_ORIGIN`. |
| `FRONTEND_URL` | **Conditional** | Links | Canonical URL used for staff invitation and password reset emails. | Set to staff portal URL. |
| `PUBLIC_APP_URL` | **Conditional** | Links | Canonical override for public portal links. | Set to public domain if used. |
| `OTP_HASH_SECRET` | **Optional** | Cryptographic | Dedicated secret for HMAC-SHA256 OTP hashing (separate from `JWT_SECRET`). If omitted, backend falls back safely to `JWT_SECRET`. | Recommended for future hardening. |
| `PING4SMS_API_KEY` | **Conditional** | SMS | Transactional DLT Route 2 API key. Required for live patient OTP SMS delivery. | Active production key needed. |
| `PING4SMS_TEMPLATE_ID` | **Conditional** | SMS | TRAI DLT approved template ID (`1507165967974501361`). | Mandatory for SMS in India. |
| `PING4SMS_SENDER_ID` | **Optional** | SMS | 6-character registered DLT header (`PNGOTP`). Defaults to `PNGOTP` in code if omitted. | Pre-configured in code. |
| `PING4SMS_ROUTE` | **Optional** | SMS | Transactional route number (`2`). Defaults to `2` in code if omitted. | Pre-configured in code. |
| `PING4SMS_API_URL` | **Optional** | SMS | PING4SMS API endpoint. Defaults to `https://site.ping4sms.com/api/smsapi`. | Pre-configured in code. |
| `STORAGE_DRIVER` | **Conditional** | File Storage | Set to `r2` in production for Cloudflare R2 object storage, or `local` if local disk persistence is attached. | Requires operator confirmation. |
| `R2_ACCOUNT_ID` | **Conditional** | File Storage | Cloudflare Account ID. Required only if `STORAGE_DRIVER=r2`. | Needed for R2 storage. |
| `R2_ACCESS_KEY_ID` | **Conditional** | File Storage | Cloudflare R2 Access Key. Required only if `STORAGE_DRIVER=r2`. | Needed for R2 storage. |
| `R2_SECRET_ACCESS_KEY` | **Conditional** | File Storage | Cloudflare R2 Secret Key. Required only if `STORAGE_DRIVER=r2`. | Needed for R2 storage. |
| `R2_BUCKET_PRIVATE` | **Conditional** | File Storage | Private bucket name for encrypted medical documents. Required only if `STORAGE_DRIVER=r2`. | Needed for R2 storage. |
| `R2_PUBLIC_DOMAIN` | **Conditional** | File Storage | Public CDN domain for hospital logos/assets. Required only if `STORAGE_DRIVER=r2`. | Needed for R2 storage. |
| `SMTP_HOST` | **Conditional** | Email | Mail server host (e.g. `smtp.gmail.com`). Required for staff password reset emails. | Needed for staff SMTP. |
| `SMTP_PORT` | **Conditional** | Email | Mail server port (`465` or `587`). | Needed for staff SMTP. |
| `SMTP_USER` | **Conditional** | Email | Mail server username / address. | Needed for staff SMTP. |
| `SMTP_PASS` | **Conditional** | Email | Mail server application password. | Needed for staff SMTP. |
| `BREVO_API_KEY` | **Optional** | Email API | Brevo HTTP email API key (bypasses Render outbound SMTP port restrictions). | Optional failover. |
| `RESEND_API_KEY` | **Optional** | Email API | Resend HTTP email API key (secondary email failover). | Optional failover. |
| `GOOGLE_CLIENT_ID` | **Conditional** | Staff Auth | Google OAuth Client ID for staff Google Login. | Preserved for staff portal. |
| `SEED_DEFAULT_ADMIN` | **Optional** | Bootstrapping | Set to `false` in production to prevent admin account overwrite. | Recommended `false`. |

---

## 3. UNUSED VARIABLES IDENTIFIED DURING AUDIT

The following environment variables were detected during source-code scanning but are **NOT used** by the patient portal or current core operational routes:
- `REMOVE_BG_API_KEY` / `REMBG_SERVICE_URL`: Used for staff ID badge photo background removal.
- `SANDBOX_CLIENT_ID` / `SANDBOX_CLIENT_SECRET`: Legacy payment sandbox variables (patient billing is strictly read-only; payment processing is prohibited).
- `AUTH_REFRESH_COOKIE_NAME`: Optional staff cookie name override (defaults to `quroxa_refresh_token`).

---

## 4. CHECKLIST VERIFICATION PROTOCOL

- [x] No backend secrets exist in `quroxa-patient-frontend/.env.example`.
- [x] All Vite variables are prefixed with `VITE_`.
- [x] No plaintext passwords, database connection strings, or JWT keys are committed to repository files.
- [x] Fallback logic in `api.js` and `socketService.js` handles omitted `/api` suffixes and undefined socket URLs cleanly.
