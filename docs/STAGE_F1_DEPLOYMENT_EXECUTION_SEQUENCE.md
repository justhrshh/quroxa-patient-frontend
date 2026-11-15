# QUROXA — STAGE F.1: DEPLOYMENT EXECUTION SEQUENCE

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Phased Orchestration for Stage G Deployment & Cutover  
**Stage:** Stage F.1 — Final Production Configuration Verification  
**Date:** 15 November 2026  
**Auditor / Verification Lead:** Lead Release Engineer & DevOps Architect  
**Status:** **EXECUTION RUNBOOK (READ-ONLY / PENDING STAGE G AUTHORIZATION)**  

---

## 1. THE DYNAMIC HOSTNAME CHALLENGE

Render Static Sites are assigned a dynamic, auto-generated hostname upon service initialization:
- **Provisional Target:** `https://quroxa-patient-frontend.onrender.com`
- **Dynamic Variable:** If the service name is already taken or modified, Render appends a random hash (e.g. `https://quroxa-patient-frontend-a1b2.onrender.com`).
- **The Chicken-and-Egg Problem:**
  - The backend cannot whitelist the patient frontend's exact origin in CORS until the Render hostname is assigned.
  - The patient frontend cannot successfully communicate with the backend until its origin is present in the backend's CORS whitelist.
- **Solution:** A phased, atomic staging sequence that binds the actual Render-generated URL into backend CORS **before** live traffic is enabled, with zero disruption to the existing staff frontend.

---

## 2. STAGE G STEP-BY-STEP EXECUTION RUNBOOK

```
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 1: Git & Lockfile Preparation                          │
   │ - Sync package-lock.json with socket.io-client via npm i    │
   │ - Push quroxa-patient-frontend to target Git repository     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 2: Render Static Site Provisioning                     │
   │ - Create Static Site on Render (Name: quroxa-patient-frontend│
   │ - Render assigns the authoritative onrender.com hostname    │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 3: Backend CORS Update & Zero-Downtime Reload          │
   │ - In Render Web Service settings, add the confirmed URL to   │
   │   CORS_ORIGIN (alongside existing staff frontend origin)    │
   │ - Backend reloads environment safely with zero downtime     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 4: Static Site Environment Configuration & Build       │
   │ - Set VITE_API_URL and VITE_SOCKET_URL in Static Site env   │
   │ - Trigger production build (npm ci && npm run build)        │
   │ - Verify build outputs and CDN edge propagation             │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 5: Production Smoke Testing & Handshake Validation     │
   │ - Validate CORS preflights, hospital resolution, OTP login, │
   │   prescriptions, and Socket.IO on the onrender.com host     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 6: Parallel Operation (Zero-Risk Dual Run)             │
   │ - Independent portal runs alongside legacy PatientDashboard │
   │ - Zero staff disruption                                     │
   └─────────────────────────────────────────────────────────────┘
```

---

### Step 1: Git & Lockfile Synchronization (Pre-Deployment)
1. In `quroxa-patient-frontend`, run `npm install` to record `socket.io-client` in `package-lock.json`.
2. Commit the updated `package-lock.json`.
3. Push `quroxa-patient-frontend` to the chosen Git deployment repository:
   - *Option A:* Dedicated GitHub repository `quroxa-patient-frontend`.
   - *Option B:* Subdirectory in `https://github.com/justhrshh/CUROXA.git`.

### Step 2: Render Static Site Provisioning
1. Log in to the **Render Dashboard**.
2. Click **New + -> Static Site**.
3. Configure repository parameters:
   - **Service Name:** `quroxa-patient-frontend`
   - **Branch:** `main` (or target release branch)
   - **Root Directory:** Empty (if dedicated repo) or `quroxa-patient-frontend` (if monorepo)
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
4. Click **Create Static Site**.
5. Render immediately assigns the service URL (e.g. `https://quroxa-patient-frontend.onrender.com`). **Record this exact URL.**

### Step 3: Backend CORS Whitelist Update
1. Navigate to the existing **Render Web Service** running `clinical_management/backend`.
2. In **Environment Variables**, locate `CORS_ORIGIN`.
3. Append the confirmed patient frontend hostname to the existing staff origin:
   ```env
   CORS_ORIGIN=https://quroxa-staff.onrender.com,https://quroxa-patient-frontend.onrender.com
   ```
4. Save changes. Render performs a zero-downtime rolling restart of the backend.
5. Verify that the staff frontend continues operating with zero interruptions.

### Step 4: Patient Static Site Environment Configuration & Build
1. Return to the **quroxa-patient-frontend Static Site** settings on Render.
2. Under **Environment Variables**, configure:
   - `VITE_API_URL` = `https://quroxa-backend.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://quroxa-backend.onrender.com`
3. Click **Manual Deploy -> Deploy Latest Commit**.
4. Monitor build logs:
   - `npm ci` completes successfully using the synchronized lockfile.
   - `vite build` finishes in ~3–5 seconds.
   - Deploy status transitions to `Live`.

### Step 5: Live Production Smoke Testing
Using a controlled test patient account (e.g. on `test_journey_hosp`):
1. Navigate to `https://quroxa-patient-frontend.onrender.com/test_journey_hosp/login`.
2. Verify hospital resolution, branding, and logo load without CORS errors.
3. Submit registered mobile number; receive 6-digit OTP SMS via PING4SMS.
4. Verify OTP; confirm dashboard loads at `/test_journey_hosp/dashboard`.
5. Verify prescriptions, letterhead rendering, pathology results, and EMR records.
6. Verify billing overview renders informational summary with **zero payment buttons**.
7. Hard refresh browser on `/test_journey_hosp/prescriptions` to verify `_redirects` SPA rewrite.
8. Verify Socket.IO connects and authenticates on the assigned domain.

### Step 6: Parallel Operation
- The independent portal operates on `https://quroxa-patient-frontend.onrender.com` for pilot patients.
- The legacy patient portal in `clinical_management/frontend/src/pages/PatientDashboard.jsx` remains 100% active and untouched for existing users.

---

## 3. FUTURE CUSTOM DOMAIN TRANSITION ROADMAP (`patient.quroxa.com`)

Connecting the official custom domain (`patient.quroxa.com`) is strictly deferred until the provisional `onrender.com` deployment passes all production smoke tests.

### Execution Steps for Custom Domain Activation (Post-Stage G)
1. **DNS CNAME Provisioning:**
   - In your DNS provider (e.g. Cloudflare / Route 53):
     - Host: `patient`
     - Type: `CNAME`
     - Value: `quroxa-patient-frontend.onrender.com`
2. **Add Custom Domain in Render:**
   - In Render Static Site Settings -> **Custom Domains**, add `patient.quroxa.com`.
   - Render automatically validates the DNS pointer and provisions a Let's Encrypt SSL certificate.
3. **Update Backend CORS Whitelist:**
   - Add `https://patient.quroxa.com` to `CORS_ORIGIN` on the backend:
     ```env
     CORS_ORIGIN=https://quroxa-staff.onrender.com,https://quroxa-patient-frontend.onrender.com,https://patient.quroxa.com
     ```
   - Both the provisional Render URL and the custom domain will now function concurrently.
