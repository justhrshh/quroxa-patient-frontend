# QUROXA — STAGE F: ROLLBACK AND CUTOVER PLAN

**Project:** QUROXA Multi-Tenant Hospital Management Platform  
**Target:** Independent Patient Frontend (`quroxa-patient-frontend`) Phased Rollout & Fallback Strategy  
**Stage:** Stage F — Production Readiness Audit & Deployment Planning  
**Date:** 15 November 2026  
**Status:** **PLANNING ONLY (NON-EXECUTED)**  
**Authorization:** Deployment authorization NOT GRANTED  

---

## 1. PHASED PRODUCTION ROLLOUT STRATEGY

The transition to the independent patient frontend follows a strict six-phase zero-downtime methodology. At no point during the migration is the existing staff application or legacy patient portal disrupted.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASED ROLLOUT ROADMAP                          │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE F1: Pre-Deployment Readiness (COMPLETED IN STAGE F)             │
│            - Architecture audit, environment checklists, CORS plan     │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE F2: Independent Static Site Deployment (STANDBY - PENDING AUTH) │
│            - Provision Render Static Site for quroxa-patient-frontend  │
│            - Verify edge CDN caching and SPA _redirects                │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE F3: Production Connectivity Validation                          │
│            - Validate REST endpoints, CORS preflights, Socket.IO       │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE F4: Controlled Smoke Testing                                    │
│            - Execute 10 critical user journeys with test accounts      │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE F5: Parallel Operation (Zero-Risk Staging Period)               │
│            - Both new and legacy portals live simultaneously           │
│            - Internal stakeholders and pilot patients use new portal   │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE F6: Final Cutover & Legacy Decommissioning (REQUIRES SEPARATE AUTH)│
│            - Redirect legacy routes to new independent domain          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DETAILED ROLLOUT PHASES

### Phase F1 — Pre-Deployment Readiness (Current Status: COMPLETE)
- [x] Complete security audit of backend and frontend codebases.
- [x] Verify local production builds of both applications (`quroxa-patient-frontend` and `clinical_management/frontend`).
- [x] Verify SPA rewrite file (`dist/_redirects`).
- [x] Document environment variables and secret isolation.
- [x] Draft proposed CORS update for backend service.
- [x] Establish comprehensive rollback protocols.

---

### Phase F2 — Patient Frontend Deployment (Pending Operator Authorization)
1. **Action:** Create new Render Static Site pointing to `quroxa-patient-frontend`.
2. **Environment Configuration:**
   - `VITE_API_URL = https://api.quroxa.com/api` (or Render backend URL).
   - `VITE_SOCKET_URL = https://api.quroxa.com` (or Render backend root).
3. **Trigger Build:** Render triggers initial build via `npm run build`.
4. **Edge CDN Verification:**
   - Request root URL `https://[RENDER_APP_NAME].onrender.com`.
   - Verify HTTP 200 and asset load.
   - Request deep link `https://[RENDER_APP_NAME].onrender.com/test_hosp/login`.
   - Verify `_redirects` serves `index.html` without 404 errors.

---

### Phase F3 — Production Connectivity & Gateway Handshake
1. **API Handshake:** Test hospital resolution request from browser console or test runner:
   - `GET https://api.quroxa.com/api/public/portal/test_hosp`
   - Verify `Access-Control-Allow-Origin` matches the patient frontend domain.
   - Verify HTTP 200 with hospital branding payload.
2. **Socket.IO Handshake:**
   - Establish authenticated WebSocket connection:
     ```javascript
     const socket = io('https://api.quroxa.com', {
       transports: ['websocket', 'polling'],
       auth: { token: 'VALID_PATIENT_TEST_TOKEN' }
     });
     socket.on('connect', () => console.log('Socket connected successfully'));
     ```
   - Verify client joins `tenant:<id>:patient` and `user:<id>`.
3. **Secure Uploads:**
   - Request test prescription PDF with valid token header:
     - `GET https://api.quroxa.com/uploads/prescriptions/test.pdf`
     - Verify HTTP 200.
   - Request without token:
     - Verify HTTP 401 Unauthorized.

---

### Phase F4 — Production Smoke Testing Checklist
Execute the following verification matrix using a dedicated hospital test tenant (e.g. `prod_smoke_test_hosp`):

| Test # | Step Description | Expected Production Result | Pass Criteria |
|:---:|:---|:---|:---:|
| 1 | Navigate to `/:hospitalSlug/login` | Hospital logo, branding, and DPDP badge render | Visual Match |
| 2 | Direct access to `/:hospitalSlug/dashboard` | Redirects to `/:hospitalSlug/login` | HTTP 302 / React Redirect |
| 3 | Enter valid Indian mobile number | Dispatches OTP via PING4SMS | SMS Received |
| 4 | Submit valid 6-digit OTP | Authenticates and navigates to Dashboard | Token in `localStorage` |
| 5 | Verify Patient Identity | Displays correct UHID, Patient ID, and Name | Exact Match |
| 6 | View Appointments | Displays active consultations and doctor names | API 200 |
| 7 | View Prescriptions | Displays prescription with hospital letterhead | Letterhead Image Renders |
| 8 | View Diagnostic Lab Results | Displays completed CBC lab report | Lab Data Renders |
| 9 | View Medical Records & Docs | Displays consultation encounters & documents | EMR Data Renders |
| 10 | View Billing Overview | Informational invoices; **ZERO payment buttons** | Read-Only Invariant |
| 11 | Sign Out | Session cleared; redirected to login | Storage Cleared |

---

### Phase F5 — Parallel Operation Period
- **Principle:** The new independent patient frontend runs concurrently with the existing patient portal in `clinical_management/frontend`.
- **Zero Impact on Staff:** Hospital doctors, receptionists, pharmacists, and admins continue operating uninterrupted on the staff portal.
- **Pilot Access:** Selected patients and hospital staff evaluate the new patient frontend at `https://patient.quroxa.com/:hospitalSlug/login`.
- **Duration:** Recommended 7 to 14 days of live parallel operation to observe edge-case traffic, mobile responsiveness, and notification stability.

---

### Phase F6 — Final Cutover & Legacy Decommissioning
> **REQUIREMENT:** This phase requires explicit written authorization from the system owner.

1. **DNS Cutover (If Applicable):**
   - Point the canonical patient domain `portal.quroxa.com` to the Render Static Site CNAME.
2. **Staff Frontend Redirect (Optional):**
   - In `clinical_management/frontend`, configure a gentle redirect on the legacy patient route:
     ```javascript
     // Optional future redirect in staff frontend
     window.location.replace(`https://patient.quroxa.com/${hospitalSlug}/login`);
     ```
3. **Legacy Monolith Deprecation:**
   - Only after 30 days of 100% stable production operations on the independent portal will `PatientDashboard.jsx` in the staff frontend be archived.

---

## 3. ROLLBACK STRATEGY & TRIGGER MATRIX

If an unforeseen defect arises during any phase of deployment, the following rollback procedures ensure immediate restoration of service with zero risk to clinical operations.

### Rollback Triggers & Rapid Responses

| Failure Mode | Detection Signal | Rollback Action | RTO (Recovery Time) |
|:---|:---|:---|:---:|
| **Static Site Build Failure** | Render build pipeline errors or asset compile failure | Render automatically halts deployment; previous deployment remains live. | 0 seconds (Automatic) |
| **CORS Ingestion Failure** | Browser console shows `CORS policy: No 'Access-Control-Allow-Origin' header` | Revert backend `CORS_ORIGIN` environment variable in Render Dashboard to previous value and redeploy backend. | < 2 minutes |
| **API Connectivity Breakdown** | Frontend shows `Network Error` or cannot reach `/api/*` | Verify/revert `VITE_API_URL` in Static Site settings; trigger instant cache rebuild. | < 3 minutes |
| **SMS OTP Gateway Latency** | PING4SMS API outage or low balance | Enable transactional email fallback if allowed, or alert telecom aggregator. | Instant via config |
| **Hospital Routing Mismatch** | `_redirects` not resolving nested paths | Verify `public/_redirects` in Git master; trigger manual redeploy on Render. | < 3 minutes |
| **Unexpected Staff Regression** | Staff reported disruption on `clinical_management/frontend` | Immediately revert backend changes. Because the staff frontend was not modified, staff app is fully insulated. | < 2 minutes |

### Safe Fallback Invariant
Because the legacy patient portal inside the Staff Frontend (`clinical_management/frontend/src/pages/PatientDashboard.jsx`) is **never deleted or disabled** during Stage F, patients and hospital staff can immediately access the original portal at any time by navigating to their legacy URL.
