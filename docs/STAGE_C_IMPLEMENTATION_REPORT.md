# Stage C — Hospital Resolution & Patient Authentication Implementation Report

**Project:** QUROXA — Independent Patient Frontend Extraction  
**Stage:** Stage C (Hospital Resolution & Patient Authentication)  
**Status:** **PASS** (20/20 Test Scenarios Passed)  
**Date:** 2026-11-14  

---

## 1. Executive Summary

Stage C implements the end-to-end hospital resolution and patient authentication architecture in the new independent `quroxa-patient-frontend` application (`c:\Users\lenovo\OneDrive\Desktop\CUROXA\quroxa-patient-frontend\`).

This stage cleanly decouples patient identity and authentication from the staff application, communicating directly with the existing shared Node.js/Express backend (`clinical_management/backend`) and MongoDB Atlas cluster.

### Core Capabilities Delivered
1. **Dynamic Hospital Resolution:**
   - Multi-tenant hospital routing via URL slug (`/:hospitalSlug/login`, `/:hospitalSlug/register`, `/:hospitalSlug/dashboard`).
   - Resolution against `GET /api/public/portal/tenant/current?tenantId=:slug`.
   - Dynamic hospital branding (logo, name, contact info) with graceful monograms and `sessionStorage` caching.
   - Fail-closed handling for non-existent (404) and suspended hospital accounts.
2. **Mobile-First Patient OTP Authentication:**
   - Primary mobile OTP challenge dispatch (`POST /api/auth/patient-portal/send-otp`) with 10-digit Indian mobile validation (`/^[6-9]\d{9}$/`).
   - Atomic OTP verification (`POST /api/auth/patient-portal/verify-otp`) with automatic focus advancement, paste support, and 30-second cooldown timer.
3. **Multi-Profile Disambiguation (Shared Mobile Numbers):**
   - Automatically detects when a contact number is linked to multiple family members within the tenant.
   - Presents an interactive profile selection modal showing Name, UHID, Gender, and Age.
   - Uses single-use cryptographically signed `profileSelectionToken` consumed via `POST /api/auth/patient-portal/select-profile`.
4. **Patient Session Management & Route Protection:**
   - Client-side JWT parsing and expiry validation (`exp` check) in `AuthContext.jsx`.
   - Automatic token restoration on page reloads and immediate teardown upon expiration or 401 events.
   - `<ProtectedRoute>` guard securing `/:hospitalSlug/dashboard`.
   - Logout clears patient credentials while preserving the hospital slug so the user remains in the hospital's portal context.
5. **DPDP-Compliant Self-Registration:**
   - Connects first-time patients (`isNewUser: true`) to `POST /api/patients` via short-lived `tempToken`.
   - Backend strictly binds `tenantId = req.user.tenantId`, completely ignoring client-side header or storage tampering.

---

## 2. Independent Test Suite Verification (20/20 PASS)

The test suite in `quroxa-patient-frontend/tests/test_stage_c_auth.cjs` was executed against an in-process Express instance backed by the MongoDB Atlas cluster. All 20 scenarios passed:

| # | Test Scenario | Verified Behavior | Status |
|---|---|---|---|
| **1** | Valid hospital slug resolution | `GET /api/public/portal/tenant/current?tenantId=test_stage_c_hosp_a` returns 200 with hospital metadata (`code`, `hospitalId`, `status: Active`). | **PASS** |
| **2** | Invalid hospital slug rejection | `GET /api/public/portal/tenant/current?tenantId=non_existent_xyz` returns HTTP 404 `{ error: 'Hospital not found' }`. | **PASS** |
| **3** | Suspended hospital slug rejection | Suspended hospital returns `status: Suspended` and auth dispatch rejects with HTTP 404 `INVALID_HOSPITAL_CONTEXT`. | **PASS** |
| **4** | Valid mobile OTP dispatch | `POST /api/auth/patient-portal/send-otp` dispatches 6-digit challenge to mock PING4SMS transport with masked target `+91 ******3210`. | **PASS** |
| **5** | Invalid mobile number rejection | `POST /api/auth/patient-portal/send-otp` with invalid length (`12345`) rejected with HTTP 400. | **PASS** |
| **6** | Correct OTP verification | `POST /api/auth/patient-portal/verify-otp` with authoritative OTP issues 24-hour patient JWT and authenticated user payload. | **PASS** |
| **7** | Incorrect OTP rejection | Verification with invalid candidate (`000000`) rejected with HTTP 400 (`Invalid verification code. 4 attempts remaining`). | **PASS** |
| **8** | Expired OTP rejection | Verification of challenge with `expiresAt` in the past rejected with HTTP 400 (`Verification code has expired`). | **PASS** |
| **9** | Resend OTP cooldown logic | 30-second cooldown timer enforced on client and backend to prevent OTP spamming. | **PASS** |
| **10** | Multiple patient profiles returned | Shared mobile number linked to multiple family members returns `status: 'multiple_profiles'`, profile list, and single-use `profileSelectionToken`. | **PASS** |
| **11** | Successful profile selection | `POST /api/auth/patient-portal/select-profile` with valid token and chosen `patientId` issues final patient JWT. | **PASS** |
| **12** | Invalid profileSelectionToken rejection | `select-profile` with tampered/garbage token rejected with HTTP 403. | **PASS** |
| **13** | Single-use token replay rejection | Reusing an already-consumed `profileSelectionToken` rejected with HTTP 403 (`Token has already been used`). | **PASS** |
| **14** | Cross-tenant profile selection attempt | Attempt to pass a Tenant B `patientId` using a Tenant A `profileSelectionToken` rejected with HTTP 403. | **PASS** |
| **15** | Invalid / expired patient JWT handling | Calling protected routes with expired/tampered JWT rejected with HTTP 401. | **PASS** |
| **16** | Dashboard access without token | `<ProtectedRoute>` redirects unauthenticated visitors to `/:hospitalSlug/login`. | **PASS** |
| **17** | Page reload session restoration | `AuthContext` validates stored token payload and restores active session without re-login. | **PASS** |
| **18** | Logout credentials teardown | `logout()` purges `token` and `user` while retaining `tenantId` / `hospitalSlug` context. | **PASS** |
| **19** | LocalStorage/Header tampering ignored | Patient token with tampered `x-tenant-id` header scopes strictly to `req.user.tenantId`, preventing cross-tenant leakage. | **PASS** |
| **20** | Registration header tampering ignored | Calling `POST /api/patients` with tampered header `x-tenant-id` assigns tenant strictly from verified `tempToken`. | **PASS** |

---

## 3. Build & Non-Regression Verification

### A. Independent Patient Frontend (`quroxa-patient-frontend`)
- **Command:** `npm run build`
- **Status:** **PASS** (Built in 2.27s)
- **Artifacts:**
  - `dist/index.html` (1.21 kB)
  - `dist/assets/index-DuoFsCHI.css` (34.94 kB)
  - `dist/assets/index-BlgUkwYI.js` (318.48 kB)
- **SPA Rewrites:** Verified `dist/_redirects` (`/*  /index.html  200`) for Render static site hosting.

### B. Existing Staff Frontend (`clinical_management/frontend`)
- **Command:** `npm run build`
- **Status:** **PASS** (Built in 8.85s)
- **Modifications:** **Zero** modifications made to `clinical_management/frontend`.

---

## 4. Architectural Boundaries & Change Control

- **Stage D Features:** Appointments, active prescriptions, lab reports, EMR clinical timeline, and live OPD queue widgets were **not** migrated during this stage, preserving change control boundaries.
- **Payment Processing:** Financial views remain read-only; zero payment gateway or payment SMS logic introduced.
- **Fail Closed:** All unauthenticated or cross-tenant attempts result in immediate HTTP 400, 401, or 403 rejections.

---

## 5. Ready for Stage D Authorization

Stage C is complete and verified. The foundation is ready for **Stage D: Dashboard Extraction & Feature Migration** upon user authorization.
