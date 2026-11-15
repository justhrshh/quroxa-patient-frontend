# Stage C — Hospital Resolution & Patient Authentication Contract Audit

## Architectural Boundaries

This document formalizes the backend contract for the independent `quroxa-patient-frontend` application, interacting with the shared Node.js/Express backend (`clinical_management/backend`) and MongoDB Atlas multi-tenant database.

The frontend is completely decoupled from the staff frontend (`clinical_management/frontend`). It relies exclusively on the verified public and patient-authenticated REST endpoints documented below.

---

## 1. Hospital Resolution Contract

### Endpoint
`GET /api/public/portal/tenant/current?tenantId=:hospitalSlug`

### Source Location
`clinical_management/backend/routes/portalRoutes.js` (Lines 18–60)

### Method & Query Parameters
- **HTTP Method:** `GET`
- **Query Parameter:** `tenantId=<hospitalSlug>` (Matches either `SuperAdminHospital.code` or `SuperAdminHospital.hospitalId`)

### Success Response (`200 OK`)
```json
{
  "hospitalId": "HSP-DM5UDO",
  "code": "city_hospital",
  "name": "City Care Hospital",
  "logo": "https://res.cloudinary.com/.../logo.png",
  "address": "123 Healthcare Blvd, Medical District",
  "phone": "+91 9876543210",
  "gst": "27AAAAA0000A1Z5",
  "status": "Active"
}
```

### Error Responses
- **`404 Not Found`**:
  ```json
  {
    "error": "Hospital not found"
  }
  ```
  *Triggered when neither `code` nor `hospitalId` matches an existing hospital record in `SuperAdminHospital`.*
- **Suspended State**:
  The response returns `status: "Suspended"`. The client frontend MUST inspect `status` and reject access if the hospital is suspended or inactive.

### Client-Side Caching Strategy
- Resolved hospital records are cached in browser `sessionStorage` keyed by `curoxa_portal_${slug}` to avoid redundant network calls during navigation.
- If a route change alters `:hospitalSlug`, the cache is re-evaluated and invalidated if mismatched.

---

## 2. Patient OTP Dispatch Contract

### Endpoint
`POST /api/auth/patient-portal/send-otp`

### Source Location
`clinical_management/backend/routes/authRoutes.js` (Lines 560–632)

### Headers & Body
- **Header:** `x-tenant-id: <hospitalCode>` (or body `tenantId: <hospitalCode>`)
- **Body:**
  ```json
  {
    "mobile": "9876543210"
  }
  ```
  *(Or `email: "patient@example.com"`)*

### Input Validation
- Indian mobile numbers: normalized via regex `/^[6-9]\d{9}$/` or stripped of `+91`/`0` prefixes.
- Hospital context is strictly validated against `SuperAdminHospital.findOne({ $or: [{ code: tenantId }, { hospitalId: tenantId }] })`.

### Success Response (`200 OK`)
```json
{
  "success": true,
  "channel": "sms",
  "maskedTarget": "+91 ******3210",
  "isNewUser": false,
  "message": "OTP sent to registered mobile number"
}
```

### Error Responses
- **`400 Bad Request`**:
  ```json
  {
    "code": "MISSING_HOSPITAL_CONTEXT",
    "error": "Hospital context (tenantId or x-tenant-id) is required to access the patient portal."
  }
  ```
- **`400 Bad Request`**:
  ```json
  {
    "code": "INVALID_PHONE_NUMBER",
    "error": "Please provide a valid 10-digit mobile number."
  }
  ```
- **`404 Not Found`**:
  ```json
  {
    "code": "INVALID_HOSPITAL_CONTEXT",
    "error": "The specified hospital could not be found or is inactive."
  }
  ```
- **`429 Too Many Requests`**: Rate limited when OTP requests exceed window limits.

---

## 3. Patient OTP Verification Contract

### Endpoint
`POST /api/auth/patient-portal/verify-otp`

### Source Location
`clinical_management/backend/routes/authRoutes.js` (Lines 634–780)

### Headers & Body
- **Header:** `x-tenant-id: <hospitalCode>` (or body `tenantId: <hospitalCode>`)
- **Body:**
  ```json
  {
    "mobile": "9876543210",
    "otp": "123456"
  }
  ```

### Verification Logic & Scenarios

#### Scenario A: Multiple Patient Profiles Linked to Contact
When the verified mobile number is linked to multiple patient records under that hospital (e.g., family members):
```json
{
  "status": "multiple_profiles",
  "profileSelectionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profiles": [
    {
      "id": "672...01",
      "name": "Ramesh Kumar",
      "uhId": "UHID-2024-001",
      "gender": "male",
      "age": 52
    },
    {
      "id": "672...02",
      "name": "Sunita Kumar",
      "uhId": "UHID-2024-002",
      "gender": "female",
      "age": 48
    }
  ]
}
```
*Note:* The `profileSelectionToken` is a cryptographically signed, short-lived token (15-minute TTL) stored in `OtpChallenge` for atomic single-use consumption.

#### Scenario B: Single Existing Patient Profile
When exactly one patient matches:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "672...01",
    "name": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "9876543210",
    "role": "patient",
    "tenantId": "city_hospital",
    "uhId": "UHID-2024-001"
  }
}
```

#### Scenario C: New Patient (Unregistered Contact)
When the contact number is valid but does not belong to any existing patient in that hospital:
```json
{
  "isNewUser": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenantId": "city_hospital",
  "emailOrPhone": "9876543210"
}
```

### Error Responses
- **`400 Bad Request`**:
  ```json
  {
    "error": "Invalid or expired OTP."
  }
  ```
- **`400 Bad Request`**:
  ```json
  {
    "code": "MISSING_HOSPITAL_CONTEXT",
    "error": "Hospital context (tenantId or x-tenant-id) is required."
  }
  ```

---

## 4. Multi-Profile Selection Contract

### Endpoint
`POST /api/auth/patient-portal/select-profile`

### Source Location
`clinical_management/backend/routes/authRoutes.js` (Lines 782–845)

### Body
```json
{
  "profileSelectionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "patientId": "672...01"
}
```

### Security Enforcement
1. **Single-Use Atomicity:** The backend looks up and marks `used: true` on the `OtpChallenge` entry matching the token. If already used or expired, it returns `400 Bad Request`.
2. **Tenant Scoping:** The query explicitly searches:
   ```javascript
   Patient.findOne({ _id: patientId, tenantId: tokenValidation.tenantId })
   ```
3. **Cross-Tenant Prevention:** If a patient ID belongs to a different tenant, or is not in the `allowedPatientIds` array of the token, the backend returns `403 Forbidden`.

### Success Response (`200 OK`)
```json
{
  "message": "Profile selected successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "672...01",
    "userId": "672...01",
    "name": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "9876543210",
    "role": "patient",
    "tenantId": "city_hospital"
  }
}
```

---

## 5. Self-Registration Contract

### Endpoint
`POST /api/patients`

### Source Location
`clinical_management/backend/routes/patientRoutes.js` (Lines 11–28) & `patientController.js`

### Headers & Authentication
- **Header:** `Authorization: Bearer <tempToken>`
- Backend decodes the `tempToken` issued during OTP verification (`isNewUser: true`).
- The controller strictly enforces:
  ```javascript
  req.tenantId = req.user.tenantId;
  ```
  Any client-supplied `tenantId` in the request body or `x-tenant-id` header is discarded.

### Request Body
```json
{
  "name": "Aarav Sharma",
  "age": 30,
  "gender": "male",
  "contact": "9876543210",
  "email": "aarav@example.com",
  "bloodGroup": "O+",
  "address": "45 Green Park, Mumbai",
  "medicalHistory": "None",
  "allergies": "Penicillin",
  "currentMedications": "None",
  "dpdpConsent": true,
  "vitals": {
    "bloodPressure": "120/80",
    "heartRate": 72
  }
}
```

### Success Response (`201 Created`)
```json
{
  "_id": "673...",
  "tenantId": "city_hospital",
  "uhId": "UHID-2024-099",
  "patientId": "PID-2024-0123",
  "name": "Aarav Sharma",
  "age": 30,
  "gender": "male",
  "contact": "9876543210",
  "email": "aarav@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "673...",
    "_id": "673...",
    "name": "Aarav Sharma",
    "contact": "9876543210",
    "email": "aarav@example.com",
    "role": "patient",
    "isSetupComplete": true,
    "tenantId": "city_hospital"
  }
}
```
*Note:* The response immediately delivers the final authenticated 24-hour patient JWT (`token`) and the authenticated `user` payload, allowing seamless transition to the dashboard.

---

## 6. Security Guarantees & Non-Negotiable Rules

1. **Client Headers Cannot Grant Authorization:** The URL slug is merely a route parameter used to request the public hospital profile and contextualize the OTP dispatch. Tenant access is bound exclusively by the backend-issued JWT.
2. **Fail Closed:** Any request missing hospital context or carrying an invalid/expired token immediately terminates with 400, 401, or 403.
3. **No Cross-Tenant Leaks:** Even if an attacker passes a valid `profileSelectionToken` with a `patientId` from another hospital, the tenant-scoped query `Patient.findOne({ _id: patientId, tenantId: tokenTenant })` yields `null` and raises `403 Forbidden`.
4. **Clean Session Teardown:** Upon logout, the frontend purges all tokens, patient user records, and cached credentials, while retaining the hospital slug so the user can log back in within the same hospital context.
