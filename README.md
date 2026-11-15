# Quroxa — Independent Patient Frontend Application

## 1. Project Overview
`quroxa-patient-frontend` is the dedicated, independent frontend application for registered hospital patients on the **Quroxa Healthcare Management Platform**.

Architecturally separated from the staff administration frontend (`clinical_management/frontend`), this application provides a secure, streamlined patient experience for:
- Viewing active prescriptions and dosage schedules.
- Scheduling and reviewing clinical OPD appointments.
- Checking real-time OPD token wait times.
- Accessing diagnostic laboratory results.
- Reviewing health timelines and EMR visit records.
- Inspecting billing receipts and financial records (read-only).
- Managing DPDP Act 2023 consent preferences.

---

## 2. Technology Stack
- **Framework:** React 18.2.0 (Single Page Application)
- **Tooling & Bundler:** Vite 5.1.4
- **Language:** JavaScript (ESNext)
- **Routing:** React Router DOM 6.22.3
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **HTTP Client:** Axios 1.6.7
- **Icons:** Lucide React 0.344.0

---

## 3. Getting Started

### 3.1. Installation
Install project dependencies:
```bash
npm install
```

### 3.2. Development Server
Run Vite in development mode (starts on port 3002):
```bash
npm run dev
```

### 3.3. Production Build
Compile optimized production assets into the `dist/` directory:
```bash
npm run build
```

Preview production build locally:
```bash
npm run preview
```

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### Configuration Variables:
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend Express API base URL. **Must include the `/api` suffix.** | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Real-time WebSocket gateway URL (server root without `/api`). | `http://localhost:5000` |

> **API Base URL Convention Note:**
> All backend API routes in Quroxa are mounted under the `/api` namespace (e.g., `/api/auth`, `/api/prescriptions`). The client automatically ensures the `/api` path suffix is present if an origin URL is provided.

---

## 5. Render Static Site Deployment

This project is configured for direct deployment as a **Render Static Site**:

- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **SPA Routing Rewrite Rule:**
  Render automatically reads `public/_redirects` (copied to `dist/_redirects`), routing all client-side navigation to `index.html`:
  ```text
  /*    /index.html   200
  ```

---

## 6. Architecture & Implementation Status

### Current Status: **Stage B Complete (Foundational Scaffold)**
- [x] Independent project structure initialized with clean dependency footprint.
- [x] Tailwind CSS v4 integration with healthcare color tokens and elevation shadows.
- [x] Centralized Axios client with automatic patient JWT and tenant attachment.
- [x] Declarative React Router setup with hospital slug resolution (`/:hospitalSlug`).
- [x] Responsive layout shell with header, main container, and mobile navigation.
- [x] Render Static Site SPA fallback (`_redirects`).

### Strict Scope Boundaries (What is NOT yet implemented):
- **Stage C:** Hospital resolution against `/api/public/portal/:hospitalId`, OTP authentication dispatch & verification, multi-profile selection.
- **Stage D:** Dashboard modular widgets migration (Live OPD token, Prescriptions, Labs, Records).
- **Stage E:** Socket.IO patient events (`data_changed`).
- **Stage F:** Enriched Prescription DTO with `hospitalLetterheadUrl` for secure printing without `/api/admin/*`.

---

## 7. Business & Security Guidelines
1. **Financial Overview Rule:**
   The financial view is strictly for historical patient record-keeping. **No payment gateway, payment collection, or payment SMS processing is permitted.**
2. **Tenant Context Binding:**
   The hospital slug (`/:hospitalSlug`) is a routing identifier, not an authorization credential. Authorization is strictly bound to the cryptographic claims in the server-issued patient JWT.
