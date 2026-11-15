# QUROXA — STAGE F.1: REPOSITORY & RENDER DEPLOYMENT VERIFICATION

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Git Repository Layout, Monorepo Topology, Lockfile Integrity, and Render Root Directory  
**Stage:** Stage F.1 — Final Production Configuration Verification  
**Date:** 15 November 2026  
**Auditor / Verification Lead:** Lead Systems & Release Architect  
**Status:** **TECHNICAL AUDIT & CONFIGURATION PREPARATION (READ-ONLY)**  

---

## 1. GIT REPOSITORY TOPOLOGY & LAYOUT AUDIT

An inspection of the local file system and Git configuration was conducted to determine the exact relationship between the existing platform, the extracted patient frontend, and the hosting setup.

### 1.1 Verified File Structure & Git State
```text
C:\Users\lenovo\OneDrive\Desktop\CUROXA\                   <-- Root Directory (Local Git repo, branch: master, no remotes)
├── clinical_management\                                  <-- Subdirectory with its OWN Git repo!
│   ├── .git\                                             <-- Git remote: origin https://github.com/justhrshh/CUROXA.git (branch: main)
│   ├── backend\                                          <-- Express.js / Node.js backend
│   └── frontend\                                         <-- Existing Staff React / Vite application
├── quroxa-patient-frontend\                              <-- Extracted Independent Patient Frontend
│   ├── public\                                           <-- Contains _redirects and favicon
│   ├── src\                                              <-- Modular patient application
│   ├── package.json                                      <-- Standalone dependencies
│   ├── package-lock.json                                 <-- Lockfile (Needs sync with package.json)
│   └── vite.config.js                                    <-- Standalone Vite config
└── docs\                                                 <-- Phase 2 stage documentation
```

### 1.2 Key Repository Audit Findings
1. **Remote Repository Mismatch:**
   - The staff application and backend reside in `clinical_management/`, which is linked to `origin https://github.com/justhrshh/CUROXA.git` on branch **`main`** (not `master`).
   - The parent folder `C:\Users\lenovo\OneDrive\Desktop\CUROXA\` is a local wrapper repo with branch `master` and currently has no remote configured.
   - `quroxa-patient-frontend/` is currently located in the parent directory and is untracked by `https://github.com/justhrshh/CUROXA.git`.
2. **Impact on Render Source Connection:**
   - When creating a Render Static Site, Render connects to a specific Git repository (e.g. GitHub or GitLab).
   - If the operator connects Render to `https://github.com/justhrshh/CUROXA.git`, `quroxa-patient-frontend` is **not currently in that repository**.
   - **Recommended Deployment Options:**
     - **Option A (Dedicated Repository - Highly Recommended):** Push `quroxa-patient-frontend` to its own dedicated GitHub repository (e.g. `github.com/justhrshh/quroxa-patient-frontend`). In Render, the Root Directory is left empty (`""` or `./`). This ensures complete architectural separation.
     - **Option B (Monorepo Subdirectory):** Commit `quroxa-patient-frontend` into `https://github.com/justhrshh/CUROXA.git` as a top-level directory. In Render, the Root Directory is configured as `quroxa-patient-frontend`.
     - **Option C (Unified Monorepo):** Push the parent `CUROXA` directory to a new GitHub repository, keeping `clinical_management` and `quroxa-patient-frontend` side by side, with Render Root Directory set to `quroxa-patient-frontend`.

---

## 2. LOCKFILE INTEGRITY & BUILD COMMAND AUDIT

### 2.1 The `package-lock.json` Synchronization Issue
A strict comparison was executed between `quroxa-patient-frontend/package.json` and `quroxa-patient-frontend/package-lock.json`:

```javascript
pkg deps: [
  'axios',
  'clsx',
  'lucide-react',
  'react',
  'react-dom',
  'react-router-dom',
  'socket.io-client'  <-- Added in Stage D/E for real-time notifications
]

lock deps: [
  'axios',
  'clsx',
  'lucide-react',
  'react',
  'react-dom',
  'react-router-dom'
  // MISSING: socket.io-client is not recorded in lockfile root packages[""].dependencies
]
```

### 2.2 Why `npm ci` Fails if Not Synchronized
- `npm ci` (Clean Install) strictly requires that `package-lock.json` matches `package.json` identically. If any dependency in `package.json` is missing or mismatched in `package-lock.json`, `npm ci` exits with a fatal error:
  `npm error code EUSAGE: `package-lock.json` is not in sync with `package.json``
- **Resolution Required Prior to Stage G:**
  - The operator must run `npm install` inside `quroxa-patient-frontend` to synchronize `package-lock.json` with `socket.io-client`.
  - Once synchronized and committed, `npm ci && npm run build` will execute deterministically in Render's build container.
  - If deploying before lockfile sync, the fallback build command is `npm install && npm run build`.

---

## 3. RENDER STATIC SITE CONFIGURATION SPECIFICATION

Based on the verified source layout and build tooling, the exact Render Static Site configuration is:

| Configuration Field | Setting for Option A (Dedicated Repo) | Setting for Option B/C (Monorepo) | Notes & Verification Status |
|:---|:---|:---|:---|
| **Service Type** | **Static Site** | **Static Site** | Zero server process required. Edge CDN served. |
| **Service Name** | `quroxa-patient-frontend` | `quroxa-patient-frontend` | Subject to Render availability. |
| **Branch** | `main` | `main` (or target release branch) | Confirmed main platform branch is `main`. |
| **Root Directory** | *(Leave empty)* | `quroxa-patient-frontend` | Mandatory if in monorepo; empty if separate repo. |
| **Build Command** | `npm ci && npm run build` | `npm ci && npm run build` | Requires lockfile sync; fallback: `npm install && npm run build`. |
| **Publish Directory** | `dist` | `dist` | Target directory where Vite outputs production assets. |
| **Auto-Deploy** | `No` (Initial) | `No` (Initial) | Manual deploy recommended for initial validation. |

---

## 4. INDEPENDENT BUILD CAPABILITY VERIFICATION

To verify that `quroxa-patient-frontend` can build completely independently without any dependency on `clinical_management/frontend` or `clinical_management/backend`:

1. **Module Independence:**
   - Grepped all `import` and `require` statements in `quroxa-patient-frontend/src`.
   - Result: 100% of imports are local relative paths (`./`, `../`) or standard npm packages (`react`, `axios`, `lucide-react`, `socket.io-client`).
   - Zero symlinks or relative references pointing into `../clinical_management`.
2. **Build Execution:**
   - Ran isolated production build: `npm run build` inside `quroxa-patient-frontend`.
   - Result: Built in **3.21 seconds** with **0 errors**.
   - Output files verified in `dist/`:
     - `dist/index.html` (1.21 kB)
     - `dist/assets/index-BOpWDgXA.js` (497 kB / 142 kB gzip)
     - `dist/assets/index-DVSpLnaQ.css` (43.7 kB / 8.1 kB gzip)
     - `dist/_redirects` (132 B)
     - `dist/favicon.svg` (518 B)
3. **SPA Fallback Rule (`_redirects`):**
   - Verified that `dist/_redirects` contains:
     ```text
     /*    /index.html   200
     ```
   - On Render Static Sites, this directs the edge CDN to serve `index.html` with an HTTP 200 status for all non-asset requests, ensuring nested React Router routes (`/:hospitalSlug/dashboard`, `/:hospitalSlug/prescriptions`, etc.) resolve on hard refresh and deep bookmarking.

---

## 5. SUMMARY OF ACTIONABLE OPERATOR PRE-DEPLOYMENT STEPS

Prior to triggering Stage G deployment on Render:
1. **Repository Target:** Decide whether to push `quroxa-patient-frontend` to a dedicated GitHub repository (Option A) or commit it to `https://github.com/justhrshh/CUROXA.git` (Option B).
2. **Lockfile Synchronization:** Run `npm install` inside `quroxa-patient-frontend` to update `package-lock.json` with `socket.io-client`, and commit both files.
3. **Root Directory Setting:** Set Render Root Directory to empty for Option A, or `quroxa-patient-frontend` for Option B.
