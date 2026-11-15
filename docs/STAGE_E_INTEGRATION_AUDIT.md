# QUROXA — STAGE E: END-TO-END INTEGRATION & SECURITY AUDIT

## 1. Executive Summary

This document provides the formal architectural and security verification audit for **Stage E: End-to-End Integration & Security Hardening** of the independent QUROXA Patient Frontend (`quroxa-patient-frontend`).

The objective is to establish that the newly extracted, independent Patient Frontend integrates seamlessly with the shared Node.js/Express backend (`clinical_management/backend`) and MongoDB Atlas cluster, without introducing regressions into the existing staff management system (`clinical_management/frontend`) and while strictly enforcing:
1. Patient identity mapping and zero-trust token claims.
2. Cross-tenant isolation at both HTTP and WebSocket boundaries.
3. Strict ownership enforcement on all clinical endpoints.
4. Server-resolved hospital letterhead distribution with zero exposure of staff administrative APIs.
5. Isolated Socket.IO real-time channels with complete segregation of staff broadcasts.
6. Safe, read-only financial transparency without checkout workflows or payment triggers.

---

## 2. Architecture & Service Boundaries

```text
       +---------------------------------------------+
       |           Staff Management Frontend         |
       |       clinical_management/frontend          |
       |  (Untouched, independent React/Vite app)    |
       +---------------------------------------------+
                              |
                              | HTTP / Bearer (Staff Role)
                              | WebSockets (Room: <tenantId>)
                              v
       +---------------------------------------------+
       |             Shared Express Backend          |
       |           clinical_management/backend       |
       |                                             |
       |   * verifyToken & forbidPatientRole         |
       |   * socketAuthMiddleware (Isolated Rooms)   |
       |   * Server-side Letterhead Enrichment       |
       +---------------------------------------------+
                              ^
                              | HTTP / Bearer (Patient Role)
                              | WebSockets (Room: tenant:<tenantId>:patient)
                              |
       +---------------------------------------------+
       |          Independent Patient Frontend       |
       |             quroxa-patient-frontend         |
       |     (Extracted modular React/Vite app)      |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |             MongoDB Atlas Cluster           |
       |            (Shared Multi-Tenant DB)         |
       +---------------------------------------------+
```

### Boundary Guarantees:
- **No Direct Inter-Frontend Dependencies:** `quroxa-patient-frontend` has zero imports or runtime links to `clinical_management/frontend`.
- **Legacy Preservation:** `clinical_management/frontend/src/pages/PatientDashboard.jsx` remains completely intact and undisturbed.
- **Shared Data Plane:** Both applications communicate with the same Express server and MongoDB Atlas collections.
- **Role Segregation:** Staff tokens carry roles like `doctor`, `nurse`, `receptionist`, `admin`, `pharmacist`, `accountant`, etc., while patient tokens strictly carry `role: 'patient'`.

---

## 3. Patient Identity Mapping & Verification

### 3.1 Token Structure
Patient JWT tokens are generated upon successful OTP verification or profile selection via `authRoutes.js`:
```json
{
  "id": "<Patient._id>",
  "userId": "<User._id>",
  "staff_id": "<Contact / Identifier>",
  "role": "patient",
  "actualStaffRole": "<Original User Role if dual-role>",
  "tenantId": "<Verified Hospital Tenant Code>",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### 3.2 Authorization Enforcement
1. **`req.user.id`**: Corresponds to `Patient._id`. All patient-scoped clinical queries (`Prescription.find({ patientId: req.user.id })`, `LabRequest.find({ patientId: req.user.id })`, `Billing.find({ patientId: req.user.id })`) use `req.user.id`.
2. **`req.tenantId`**: Extracted strictly from the cryptographically verified JWT payload by `verifyToken` middleware. Client-supplied query parameters, headers (`x-tenant-id`), or request bodies cannot override `req.tenantId`.
3. **Fail-Closed Verification:** If `req.user.role === 'patient'` but `req.user.id` is missing, the backend immediately rejects the request with HTTP `403 Forbidden`.

---

## 4. Cross-Tenant Isolation Contract

Every operational backend route enforces tenant-level isolation:
```javascript
const query = { tenantId: req.tenantId };
```
- A patient authenticated in `Tenant A` attempting to access resources belonging to `Tenant B` receives either:
  - `404 Not Found` (when filtered by tenant query criteria `_id: req.params.id, tenantId: req.tenantId`), or
  - `403 Forbidden` (when ownership checks fail).
- Patient tokens are rejected by `forbidPatientRole` across all staff-only operational modules (pharmacy sales, purchase orders, master catalogs, expenses, indents, vendor bills, doctor schedules, staff audits).

---

## 5. Clinical Data Ownership Contract

### 5.1 Endpoint Authorization Matrix

| Endpoint | Method | Staff Roles | Patient Role | Ownership Check |
| :--- | :---: | :---: | :---: | :--- |
| `/api/prescriptions` | GET | Doctor, Admin, Nurse, Pharm | Permitted | Filtered strictly to `patientId: req.user.id` |
| `/api/prescriptions/:id` | GET | Doctor, Admin, Nurse, Pharm | Permitted | Verified `rx.patientId === req.user.id` |
| `/api/prescriptions` | POST | Doctor | **Forbidden (403)** | Patients cannot issue prescriptions |
| `/api/lab-requests` | GET | Doctor, Lab Tech, Admin | Permitted | Filtered strictly to `patientId: req.user.id` |
| `/api/lab-requests/:id` | GET | Doctor, Lab Tech, Admin | Permitted | Verified `lab.patientId === req.user.id` |
| `/api/appointments` | GET | Staff (All) | Permitted | Filtered strictly to patient appointments |
| `/api/appointments/book` | POST | Receptionist, Admin | Permitted | Binds appointment to `req.user.id` |
| `/api/emr/patient/:id` | GET | Doctor, Admin | Permitted | Verified `req.params.id === req.user.id` |
| `/api/billing` | GET | Billing, Accountant, Admin | Permitted | Filtered strictly to `patientId: req.user.id` |

---

## 6. Letterhead Backend Integration Analysis

### 6.1 Vulnerability Background
In the legacy monolithic architecture, the patient dashboard attempted to print prescriptions by fetching the hospital letterhead via `GET /api/admin/letterhead`.
However, `adminRoutes.js` protects this route with `forbidPatientRole`. Consequently, legitimate patient prescription printing failed or exposed administrative surface area.

### 6.2 The Hardened Solution
1. **Server-Side Enrichment:**
   In `clinical_management/backend/routes/prescriptionRoutes.js`:
   - `GET /api/prescriptions` and `GET /api/prescriptions/:id` resolve the authenticated patient's hospital record using `SuperAdminHospital.findOne({ code: req.tenantId })`.
   - The resulting `hospitalLetterheadUrl` is directly injected into the prescription response payload.
2. **Client-Side Graceful Rendering:**
   In `quroxa-patient-frontend/src/pages/prescriptions/PrescriptionsPage.jsx`:
   - If `selectedRx.hospitalLetterheadUrl` is populated, the letterhead image banner is rendered.
   - If no letterhead is configured, it falls back to a clean typographic hospital header using `HospitalBrandLogo` and tenant metadata from `usePortalBranding()`.
   - **Zero calls** to `/api/admin/letterhead` are made by `quroxa-patient-frontend`.
3. **Staff Preservation:**
   - Existing staff workflows for uploading and managing letterheads in `/api/admin/letterhead` remain untouched.
   - Staff prescription queries receive the enriched `hospitalLetterheadUrl` without side effects.

---

## 7. Socket.IO Real-Time Architecture & Isolation

### 7.1 Handshake Authentication
In `clinical_management/backend/middleware/socketAuthMiddleware.js`:
- Client passes JWT in `socket.handshake.auth.token`.
- Secret is verified; expired or tampered tokens are rejected before handshake completion.
- Identity is established server-side:
  - `socket.user.userId`: Verified user ID.
  - `socket.user.role`: `'patient'`.
  - `socket.user.tenantId`: Verified tenant code.

### 7.2 Room Segregation
- **Staff Rooms:** Staff sockets join `<tenantId>` (e.g. `apollo`).
- **Patient Rooms:** Patient sockets join `tenant:<tenantId>:patient` and `user:<userId>` (and `patient:<userId>`).
- **Isolation Guarantee:**
  - Patient sockets **never** join `<tenantId>`.
  - Staff broadcasts (`session_revoked`, `hospital_subscription_updated`, `reception_queue_updated`, `ticket_created`, inventory stock alerts) emitted to `io.to(tenantId)` are **physically unreachable** by patient sockets.
  - If a patient socket emits `join_tenant`, the middleware restricts joining strictly to `tenant:<verifiedTenant>:patient`. Any attempt to join other tenants or the staff room emits an error and blocks the operation.
- **Session Expiration:**
  - Token expiration timers disconnect sockets automatically and emit a targeted `session_expired` event.

---

## 8. Financial Overview & Compliance

### 8.1 Read-Only Invoices
- `quroxa-patient-frontend/src/pages/billing/BillingPage.jsx` provides a transparent, read-only summary of patient invoices:
  - Paid invoices, pending balances, itemized breakdown.
  - Printable statement views.
- **Strict Exclusions:**
  - No Razorpay, Stripe, or payment gateway SDKs are installed or loaded.
  - No simulated "Pay Now" buttons or mock payment confirmations.
  - No payment reminder SMS or billing write operations.
  - Billing status updates can only be executed by authorized hospital billing staff through the staff application.

---

## 9. Conclusion

The architectural, security, and integration contracts for Stage E have been established and verified. The system guarantees complete isolation of tenant data, strict patient clinical ownership, secure server-enriched letterhead printing without administrative exposure, and zero regression of existing staff operations.
