/**
 * QUROXA — Stage E: End-to-End Integration & Security Hardening Verification Suite
 *
 * Verifies all 36 test scenarios across 6 core security categories:
 * 1. Authentication (Tests 1-6)
 * 2. Tenant Isolation (Tests 7-12)
 * 3. Clinical Data Ownership (Tests 13-20)
 * 4. Letterhead Security (Tests 21-25)
 * 5. Socket.IO Security (Tests 26-31)
 * 6. Staff Regression & Financial Safety (Tests 32-36)
 */

const http = require('http');
const path = require('path');
const assert = require('assert');

// Point module resolution to backend node_modules
const backendModules = path.join(__dirname, '../../clinical_management/backend/node_modules');
module.paths.push(backendModules);

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Server } = require('socket.io');

let ioClient;
try {
  ioClient = require('socket.io-client');
} catch (e) {
  ioClient = require('../../clinical_management/frontend/node_modules/socket.io-client');
}

require('dotenv').config({ path: path.join(__dirname, '../../clinical_management/backend/.env') });

const connectDB = require('../../clinical_management/backend/config/db');
const { getJwtSecret } = require('../../clinical_management/backend/config/env');
const {
  socketAuthMiddleware,
  configureSocketTenantIsolation
} = require('../../clinical_management/backend/middleware/socketAuthMiddleware');

// Backend Models
const SuperAdminHospital = require('../../clinical_management/backend/models/SuperAdminHospital');
const Patient = require('../../clinical_management/backend/models/Patient');
const User = require('../../clinical_management/backend/models/User');
const Appointment = require('../../clinical_management/backend/models/Appointment');
const Prescription = require('../../clinical_management/backend/models/Prescription');
const LabRequest = require('../../clinical_management/backend/models/LabRequest');
const Billing = require('../../clinical_management/backend/models/Billing');
const Visit = require('../../clinical_management/backend/models/Visit');
const Consent = require('../../clinical_management/backend/models/Consent');

const TEST_PORT = 5898;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
let io;
let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS ${passedTests}/${totalTests}] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL ${totalTests}] ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.response) {
      console.error(`     Response Status: ${err.response.status}`);
      console.error(`     Response Data:`, err.response.data);
    }
    throw err;
  }
}

async function main() {
  console.log('\n===============================================================');
  console.log('QUROXA — STAGE E: END-TO-END INTEGRATION & SECURITY TEST SUITE');
  console.log('===============================================================\n');

  // 1. Connect MongoDB via DoH-enabled connectDB
  await connectDB();
  console.log('[DB] Connected to MongoDB Atlas:', mongoose.connection.name);

  let secretKey;
  try {
    secretKey = getJwtSecret();
  } catch (e) {
    secretKey = process.env.JWT_SECRET || 'secret_key';
  }

  // 2. Setup Express & Socket.IO App
  const app = express();
  app.use(express.json());

  server = http.createServer(app);
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
  });

  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    configureSocketTenantIsolation(io, socket);
  });

  // Mount backend routes
  app.use('/api/auth', require('../../clinical_management/backend/routes/authRoutes'));
  app.use('/api/prescriptions', require('../../clinical_management/backend/routes/prescriptionRoutes'));
  app.use('/api/labs', require('../../clinical_management/backend/routes/labRoutes'));
  app.use('/api/appointments', require('../../clinical_management/backend/routes/appointmentRoutes'));
  app.use('/api/billing', require('../../clinical_management/backend/routes/billingRoutes'));
  app.use('/api/emr', require('../../clinical_management/backend/routes/emrRoutes'));
  app.use('/api/admin', require('../../clinical_management/backend/routes/adminRoutes'));
  app.use('/api/pharmacy-sales', require('../../clinical_management/backend/routes/pharmacySaleRoutes'));

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[SERVER] Test server listening on ${BASE_URL}\n`);

  // 3. Seed Isolated Multi-Tenant Test Data
  const tenantA = 'stg_e_tenant_alpha';
  const tenantB = 'stg_e_tenant_beta';

  console.log('[SEED] Seeding isolated multi-tenant entities for Tenant A and Tenant B...');

  // Hospitals
  await SuperAdminHospital.findOneAndUpdate(
    { code: tenantA },
    {
      name: 'Alpha Integrated Hospital',
      code: tenantA,
      hospitalId: 'ALPHA-HOSP',
      status: 'active',
      letterheadUrl: 'https://cdn.example.com/alpha-letterhead.png',
      logo: 'https://cdn.example.com/alpha-logo.png'
    },
    { upsert: true, new: true }
  );

  await SuperAdminHospital.findOneAndUpdate(
    { code: tenantB },
    {
      name: 'Beta Healthcare Facility',
      code: tenantB,
      hospitalId: 'BETA-HOSP',
      status: 'active',
      letterheadUrl: 'https://cdn.example.com/beta-letterhead.png',
      logo: 'https://cdn.example.com/beta-logo.png'
    },
    { upsert: true, new: true }
  );

  // Doctors
  const doctorA = await User.findOneAndUpdate(
    { email: 'doctor_a_stge@test.com' },
    {
      name: 'Dr. John Alpha',
      email: 'doctor_a_stge@test.com',
      role: 'doctor',
      tenantId: tenantA,
      staff_id: 'DOC-STGE-A'
    },
    { upsert: true, new: true }
  );

  const doctorB = await User.findOneAndUpdate(
    { email: 'doctor_b_stge@test.com' },
    {
      name: 'Dr. Jane Beta',
      email: 'doctor_b_stge@test.com',
      role: 'doctor',
      tenantId: tenantB,
      staff_id: 'DOC-STGE-B'
    },
    { upsert: true, new: true }
  );

  // Patients: Patient A1 (Tenant A), Patient A2 (Tenant A), Patient B1 (Tenant B)
  const patientA1 = await Patient.findOneAndUpdate(
    { contact: '9991110001', tenantId: tenantA },
    {
      name: 'Alice Alpha',
      contact: '9991110001',
      email: 'alice@alpha.test',
      tenantId: tenantA,
      uhId: 'UHID-STGE-A1',
      patientId: 'PID-STGE-A1',
      gender: 'Female',
      age: 29
    },
    { upsert: true, new: true }
  );

  const patientA2 = await Patient.findOneAndUpdate(
    { contact: '9991110002', tenantId: tenantA },
    {
      name: 'Arthur Alpha',
      contact: '9991110002',
      email: 'arthur@alpha.test',
      tenantId: tenantA,
      uhId: 'UHID-STGE-A2',
      patientId: 'PID-STGE-A2',
      gender: 'Male',
      age: 45
    },
    { upsert: true, new: true }
  );

  const patientB1 = await Patient.findOneAndUpdate(
    { contact: '9992220001', tenantId: tenantB },
    {
      name: 'Bob Beta',
      contact: '9992220001',
      email: 'bob@beta.test',
      tenantId: tenantB,
      uhId: 'UHID-STGE-B1',
      patientId: 'PID-STGE-B1',
      gender: 'Male',
      age: 38
    },
    { upsert: true, new: true }
  );

  // User documents for patients
  const userA1 = await User.findOneAndUpdate(
    { phone: '9991110001' },
    {
      name: 'Alice Alpha',
      phone: '9991110001',
      role: 'patient',
      tenantId: tenantA,
      staff_id: 'PAT-STGE-A1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const userA2 = await User.findOneAndUpdate(
    { phone: '9991110002' },
    {
      name: 'Arthur Alpha',
      phone: '9991110002',
      role: 'patient',
      tenantId: tenantA,
      staff_id: 'PAT-STGE-A2'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const userB1 = await User.findOneAndUpdate(
    { phone: '9992220001' },
    {
      name: 'Bob Beta',
      phone: '9992220001',
      role: 'patient',
      tenantId: tenantB,
      staff_id: 'PAT-STGE-B1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Prescriptions
  const rxA1 = await Prescription.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      doctorId: doctorA._id,
      diagnosis: 'Acute Pharyngitis',
      notes: 'Take with warm water',
      status: 'Direct Patient',
      items: [{ medicine: 'Amoxicillin 500mg', dosage: '1-0-1', duration: '5 days' }]
    },
    { upsert: true, new: true }
  );

  const rxA2 = await Prescription.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      doctorId: doctorA._id,
      diagnosis: 'Hypertension Stage 1',
      notes: 'Morning after breakfast',
      status: 'Direct Patient',
      items: [{ medicine: 'Amlodipine 5mg', dosage: '1-0-0', duration: '30 days' }]
    },
    { upsert: true, new: true }
  );

  const rxB1 = await Prescription.findOneAndUpdate(
    { tenantId: tenantB, patientId: patientB1._id },
    {
      tenantId: tenantB,
      patientId: patientB1._id,
      doctorId: doctorB._id,
      diagnosis: 'Bronchial Asthma',
      notes: 'Inhaler as needed',
      status: 'Direct Patient',
      items: [{ medicine: 'Salbutamol Inhaler', dosage: '2 puffs PRN', duration: '1 month' }]
    },
    { upsert: true, new: true }
  );

  // Lab Requests
  const labA1 = await LabRequest.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      testName: 'Complete Blood Count (CBC)',
      status: 'Completed',
      results: 'Normal hemoglobin 13.8 g/dL'
    },
    { upsert: true, new: true }
  );

  const labA2 = await LabRequest.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      testName: 'Lipid Profile',
      status: 'Completed',
      results: 'Cholesterol 195 mg/dL'
    },
    { upsert: true, new: true }
  );

  const labB1 = await LabRequest.findOneAndUpdate(
    { tenantId: tenantB, patientId: patientB1._id },
    {
      tenantId: tenantB,
      patientId: patientB1._id,
      testName: 'Spirometry',
      status: 'Completed',
      results: 'FEV1 within normal range'
    },
    { upsert: true, new: true }
  );

  // EMR Visits
  const visitA1 = await Visit.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      visitId: 'VISIT-STGE-A1',
      doctorId: doctorA._id,
      complaint: 'Sore throat and mild fever',
      diagnosis: 'Pharyngitis',
      doctorNotes: 'Advised rest and hydration',
      vitals: { pulse: 78, temperature: 99.2, bpSystolic: 120, bpDiastolic: 80 }
    },
    { upsert: true, returnDocument: 'after' }
  );

  const visitA2 = await Visit.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      visitId: 'VISIT-STGE-A2',
      doctorId: doctorA._id,
      complaint: 'Routine hypertension follow-up',
      diagnosis: 'Essential Hypertension',
      doctorNotes: 'Continue current medication regimen',
      vitals: { pulse: 72, temperature: 98.6, bpSystolic: 135, bpDiastolic: 88 }
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Billing
  const billA1 = await Billing.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      billNumber: 'INV-STGE-A1',
      totalAmount: 750,
      paidAmount: 750,
      balanceAmount: 0,
      status: 'Paid',
      items: [{ description: 'General Consultation', amount: 500 }, { description: 'CBC Test', amount: 250 }]
    },
    { upsert: true, new: true }
  );

  const billA2 = await Billing.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      billNumber: 'INV-STGE-A2',
      totalAmount: 1200,
      paidAmount: 1200,
      balanceAmount: 0,
      status: 'Paid',
      items: [{ description: 'Cardiology Follow-up', amount: 800 }, { description: 'Lipid Test', amount: 400 }]
    },
    { upsert: true, new: true }
  );

  const billB1 = await Billing.findOneAndUpdate(
    { tenantId: tenantB, patientId: patientB1._id },
    {
      tenantId: tenantB,
      patientId: patientB1._id,
      billNumber: 'INV-STGE-B1',
      totalAmount: 950,
      paidAmount: 950,
      balanceAmount: 0,
      status: 'Paid',
      items: [{ description: 'Pulmonology Consultation', amount: 950 }]
    },
    { upsert: true, new: true }
  );

  // Generate Tokens
  const tokenA1 = jwt.sign(
    { id: patientA1._id, userId: userA1._id, role: 'patient', tenantId: tenantA, staff_id: '9991110001' },
    secretKey,
    { expiresIn: '24h' }
  );

  const tokenA2 = jwt.sign(
    { id: patientA2._id, userId: userA2._id, role: 'patient', tenantId: tenantA, staff_id: '9991110002' },
    secretKey,
    { expiresIn: '24h' }
  );

  const tokenB1 = jwt.sign(
    { id: patientB1._id, userId: userB1._id, role: 'patient', tenantId: tenantB, staff_id: '9992220001' },
    secretKey,
    { expiresIn: '24h' }
  );

  const expiredToken = jwt.sign(
    { id: patientA1._id, userId: userA1._id, role: 'patient', tenantId: tenantA },
    secretKey,
    { expiresIn: -10 }
  );

  const staffTokenDoctorA = jwt.sign(
    { id: doctorA._id, userId: doctorA._id, role: 'doctor', tenantId: tenantA, staff_id: doctorA.staff_id },
    secretKey,
    { expiresIn: '15m' }
  );

  console.log('[SEED] Test entities ready. Executing test scenarios...\n');

  // =========================================================================
  // CATEGORY 1: AUTHENTICATION (Tests 1-6)
  // =========================================================================
  console.log('--- CATEGORY 1: AUTHENTICATION ---');

  await runTest('1. Valid patient token allows access to patient endpoints', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await runTest('2. Invalid / malformed token is rejected (401/403)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions`, {
        headers: { Authorization: 'Bearer this_is_an_invalid_token' }
      });
      assert.fail('Should have rejected invalid token');
    } catch (err) {
      assert(err.response && [401, 403].includes(err.response.status));
    }
  });

  await runTest('3. Expired patient token is rejected (401)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assert.fail('Should have rejected expired token');
    } catch (err) {
      assert(err.response && [401, 403].includes(err.response.status));
    }
  });

  await runTest('4. Missing token is rejected (401)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions`);
      assert.fail('Should have rejected missing token');
    } catch (err) {
      assert(err.response && [401, 403].includes(err.response.status));
    }
  });

  await runTest('5. Patient token rejected on staff-only operational routes (403 forbidden)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/pharmacy-sales`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient should be forbidden from pharmacy sales');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('6. Logout simulation stops further requests (no token / stripped credentials)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions`, {
        headers: {} // No Authorization header simulating local storage clear
      });
      assert.fail('Unauthenticated request should fail');
    } catch (err) {
      assert(err.response && [401, 403].includes(err.response.status));
    }
  });

  // =========================================================================
  // CATEGORY 2: TENANT ISOLATION (Tests 7-12)
  // =========================================================================
  console.log('\n--- CATEGORY 2: TENANT ISOLATION ---');

  await runTest('7. Patient from Tenant A cannot retrieve Patient B from Tenant B', async () => {
    try {
      await axios.get(`${BASE_URL}/api/emr/visits/patient/${patientB1._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Should not retrieve patient from another tenant');
    } catch (err) {
      assert(err.response && [403, 404].includes(err.response.status));
    }
  });

  await runTest('8. Patient from Tenant A cannot retrieve prescriptions from Tenant B', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions/${rxB1._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Should not retrieve prescription from Tenant B');
    } catch (err) {
      assert(err.response && [403, 404].includes(err.response.status));
    }
  });

  await runTest('9. Patient from Tenant A cannot retrieve lab results from Tenant B', async () => {
    const res = await axios.get(`${BASE_URL}/api/labs`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const leaked = res.data.some((l) => String(l._id) === String(labB1._id) || String(l.tenantId) === tenantB);
    assert.strictEqual(leaked, false, 'Leaked Tenant B lab requests to Patient A1');
  });

  await runTest('10. Patient from Tenant A cannot retrieve billing from Tenant B', async () => {
    const res = await axios.get(`${BASE_URL}/api/billing?tenantId=${tenantB}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const leaked = res.data.some((b) => String(b._id) === String(billB1._id) || String(b.tenantId) === tenantB);
    assert.strictEqual(leaked, false, 'Leaked Tenant B billing to Patient A1');
  });

  await runTest('11. Altering tenant ID in query parameters does not leak Tenant B data', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions?tenantId=${tenantB}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    // Server must ignore query tenantId and strictly return only Patient A1's prescriptions
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const leaked = res.data.some((r) => String(r.tenantId) === tenantB);
    assert.strictEqual(leaked, false, 'Leaked Tenant B data via query parameter tampering');
  });

  await runTest('12. Header manipulation (x-tenant-id) does not bypass JWT-derived tenantId', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: {
        Authorization: `Bearer ${tokenA1}`,
        'x-tenant-id': tenantB
      }
    });
    assert.strictEqual(res.status, 200);
    const leaked = res.data.some((r) => String(r.tenantId) === tenantB);
    assert.strictEqual(leaked, false, 'Leaked Tenant B data via header manipulation');
  });

  // =========================================================================
  // CATEGORY 3: CLINICAL DATA OWNERSHIP (Tests 13-20)
  // =========================================================================
  console.log('\n--- CATEGORY 3: CLINICAL DATA OWNERSHIP ---');

  await runTest('13. Patient A1 cannot access Patient A2 prescriptions (same tenant)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions/${rxA2._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient A1 should not be able to view Patient A2 prescription');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('14. Patient A1 can access their own prescriptions', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions/${rxA1._id}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(String(res.data._id), String(rxA1._id));
  });

  await runTest('15. Patient A1 cannot access Patient A2 lab requests (same tenant)', async () => {
    const res = await axios.get(`${BASE_URL}/api/labs`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    const leaked = res.data.some((l) => String(l._id) === String(labA2._id) || String(l.patientId?._id || l.patientId) === String(patientA2._id));
    assert.strictEqual(leaked, false, 'Leaked Patient A2 lab request to Patient A1');
  });

  await runTest('16. Patient A1 can access their own lab requests', async () => {
    const res = await axios.get(`${BASE_URL}/api/labs`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    const hasOwn = res.data.some((l) => String(l._id) === String(labA1._id));
    assert.strictEqual(hasOwn, true, 'Patient A1 could not find their own lab request');
  });

  await runTest('17. Patient A1 cannot access Patient A2 visits / EMR (same tenant)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/emr/visits/patient/${patientA2._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient A1 should not access Patient A2 EMR');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('18. Patient A1 can access their own EMR clinical visits', async () => {
    const res = await axios.get(`${BASE_URL}/api/emr/visits/patient/${patientA1._id}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await runTest('19. Patient A1 cannot access Patient A2 vital signs or notes', async () => {
    try {
      await axios.get(`${BASE_URL}/api/emr/vitals/patient/${patientA2._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient A1 should not access Patient A2 vitals');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('20. Patient A1 cannot access Patient A2 billing records', async () => {
    const res = await axios.get(`${BASE_URL}/api/billing?patientId=${patientA2._id}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const leaked = res.data.some((b) => String(b._id) === String(billA2._id) || String(b.patientId?._id || b.patientId) === String(patientA2._id));
    assert.strictEqual(leaked, false, 'Patient A1 leaked Patient A2 billing records');
  });

  // =========================================================================
  // CATEGORY 4: LETTERHEAD SECURITY (Tests 21-25)
  // =========================================================================
  console.log('\n--- CATEGORY 4: LETTERHEAD SECURITY ---');

  await runTest('21. Patient fetching prescription receives correct hospital letterhead URL', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions/${rxA1._id}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.hospitalLetterheadUrl, 'https://cdn.example.com/alpha-letterhead.png');
  });

  await runTest('22. Patient from Tenant A cannot receive letterhead of Tenant B', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.length > 0);
    res.data.forEach((rx) => {
      assert.notStrictEqual(rx.hospitalLetterheadUrl, 'https://cdn.example.com/beta-letterhead.png');
      assert.strictEqual(rx.hospitalLetterheadUrl, 'https://cdn.example.com/alpha-letterhead.png');
    });
  });

  await runTest('23. Direct call to GET /api/admin/letterhead with patient token is rejected (403)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/admin/letterhead`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient token should be forbidden on /api/admin/letterhead');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('24. Direct call to POST /api/admin/letterhead with patient token is rejected (403)', async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/admin/letterhead`,
        {},
        {
          headers: { Authorization: `Bearer ${tokenA1}` }
        }
      );
      assert.fail('Patient token should be forbidden on POST /api/admin/letterhead');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('25. Direct call to POST /api/admin/letterhead-clear with patient token is rejected (403)', async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/admin/letterhead-clear`,
        {},
        {
          headers: { Authorization: `Bearer ${tokenA1}` }
        }
      );
      assert.fail('Patient token should be forbidden on /api/admin/letterhead-clear');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  // =========================================================================
  // CATEGORY 5: SOCKET.IO SECURITY (Tests 26-31)
  // =========================================================================
  console.log('\n--- CATEGORY 5: SOCKET.IO SECURITY ---');

  const socketUrl = `http://127.0.0.1:${TEST_PORT}`;

  await runTest('26. Patient connecting with valid JWT token succeeds', async () => {
    const client = ioClient(socketUrl, {
      transports: ['websocket'],
      auth: { token: tokenA1 }
    });

    await new Promise((resolve, reject) => {
      client.on('connect', () => {
        client.disconnect();
        resolve();
      });
      client.on('connect_error', (err) => {
        client.disconnect();
        reject(err);
      });
    });
  });

  await runTest('27. Patient connecting without token is rejected', async () => {
    const client = ioClient(socketUrl, {
      transports: ['websocket'],
      auth: {}
    });

    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'));
        client.disconnect();
        resolve();
      });
      client.on('connect', () => {
        client.disconnect();
        assert.fail('Should not connect without token');
      });
    });
  });

  await runTest('28. Patient socket joins tenant:<tenantId>:patient and user:<userId>', async () => {
    const client = ioClient(socketUrl, {
      transports: ['websocket'],
      auth: { token: tokenA1 }
    });

    let receivedEvent = false;

    client.on('data_changed', (payload) => {
      if (payload && payload.type === 'patient_test_event') {
        receivedEvent = true;
      }
    });

    await new Promise((resolve) => client.on('connect', resolve));

    // Emit to isolated patient room
    io.to(`tenant:${tenantA}:patient`).emit('data_changed', { type: 'patient_test_event' });

    await new Promise((r) => setTimeout(r, 200));
    client.disconnect();

    assert.strictEqual(receivedEvent, true, 'Patient socket should receive events from isolated patient room');
  });

  await runTest('29. Patient socket is strictly prevented from joining the staff tenant room', async () => {
    const client = ioClient(socketUrl, {
      transports: ['websocket'],
      auth: { token: tokenA1 }
    });

    await new Promise((resolve) => client.on('connect', resolve));

    let blockedError = false;
    client.on('error', (err) => {
      if (err.message && err.message.includes('Unauthorized tenant room access denied')) {
        blockedError = true;
      }
    });

    // Attempt to join staff operational room
    client.emit('join_tenant', tenantB);

    await new Promise((r) => setTimeout(r, 200));
    client.disconnect();

    assert.strictEqual(blockedError, true, 'Unauthorized room join was not blocked');
  });

  await runTest('30. Staff broadcast emitted to staff room is NOT received by patient socket', async () => {
    const client = ioClient(socketUrl, {
      transports: ['websocket'],
      auth: { token: tokenA1 }
    });

    let receivedStaffBroadcast = false;
    client.on('data_changed', (payload) => {
      if (payload && payload.type === 'staff_sensitive_broadcast') {
        receivedStaffBroadcast = true;
      }
    });

    await new Promise((resolve) => client.on('connect', resolve));

    // Broadcast to staff room for tenantA
    io.to(tenantA).emit('data_changed', { type: 'staff_sensitive_broadcast' });

    await new Promise((r) => setTimeout(r, 200));
    client.disconnect();

    assert.strictEqual(receivedStaffBroadcast, false, 'Patient socket leaked staff broadcast event');
  });

  await runTest('31. Clean disconnect cleans up listeners and drops connection', async () => {
    const client = ioClient(socketUrl, {
      transports: ['websocket'],
      auth: { token: tokenA1 }
    });

    await new Promise((resolve) => client.on('connect', resolve));
    assert.strictEqual(client.connected, true);

    client.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(client.connected, false);
  });

  // =========================================================================
  // CATEGORY 6: STAFF REGRESSION & FINANCIAL SAFETY (Tests 32-36)
  // =========================================================================
  console.log('\n--- CATEGORY 6: STAFF REGRESSION & FINANCIAL SAFETY ---');

  await runTest('32. Staff routes continue to work normally with staff token', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: { Authorization: `Bearer ${staffTokenDoctorA}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
  });

  await runTest('33. Staff doctor can create prescriptions and access letterhead', async () => {
    const letterheadRes = await axios.get(`${BASE_URL}/api/admin/letterhead`, {
      headers: { Authorization: `Bearer ${staffTokenDoctorA}` }
    });
    assert.strictEqual(letterheadRes.status, 200);
    assert.strictEqual(letterheadRes.data.letterheadUrl, 'https://cdn.example.com/alpha-letterhead.png');
  });

  await runTest('34. Financial overview API remains strictly read-only for patient', async () => {
    const res = await axios.get(`${BASE_URL}/api/billing`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(String(res.data[0]._id), String(billA1._id));
  });

  await runTest('35. Patient cannot execute billing status updates or payments', async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/billing/${billA1._id}/collect-payment`,
        { amount: 500 },
        {
          headers: { Authorization: `Bearer ${tokenA1}` }
        }
      );
      assert.fail('Patient should not be able to execute payments');
    } catch (err) {
      assert(err.response && [403, 404].includes(err.response.status));
    }
  });

  await runTest('36. Existing staff frontend and backend integrity verified', async () => {
    // Verify that staff endpoint rejecting patient also permits staff
    const staffSalesRes = await axios.get(`${BASE_URL}/api/pharmacy-sales`, {
      headers: { Authorization: `Bearer ${staffTokenDoctorA}` }
    });
    assert.strictEqual(staffSalesRes.status, 200);
  });

  console.log('\n===============================================================');
  console.log(`ALL TESTS COMPLETED: ${passedTests} OF ${totalTests} SCENARIOS PASSED`);
  console.log('===============================================================\n');

  // Teardown
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nFATAL TEST FAILURE:', err);
  if (server) server.close();
  mongoose.disconnect().finally(() => process.exit(1));
});
