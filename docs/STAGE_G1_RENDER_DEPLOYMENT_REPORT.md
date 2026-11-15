# QUROXA — STAGE G.1: RENDER STATIC SITE PROVISIONING & DEPLOYMENT REPORT

**Project:** QUROXA Patient Portal  
**Target:** Render Static Site Provisioning for `quroxa-patient-frontend`  
**GitHub Repository:** `https://github.com/justhrshh/quroxa-patient-frontend.git`  
**Deployment Branch:** `main` (Verified at commit `2b3e41577ffc2cb40f6b3ec219808a3d537aa246`)  
**Stage:** Stage G.1 — Render Static Site Provisioning & Initial Deployment  
**Date:** 15 November 2026  
**Auditor / Lead Deployment Engineer:** Lead Cloud Infrastructure Engineer  
**Status:** **CONDITIONAL PASS (AUTHENTICATION GATE ENCOUNTERED)**  

---

## 1. PRE-PROVISIONING AUDIT & REPOSITORY VERIFICATION

Prior to provisioning the Static Site service on Render, mandatory pre-flight checks were conducted against the target GitHub repository and the Render dashboard:

| Check # | Verification Requirement | Status | Technical Evidence |
|:---:|:---|:---:|:---|
| 1 | Target GitHub repository exists | **VERIFIED** | `https://github.com/justhrshh/quroxa-patient-frontend.git` |
| 2 | Target deployment branch is `main` | **VERIFIED** | Default branch is `main` |
| 3 | Target commit matches Stage G.0 | **VERIFIED** | Commit `2b3e41577ffc2cb40f6b3ec219808a3d537aa246` is HEAD of `main` |
| 4 | Clean lockfile exists in repository | **VERIFIED** | `package-lock.json` synchronized with all 7 runtime dependencies |
| 5 | Clean `npm ci` build verified | **VERIFIED** | Audited 125 packages; `vite build` completed in 2.67s with 0 errors |
| 6 | Render Dashboard authentication | **AUTH REQUIRED** | Navigated to `https://dashboard.render.com` -> Redirected to `https://dashboard.render.com/login-next` |

---

## 2. RENDER DASHBOARD ACCESS & OPERATOR ACTION REQUIRED

In accordance with **Section 2 of the Stage G.1 Specification**:
> *"If Render requires authentication, ask the operator to complete authentication directly. Never request passwords, access tokens or credentials in chat."*

The browser agent navigated to `https://dashboard.render.com` and received an HTTP 200 redirect to `https://dashboard.render.com/login-next`. The active session is currently unauthenticated.

### Operator Action Required:
1. Please open the Render dashboard in your browser and sign in to your Render account (via Email/Password, GitHub, or Google).
2. Ensure the Render account is linked to your GitHub account (`justhrshh`) with access granted to `justhrshh/quroxa-patient-frontend`.
3. Provide the actual public service URL of the existing QUROXA backend Web Service running on Render (e.g. `https://quroxa-backend.onrender.com` or `https://curoxa-backend.onrender.com`), or allow the agent to inspect the dashboard once authenticated.

---

## 3. PROVISIONING CONFIGURATION SPECIFICATION (STANDBY)

Once operator authentication is confirmed, the Static Site will be provisioned with the following verified parameters:

### Service Configuration
| Parameter | Exact Value | Verification Invariant |
|:---|:---|:---|
| **Service Type** | **Static Site** | Zero runtime server process required. Edge CDN hosted. |
| **Name** | `quroxa-patient-frontend` | Subject to Render unique name assignment. |
| **Repository** | `justhrshh/quroxa-patient-frontend` | Dedicated repository prepared in Stage G.0. |
| **Branch** | `main` | Target verified release branch. |
| **Root Directory** | *(Empty)* | **MANDATORY:** Repository root contains the application. |
| **Build Command** | `npm ci && npm run build` | Verified clean lockfile install and Vite bundle build. |
| **Publish Directory** | `dist` | Destination output directory. |
| **Auto-Deploy** | `No` (Initial) | Manual deployment trigger for controlled smoke testing. |

### Public Frontend Environment Variables
| Variable Key | Required Value Format | Usage & Invariant |
|:---|:---|:---|
| `VITE_API_URL` | `https://<actual-backend-host>/api` | Ingested by `api.js`. Must point to the shared backend Express API. |
| `VITE_SOCKET_URL` | `https://<actual-backend-host>` | Ingested by `socketService.js`. Must point to server root (WITHOUT `/api`). |

> **SECURITY INVARIANT:** No backend secrets, database connection strings, JWT signing keys, SMS credentials, or private API keys will be configured on the Static Site.

---

## 4. SPA REWRITE SPECIFICATION (STANDBY)

Upon service creation, the following redirect/rewrite rule will be configured in Render Static Site settings:

| Field | Setting | Purpose |
|:---|:---|:---|
| **Source** | `/*` | Catches all non-asset incoming HTTP requests. |
| **Destination** | `/index.html` | Serves root single-page application shell. |
| **Action** | **Rewrite** | Internal server rewrite preserving client URL in browser address bar (HTTP 200). |

---

## 5. CHANGE CONTROL & SAFETY VERIFICATION

The following strict boundaries have been preserved throughout Stage G.1:
- [x] **Shared Backend Unchanged:** Zero modifications to `clinical_management/backend`.
- [x] **Staff Application Unchanged:** Zero modifications to `clinical_management/frontend`.
- [x] **Monolithic Portal Preserved:** `PatientDashboard.jsx` in the staff frontend remains 100% intact.
- [x] **Database Unchanged:** Zero modifications to MongoDB Atlas.
- [x] **CORS Unmodified:** Backend CORS policy remains untouched in this stage.
- [x] **No DNS / Custom Domains:** `patient.quroxa.com` is deferred until post-validation.
- [x] **Zero Financial Processing:** Patient billing remains strictly informational and read-only.
- [x] **Zero Mock Production Data:** No live OTP SMS dispatched.

---

## 6. FINAL STATUS & NEXT STEPS

**STATUS: CONDITIONAL PASS (AWAITING OPERATOR DASHBOARD SIGN-IN & BACKEND HOSTNAME)**

Execution has safely paused at the authentication boundary. Once the operator signs in to Render and provides/confirms the backend URL, provisioning and initial deployment will proceed immediately.
