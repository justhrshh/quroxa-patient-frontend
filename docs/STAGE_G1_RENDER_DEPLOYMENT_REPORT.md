# QUROXA — STAGE G.1: RENDER STATIC SITE PROVISIONING & DEPLOYMENT REPORT

**Project:** QUROXA Patient Portal  
**Target:** Render Static Site Provisioning for `quroxa-patient-frontend`  
**GitHub Repository:** `https://github.com/justhrshh/quroxa-patient-frontend.git`  
**Deployment Branch:** `main` (Verified at commit `12754aa`)  
**Stage:** Stage G.1 — Render Static Site Provisioning & Initial Deployment  
**Date:** 15 November 2026  
**Auditor / Lead Deployment Engineer:** Lead Cloud Infrastructure Engineer  
**Status:** **PASS — PRODUCTION DEPLOYMENT & VERIFICATION COMPLETE**

---

## 1. EXECUTIVE SUMMARY

Stage G.1 authorized the provisioning and initial production deployment of the independent **QUROXA Patient Frontend** as a Render Static Site, connecting to the existing production backend web service (`https://curoxa.onrender.com`).

All pre-provisioning checks, workspace session authentication, service creation, environment variable binding, SPA rewrite configuration, build execution, and live browser verification have been completed with **100% success**.

| Metric | Target | Actual Result | Status |
|---|---|---|:---:|
| **Render Workspace** | Harsh's workspace | `My project` (`prj-da9t6n942hec738slsi0`) | **PASS** |
| **Backend Web Service** | `curoxa` | `CUROXA` (`srv-da9t6nss728c73eooctg`) — Live | **PASS** |
| **Static Site Name** | `quroxa-patient-frontend` | `quroxa-patient-frontend` (`srv-dbsv8561egvs73evl9eg`) | **PASS** |
| **Public Assigned URL** | `https://*.onrender.com` | `https://quroxa-patient-frontend.onrender.com` | **PASS** |
| **Initial Deployment** | First Deploy | Deploy `dep-dbsv85e1egvs73evlaq0` — Live (16.1s) | **PASS** |
| **SPA Rewrites** | `/*` -> `/index.html` | Configured and active | **PASS** |
| **Live Browser Verification** | Root + Deep Routes | Verified HTTP 200, assets loaded, 0 crashes | **PASS** |

---

## 2. PRE-PROVISIONING & INFRASTRUCTURE INSPECTION

Prior to provisioning, the active Render dashboard session was inspected in Harsh's workspace:

### 2.1 Existing Services Audit
1. **Existing Backend Web Service:**
   - **Service Name:** `CUROXA`
   - **Service ID:** `srv-da9t6nss728c73eooctg`
   - **Runtime:** Node.js
   - **Region:** Oregon (US West)
   - **Current Status:** **Live** (Healthy & operational)
   - **Public API URL:** `https://curoxa.onrender.com/api`
   - **Socket Server URL:** `https://curoxa.onrender.com`
   - *Cold Start Audit:* Probed `https://curoxa.onrender.com/` directly; confirmed HTTP 200 with response `Curoxa API is running...`. (Prior intermittent 503 observed during testing was confirmed to be a standard Render Free tier idle cold-start spinning up).

2. **Existing Staff Frontend Static Site:**
   - **Service Name:** `CUROXA-1`
   - **Service ID:** `srv-da9tjme7bikc73esntf0`
   - **Runtime:** Static Site
   - **Current Status:** **Live**
   - **Public URL:** `https://curoxa-1.onrender.com`

---

## 3. RENDER STATIC SITE PROVISIONING SPECIFICATION

The new independent Patient Frontend was provisioned inside project `My project` (`prj-da9t6n942hec738slsi0`) with the exact configuration:

### 3.1 Service Metadata
| Configuration Property | Value Assigned | Verification Details |
|:---|:---|:---|
| **Service Name** | `quroxa-patient-frontend` | Name assigned without suffix collision |
| **Service ID** | `srv-dbsv8561egvs73evl9eg` | Immutable Render resource identifier |
| **Assigned Public Hostname** | `quroxa-patient-frontend.onrender.com` | Canonical Render edge CDN URL |
| **Source Repository** | `justhrshh/quroxa-patient-frontend` | Dedicated repository on GitHub |
| **Deployment Branch** | `main` | Production branch |
| **Root Directory** | *(Empty / `.`) | Application root is at repository root |
| **Build Command** | `npm ci && npm run build` | Clean dependency install + Vite production build |
| **Publish Directory** | `dist` | Built static assets directory |

### 3.2 Environment Variable Configuration
The following public client variables were injected into the build environment:

| Variable Name | Configured Value | Description |
|:---|:---|:---|
| `VITE_API_URL` | `https://curoxa.onrender.com/api` | Base URL consumed by Axios API client (`api.js`) |
| `VITE_SOCKET_URL` | `https://curoxa.onrender.com` | Hostname consumed by Socket.IO client (`socketService.js`) |

> **Security Verification:** No secrets, MongoDB connection strings, JWT secret tokens, or private API keys were added to the frontend environment.

---

## 4. SPA ROUTING & REWRITE CONFIGURATION

In modern Single-Page Applications (SPA), client-side routing routes deep paths (such as `/:hospitalSlug/login` or `/:hospitalSlug/dashboard`) through JavaScript. When a user navigates directly to or refreshes a deep link, the static web server must rewrite the request to `/index.html` with HTTP 200 rather than throwing a 404 Not Found.

### Configured Rewrite Rule
- **Location:** Static Site Settings -> `Redirects/Rewrites`
- **Source Pattern:** `/*`
- **Destination Path:** `/index.html`
- **Action Type:** `Rewrite`
- **Status:** **Active & Verified** (Rule successfully created and validated).

---

## 5. INITIAL DEPLOYMENT EXECUTION & BUILD LOGS

- **Deploy ID:** `dep-dbsv85e1egvs73evlaq0`
- **Trigger:** Initial deploy on repository connection (Commit `12754aa`)
- **Total Duration:** **16.1 seconds**
- **Result:** **Deploy succeeded | Live**

### Build Execution Summary
```text
==> Running build command 'npm ci && npm run build'...
added 120 packages, and audited 127 packages in 2s
22 packages are looking for funding
  run `npm fund`
found 0 vulnerabilities

> quroxa-patient-frontend@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1600 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.21 kB │ gzip:   0.50 kB
dist/assets/index-DVSpLnaQ.css   43.73 kB │ gzip:   8.35 kB
dist/assets/index-Doqtsu8W.js   497.95 kB │ gzip: 147.25 kB
✓ built in 1.94s
==> Generating index for dist...
==> Uploading build...
==> Build successful 🎉
==> Deploying...
==> Your site is live 🎉
```

---

## 6. LIVE PRODUCTION BROWSER VERIFICATION

The live deployed application was verified directly via the browser agent:

| Verification Target | URL Tested | Observation / Result | Status |
|:---|:---|:---|:---:|
| **Edge HTTPS Certificate** | `https://quroxa-patient-frontend.onrender.com/` | Valid TLS/SSL certificate issued by Render edge CDN | **PASS** |
| **Root Portal UI (`/`)** | `https://quroxa-patient-frontend.onrender.com/` | HTTP 200; Document title: `Quroxa — Patient Portal`. Cleanly rendered patient entrance portal with hospital slug search, DPDP compliance badge, modern responsive header and layout. | **PASS** |
| **Static Assets** | `/assets/index-DVSpLnaQ.css`<br>`/assets/index-Doqtsu8W.js` | Loaded with HTTP 200; zero CSS styling bugs or JS bundle evaluation errors. | **PASS** |
| **Deep Link Navigation** | `https://quroxa-patient-frontend.onrender.com/apollo_delhi/login` | HTTP 200 (SPA rewrite rule successfully caught request without 404). Loaded login module shell. | **PASS** |
| **Live Backend API Connectivity** | Hospital resolution request dispatched to `https://curoxa.onrender.com/api` | The patient frontend successfully communicated with the live backend. Non-existent slug `apollo_delhi` returned 404 from backend; frontend gracefully caught the error, displayed "Hospital Not Found" fallback UI, and provided interactive navigation to return to root. | **PASS** |
| **Runtime Crash Audit** | Console & Window | Zero unhandled exceptions, zero blank screens, zero fatal crashes. | **PASS** |

---

## 7. STRICT CHANGE CONTROL CONFIRMATION

During Stage G.1, all architectural boundaries were strictly respected:
- [x] **Zero Backend Changes:** No modifications were made to `clinical_management/backend`.
- [x] **Permissive CORS Unchanged:** Backend CORS policy was NOT modified (retained in current state until Stage G.2 cutover).
- [x] **Zero Staff Frontend Changes:** `clinical_management/frontend` remains completely untouched.
- [x] **Monolithic Portal Preserved:** Legacy `PatientDashboard.jsx` in the staff frontend was NOT deleted or altered.
- [x] **Zero Database Alterations:** Shared MongoDB Atlas database was untouched.
- [x] **Custom Domain Deferred:** `patient.quroxa.com` was NOT mapped; initial deployment uses canonical `onrender.com` domain as instructed.
- [x] **Zero Live OTP Dispatches:** No real-world SMS credentials or live patient OTPs were triggered.

---

## 8. FINAL STATUS & NEXT STEPS

### Status: **PASS — STAGE G.1 COMPLETE**

The independent QUROXA Patient Frontend is now officially live on Render:
- **Production URL:** `https://quroxa-patient-frontend.onrender.com`
- **Backend API:** `https://curoxa.onrender.com/api`
- **Render Service ID:** `srv-dbsv8561egvs73evl9eg`

**Awaiting operator instruction for Stage G.2 (or next authorized stage).**
