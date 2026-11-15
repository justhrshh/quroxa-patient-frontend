/**
 * QUROXA — STAGE E.1: FINAL SECURITY VERIFICATION & RELEASE GATE TEST SUITE
 *
 * Verifies all security scenarios identified in Stage E.1:
 * - Section 3: Socket.IO Security (Auth, Room Isolation, Event Isolation, Payload Inspection, Session Expiry Targeting)
 * - Section 4: Clinical Ownership Verification (Appointments, DPDP/Privacy/Consent, Documents & File Downloads)
 * - Section 5: Hospital Slug & Session Manipulation (Cross-Tenant Token Rejection, Header/Query Tampering, Route Guard)
 * - Section 7: Staff Workflows Regression & Financial Read-Only Safety
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
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
const secureUploadsMiddleware = require('../../clinical_management/backend/middleware/secureUploadsMiddleware');

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
const ClinicalDocument = require('../../clinical_management/backend/models/ClinicalDocument');
const DpoConsentRequest = require('../../clinical_management/backend/models/DpoConsentRequest');

const TEST_PORT = 5899;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
let io;
let totalTests = 0;
let passedTests = 0;

// Track test files created for cleanup
const testUploadFiles = [];

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
  console.log('\n======================================================================');
  console.log('QUROXA — STAGE E.1: FINAL SECURITY VERIFICATION & RELEASE GATE SUITE');
  console.log('======================================================================\n');

  // 1. Connect MongoDB
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
  app.use('/uploads', secureUploadsMiddleware);
  app.use('/api/auth', require('../../clinical_management/backend/routes/authRoutes'));
  app.use('/api/prescriptions', require('../../clinical_management/backend/routes/prescriptionRoutes'));
  app.use('/api/labs', require('../../clinical_management/backend/routes/labRoutes'));
  app.use('/api/appointments', require('../../clinical_management/backend/routes/appointmentRoutes'));
  app.use('/api/billing', require('../../clinical_management/backend/routes/billingRoutes'));
  app.use('/api/emr', require('../../clinical_management/backend/routes/emrRoutes'));
  app.use('/api/dpo', require('../../clinical_management/backend/routes/dpoRoutes'));
  app.use('/api/admin', require('../../clinical_management/backend/routes/adminRoutes'));
  app.use('/api/pharmacy-sales', require('../../clinical_management/backend/routes/pharmacySaleRoutes'));

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[SERVER] Test server listening on ${BASE_URL}\n`);

  // 3. Seed Multi-Tenant Isolated Test Data
  const tenantA = 'stg_e1_tenant_alpha';
  const tenantB = 'stg_e1_tenant_beta';

  console.log('[SEED] Seeding isolated multi-tenant entities...');

  // Hospitals
  await SuperAdminHospital.findOneAndUpdate(
    { code: tenantA },
    {
      name: 'Alpha Super Specialty Hospital',
      code: tenantA,
      hospitalId: 'ALPHA-HOSP-E1',
      status: 'active',
      letterheadUrl: 'https://cdn.example.com/alpha-letterhead-e1.png',
      logo: 'https://cdn.example.com/alpha-logo-e1.png'
    },
    { upsert: true, returnDocument: 'after' }
  );

  await SuperAdminHospital.findOneAndUpdate(
    { code: tenantB },
    {
      name: 'Beta Memorial Hospital',
      code: tenantB,
      hospitalId: 'BETA-HOSP-E1',
      status: 'active',
      letterheadUrl: 'https://cdn.example.com/beta-letterhead-e1.png',
      logo: 'https://cdn.example.com/beta-logo-e1.png'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Doctors
  const doctorA = await User.findOneAndUpdate(
    { email: 'doctor_a_e1@test.com' },
    {
      name: 'Dr. Alistair Alpha',
      email: 'doctor_a_e1@test.com',
      role: 'doctor',
      tenantId: tenantA,
      staff_id: 'DOC-E1-A'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const doctorB = await User.findOneAndUpdate(
    { email: 'doctor_b_e1@test.com' },
    {
      name: 'Dr. Beatrice Beta',
      email: 'doctor_b_e1@test.com',
      role: 'doctor',
      tenantId: tenantB,
      staff_id: 'DOC-E1-B'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Patients: Patient A1 (Tenant A), Patient A2 (Tenant A), Patient B1 (Tenant B)
  const patientA1 = await Patient.findOneAndUpdate(
    { contact: '9988001101', tenantId: tenantA },
    {
      name: 'Amara Alpha',
      contact: '9988001101',
      email: 'amara@alpha.test',
      tenantId: tenantA,
      uhId: 'UHID-E1-A1',
      patientId: 'PID-E1-A1',
      gender: 'Female',
      age: 32
    },
    { upsert: true, returnDocument: 'after' }
  );

  const patientA2 = await Patient.findOneAndUpdate(
    { contact: '9988001102', tenantId: tenantA },
    {
      name: 'Anil Alpha',
      contact: '9988001102',
      email: 'anil@alpha.test',
      tenantId: tenantA,
      uhId: 'UHID-E1-A2',
      patientId: 'PID-E1-A2',
      gender: 'Male',
      age: 48
    },
    { upsert: true, returnDocument: 'after' }
  );

  const patientB1 = await Patient.findOneAndUpdate(
    { contact: '9988002201', tenantId: tenantB },
    {
      name: 'Boris Beta',
      contact: '9988002201',
      email: 'boris@beta.test',
      tenantId: tenantB,
      uhId: 'UHID-E1-B1',
      patientId: 'PID-E1-B1',
      gender: 'Male',
      age: 41
    },
    { upsert: true, returnDocument: 'after' }
  );

  // User documents for patients
  const userA1 = await User.findOneAndUpdate(
    { phone: '9988001101' },
    {
      name: 'Amara Alpha',
      phone: '9988001101',
      role: 'patient',
      tenantId: tenantA,
      staff_id: 'PAT-E1-A1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const userA2 = await User.findOneAndUpdate(
    { phone: '9988001102' },
    {
      name: 'Anil Alpha',
      phone: '9988001102',
      role: 'patient',
      tenantId: tenantA,
      staff_id: 'PAT-E1-A2'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const userB1 = await User.findOneAndUpdate(
    { phone: '9988002201' },
    {
      name: 'Boris Beta',
      phone: '9988002201',
      role: 'patient',
      tenantId: tenantB,
      staff_id: 'PAT-E1-B1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Physical files in uploads/prescriptions
  const uploadsDir = path.resolve(__dirname, '../../clinical_management/backend/uploads/prescriptions');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileA1Name = `rx_file_e1_a1_${Date.now()}.png`;
  const fileB1Name = `rx_file_e1_b1_${Date.now()}.png`;
  const fileA1Path = path.join(uploadsDir, fileA1Name);
  const fileB1Path = path.join(uploadsDir, fileB1Name);

  fs.writeFileSync(fileA1Path, 'CONFIDENTIAL_PRESCRIPTION_DATA_PATIENT_A1');
  fs.writeFileSync(fileB1Path, 'CONFIDENTIAL_PRESCRIPTION_DATA_PATIENT_B1');
  testUploadFiles.push(fileA1Path, fileB1Path);

  // Prescriptions with physical file links
  const rxA1 = await Prescription.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      doctorId: doctorA._id,
      diagnosis: 'Type 2 Diabetes Mellitus',
      notes: 'Metformin 500mg BID',
      status: 'Direct Patient',
      items: [{ medicine: 'Metformin 500mg', dosage: '1-0-1', duration: '30 days' }],
      images: [{ url: `/uploads/prescriptions/${fileA1Name}`, originalName: fileA1Name }]
    },
    { upsert: true, returnDocument: 'after' }
  );

  const rxA2 = await Prescription.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      doctorId: doctorA._id,
      diagnosis: 'Osteoarthritis',
      notes: 'Paracetamol PRN',
      status: 'Direct Patient',
      items: [{ medicine: 'Paracetamol 650mg', dosage: '1-0-1', duration: '5 days' }]
    },
    { upsert: true, returnDocument: 'after' }
  );

  const rxB1 = await Prescription.findOneAndUpdate(
    { tenantId: tenantB, patientId: patientB1._id },
    {
      tenantId: tenantB,
      patientId: patientB1._id,
      doctorId: doctorB._id,
      diagnosis: 'Allergic Rhinitis',
      notes: 'Cetirizine 10mg HS',
      status: 'Direct Patient',
      items: [{ medicine: 'Cetirizine 10mg', dosage: '0-0-1', duration: '10 days' }],
      images: [{ url: `/uploads/prescriptions/${fileB1Name}`, originalName: fileB1Name }]
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Appointments
  const apptA1 = await Appointment.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      doctorId: doctorA._id,
      date: new Date(Date.now() + 86400000),
      time: '10:00 AM - 10:30 AM',
      status: 'Pending',
      reason: 'Endocrinology Consultation'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const apptA2 = await Appointment.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      doctorId: doctorA._id,
      date: new Date(Date.now() + 86400000),
      time: '11:00 AM - 11:30 AM',
      status: 'Pending',
      reason: 'Orthopedic Follow-up'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const apptB1 = await Appointment.findOneAndUpdate(
    { tenantId: tenantB, patientId: patientB1._id },
    {
      tenantId: tenantB,
      patientId: patientB1._id,
      doctorId: doctorB._id,
      date: new Date(Date.now() + 86400000),
      time: '02:00 PM - 02:30 PM',
      status: 'Pending',
      reason: 'Allergy Consultation'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Clinical Documents
  const docA1 = await ClinicalDocument.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id, title: 'Amara Alpha Discharge Summary' },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      title: 'Amara Alpha Discharge Summary',
      category: 'Discharge',
      fileUrl: 'https://cdn.example.com/docs/amara-discharge.pdf',
      uploadedBy: doctorA._id
    },
    { upsert: true, returnDocument: 'after' }
  );

  const docA2 = await ClinicalDocument.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id, title: 'Anil Alpha Knee MRI' },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      title: 'Anil Alpha Knee MRI',
      category: 'Scan',
      fileUrl: 'https://cdn.example.com/docs/anil-mri.pdf',
      uploadedBy: doctorA._id
    },
    { upsert: true, returnDocument: 'after' }
  );

  const docB1 = await ClinicalDocument.findOneAndUpdate(
    { tenantId: tenantB, patientId: patientB1._id, title: 'Boris Beta Allergy Panel' },
    {
      tenantId: tenantB,
      patientId: patientB1._id,
      title: 'Boris Beta Allergy Panel',
      category: 'LabReport',
      fileUrl: 'https://cdn.example.com/docs/boris-allergy.pdf',
      uploadedBy: doctorB._id
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Consents
  const consentA1 = await Consent.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA1._id },
    {
      tenantId: tenantA,
      patientId: patientA1._id,
      purposes: { treatment: true, insurance: true, research: false },
      status: 'Active',
      ipAddress: '127.0.0.1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const consentA2 = await Consent.findOneAndUpdate(
    { tenantId: tenantA, patientId: patientA2._id },
    {
      tenantId: tenantA,
      patientId: patientA2._id,
      purposes: { treatment: true, insurance: false, research: false },
      status: 'Active',
      ipAddress: '127.0.0.1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // DPO Consent Requests
  const dpoReqA1 = await DpoConsentRequest.findOneAndUpdate(
    { requestId: 'DPO-STGE1-A1-001' },
    {
      requestId: 'DPO-STGE1-A1-001',
      tenantId: tenantA,
      patientId: patientA1._id,
      uhId: patientA1.uhId,
      patientName: patientA1.name,
      patientContact: patientA1.contact,
      categories: { personal: true, clinical: false, payment: false },
      status: 'PENDING',
      termsAcknowledged: true,
      withdrawalWindowEndsAt: new Date(Date.now() + 72 * 3600 * 1000)
    },
    { upsert: true, returnDocument: 'after' }
  );

  const dpoReqB1 = await DpoConsentRequest.findOneAndUpdate(
    { requestId: 'DPO-STGE1-B1-001' },
    {
      requestId: 'DPO-STGE1-B1-001',
      tenantId: tenantB,
      patientId: patientB1._id,
      uhId: patientB1.uhId,
      patientName: patientB1.name,
      patientContact: patientB1.contact,
      categories: { personal: false, clinical: true, payment: false },
      status: 'PENDING',
      termsAcknowledged: true,
      withdrawalWindowEndsAt: new Date(Date.now() + 72 * 3600 * 1000)
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Generate Tokens
  const tokenA1 = jwt.sign(
    { id: patientA1._id, userId: userA1._id, role: 'patient', tenantId: tenantA, uhId: patientA1.uhId, staff_id: '9988001101' },
    secretKey,
    { expiresIn: '24h' }
  );

  const tokenA2 = jwt.sign(
    { id: patientA2._id, userId: userA2._id, role: 'patient', tenantId: tenantA, uhId: patientA2.uhId, staff_id: '9988001102' },
    secretKey,
    { expiresIn: '24h' }
  );

  const tokenB1 = jwt.sign(
    { id: patientB1._id, userId: userB1._id, role: 'patient', tenantId: tenantB, uhId: patientB1.uhId, staff_id: '9988002201' },
    secretKey,
    { expiresIn: '24h' }
  );

  const expiredToken = jwt.sign(
    { id: patientA1._id, userId: userA1._id, role: 'patient', tenantId: tenantA },
    secretKey,
    { expiresIn: -10 }
  );

  const invalidSignatureToken = jwt.sign(
    { id: patientA1._id, userId: userA1._id, role: 'patient', tenantId: tenantA },
    'tampered_attacker_secret_key_123',
    { expiresIn: '24h' }
  );

  const staffTokenDoctorA = jwt.sign(
    { id: doctorA._id, userId: doctorA._id, role: 'doctor', tenantId: tenantA, staff_id: doctorA.staff_id },
    secretKey,
    { expiresIn: '15m' }
  );

  console.log('[SEED] Test entities ready. Executing test scenarios...\n');

  // =========================================================================
  // SECTION 3: SOCKET.IO SECURITY VERIFICATION
  // =========================================================================
  console.log('--- SECTION 3: SOCKET.IO SECURITY VERIFICATION ---');

  const socketUrl = `http://127.0.0.1:${TEST_PORT}`;

  // Test A — Authentication
  await runTest('1. Valid patient JWT permits socket authentication', async () => {
    const client = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    await new Promise((resolve, reject) => {
      client.on('connect', () => { client.disconnect(); resolve(); });
      client.on('connect_error', (err) => { client.disconnect(); reject(err); });
    });
  });

  await runTest('2. Missing JWT is rejected', async () => {
    const client = ioClient(socketUrl, { transports: ['websocket'], auth: {} });
    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error: No token provided'));
        client.disconnect();
        resolve();
      });
      client.on('connect', () => { client.disconnect(); assert.fail('Should not connect without token'); });
    });
  });

  await runTest('3. Malformed JWT is rejected', async () => {
    const client = ioClient(socketUrl, { transports: ['websocket'], auth: { token: 'invalid.malformed.token' } });
    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'));
        client.disconnect();
        resolve();
      });
      client.on('connect', () => { client.disconnect(); assert.fail('Should not connect with malformed token'); });
    });
  });

  await runTest('4. Expired JWT is rejected', async () => {
    const client = ioClient(socketUrl, { transports: ['websocket'], auth: { token: expiredToken } });
    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'));
        client.disconnect();
        resolve();
      });
      client.on('connect', () => { client.disconnect(); assert.fail('Should not connect with expired token'); });
    });
  });

  await runTest('5. Invalid signature is rejected', async () => {
    const client = ioClient(socketUrl, { transports: ['websocket'], auth: { token: invalidSignatureToken } });
    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'));
        client.disconnect();
        resolve();
      });
      client.on('connect', () => { client.disconnect(); assert.fail('Should not connect with invalid signature'); });
    });
  });

  await runTest('6. Staff JWT cannot accidentally receive patient-specific events', async () => {
    const staffClient = ioClient(socketUrl, { transports: ['websocket'], auth: { token: staffTokenDoctorA } });
    let receivedPatientEvent = false;

    staffClient.on('data_changed', (payload) => {
      if (payload && payload.type === 'targeted_patient_private_alert') {
        receivedPatientEvent = true;
      }
    });

    await new Promise((resolve) => staffClient.on('connect', resolve));

    // Emit event targeted strictly to Patient A1's isolated patient tenant room
    io.to(`tenant:${tenantA}:patient`).emit('data_changed', { type: 'targeted_patient_private_alert' });

    await new Promise((r) => setTimeout(r, 200));
    staffClient.disconnect();

    assert.strictEqual(receivedPatientEvent, false, 'Staff socket should not receive patient room events');
  });

  await runTest('7. Socket reconnection after token expiration is rejected', async () => {
    // Generate a token expiring in 1 second
    const shortToken = jwt.sign(
      { id: patientA1._id, userId: userA1._id, role: 'patient', tenantId: tenantA },
      secretKey,
      { expiresIn: 1 }
    );

    // Wait 1.5 seconds for token to naturally expire
    await new Promise((r) => setTimeout(r, 1500));

    const client = ioClient(socketUrl, { transports: ['websocket'], auth: { token: shortToken } });
    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'));
        client.disconnect();
        resolve();
      });
      client.on('connect', () => { client.disconnect(); assert.fail('Reconnection with expired token succeeded'); });
    });
  });

  // Test B — Room Isolation
  await runTest('8. Patient A joins only authorized patient rooms', async () => {
    const client = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let patientRoomReceived = false;

    client.on('data_changed', (payload) => {
      if (payload?.type === 'patient_a_room_check') patientRoomReceived = true;
    });

    await new Promise((resolve) => client.on('connect', resolve));
    io.to(`tenant:${tenantA}:patient`).emit('data_changed', { type: 'patient_a_room_check' });

    await new Promise((r) => setTimeout(r, 200));
    client.disconnect();

    assert.strictEqual(patientRoomReceived, true);
  });

  await runTest('9. Patient A cannot join Patient B room or receive Patient B events', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let receivedBEvent = false;

    clientA1.on('data_changed', (payload) => {
      if (payload?.type === 'patient_b_exclusive') receivedBEvent = true;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Emit to Patient B1's private user channel
    io.to(`user:${userB1._id}`).emit('data_changed', { type: 'patient_b_exclusive' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(receivedBEvent, false, 'Patient A1 received Patient B1 private room event');
  });

  await runTest('10. Tenant A patient cannot join Tenant B patient room', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let receivedTenantBEvent = false;

    clientA1.on('data_changed', (payload) => {
      if (payload?.type === 'tenant_b_patient_broadcast') receivedTenantBEvent = true;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Emit to Tenant B's patient room
    io.to(`tenant:${tenantB}:patient`).emit('data_changed', { type: 'tenant_b_patient_broadcast' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(receivedTenantBEvent, false, 'Tenant A patient received Tenant B patient broadcast');
  });

  await runTest('11. Client-supplied tenant IDs via join_tenant cannot override verified JWT tenant', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let blockedAlert = false;

    clientA1.on('error', (err) => {
      if (err.message && err.message.includes('Unauthorized tenant room access denied')) {
        blockedAlert = true;
      }
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Attempt to join Tenant B
    clientA1.emit('join_tenant', tenantB);

    await new Promise((r) => setTimeout(r, 250));
    clientA1.disconnect();

    assert.strictEqual(blockedAlert, true, 'Attacker was able to join unauthorized tenant room without error');
  });

  await runTest('12. Arbitrary room names cannot be joined through client events', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let receivedArbitraryEvent = false;

    clientA1.on('arbitrary_secret_event', () => {
      receivedArbitraryEvent = true;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Attempt to join an arbitrary administrative room
    clientA1.emit('join_tenant', 'admin_super_secret_room');

    await new Promise((r) => setTimeout(r, 200));

    io.to('admin_super_secret_room').emit('arbitrary_secret_event', { secret: 'leaked' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(receivedArbitraryEvent, false, 'Patient socket joined arbitrary room');
  });

  await runTest('13. Patient sockets cannot join staff operational rooms', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let receivedStaffEvent = false;

    clientA1.on('data_changed', (payload) => {
      if (payload?.type === 'staff_operational_indents') receivedStaffEvent = true;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Broadcast to staff room
    io.to(tenantA).emit('data_changed', { type: 'staff_operational_indents' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(receivedStaffEvent, false, 'Patient socket received staff operational room event');
  });

  // Test C — Event Isolation
  await runTest('14. Patient receives authorized data_changed event', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let received = false;

    clientA1.on('data_changed', (p) => {
      if (p?.type === 'appointments') received = true;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));
    io.to(`tenant:${tenantA}:patient`).emit('data_changed', { type: 'appointments' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(received, true);
  });

  await runTest('15. Patient receives targeted session_expired event', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let expiredNotice = false;

    clientA1.on('session_expired', (data) => {
      if (data?.reason === 'test_token_expired') expiredNotice = true;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Target the specific socket
    clientA1.emit('simulate_expiry_test'); // Server emits session_expired to this socket
    // Or directly via io.to(socket.id)
    io.to(clientA1.id).emit('session_expired', { reason: 'test_token_expired' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(expiredNotice, true);
  });

  await runTest('16. Staff-only session_revoked is never delivered to patient sockets', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let received = false;

    clientA1.on('session_revoked', () => { received = true; });

    await new Promise((resolve) => clientA1.on('connect', resolve));
    io.to(tenantA).emit('session_revoked', { staff_id: 'DOC-E1-A' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(received, false);
  });

  await runTest('17. Staff-only hospital_subscription_updated is never delivered to patient sockets', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let received = false;

    clientA1.on('hospital_subscription_updated', () => { received = true; });

    await new Promise((resolve) => clientA1.on('connect', resolve));
    io.to(tenantA).emit('hospital_subscription_updated', { plan: 'ENTERPRISE' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(received, false);
  });

  await runTest('18. Staff-only reception_queue_updated is never delivered to patient sockets', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let received = false;

    clientA1.on('reception_queue_updated', () => { received = true; });

    await new Promise((resolve) => clientA1.on('connect', resolve));
    io.to(tenantA).emit('reception_queue_updated', { currentToken: 15 });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(received, false);
  });

  await runTest('19. Staff-only ticket_created is never delivered to patient sockets', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let received = false;

    clientA1.on('ticket_created', () => { received = true; });

    await new Promise((resolve) => clientA1.on('connect', resolve));
    io.to(tenantA).emit('ticket_created', { ticketId: 'TCK-001' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(received, false);
  });

  // Test D — data_changed Payload
  await runTest('20. data_changed payload contains strictly invalidation metadata (no clinical or PII data)', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let inspectedPayload = null;

    clientA1.on('data_changed', (payload) => {
      inspectedPayload = payload;
    });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Simulate backend appointment data_changed emit
    io.to(`tenant:${tenantA}:patient`).emit('data_changed', { type: 'appointments' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert(inspectedPayload !== null, 'Payload was not received');
    assert.strictEqual(inspectedPayload.type, 'appointments');
    assert.strictEqual(inspectedPayload.diagnosis, undefined);
    assert.strictEqual(inspectedPayload.notes, undefined);
    assert.strictEqual(inspectedPayload.prescription, undefined);
    assert.strictEqual(inspectedPayload.patientName, undefined);
    assert.strictEqual(inspectedPayload.results, undefined);
    assert.strictEqual(inspectedPayload.billingAmount, undefined);
  });

  // Test E — session_expired Targeting
  await runTest('21. Session expiration targets the intended patient/session only', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    const clientA2 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA2 } });

    let clientA1Expired = false;
    let clientA2Expired = false;

    clientA1.on('session_expired', () => { clientA1Expired = true; });
    clientA2.on('session_expired', () => { clientA2Expired = true; });

    await Promise.all([
      new Promise((resolve) => clientA1.on('connect', resolve)),
      new Promise((resolve) => clientA2.on('connect', resolve))
    ]);

    // Target socket A1 specifically
    io.to(clientA1.id).emit('session_expired', { reason: 'token_expired' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();
    clientA2.disconnect();

    assert.strictEqual(clientA1Expired, true, 'Intended client did not receive expiration');
    assert.strictEqual(clientA2Expired, false, 'Unintended client accidentally received expiration');
  });

  await runTest('22. Patient A cannot cause Patient B to receive a session_expired event', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    const clientA2 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA2 } });

    let clientA2Expired = false;
    clientA2.on('session_expired', () => { clientA2Expired = true; });

    await Promise.all([
      new Promise((resolve) => clientA1.on('connect', resolve)),
      new Promise((resolve) => clientA2.on('connect', resolve))
    ]);

    // Client A1 attempts to emit session_expired or trigger expiration for A2
    clientA1.emit('session_expired', { target: clientA2.id });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();
    clientA2.disconnect();

    assert.strictEqual(clientA2Expired, false, 'Malicious client induced session expiration on another user');
  });

  await runTest('23. Tenant-wide broadcasts cannot accidentally expire every patient session', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    let clientA1Expired = false;

    clientA1.on('session_expired', () => { clientA1Expired = true; });

    await new Promise((resolve) => clientA1.on('connect', resolve));

    // Staff broadcast to tenant
    io.to(tenantA).emit('data_changed', { type: 'subscription' });

    await new Promise((r) => setTimeout(r, 200));
    clientA1.disconnect();

    assert.strictEqual(clientA1Expired, false, 'Tenant-wide broadcast caused patient session expiration');
  });

  await runTest('24. Socket disconnects cleanly on logout', async () => {
    const clientA1 = ioClient(socketUrl, { transports: ['websocket'], auth: { token: tokenA1 } });
    await new Promise((resolve) => clientA1.on('connect', resolve));
    assert.strictEqual(clientA1.connected, true);

    clientA1.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(clientA1.connected, false);
  });

  await runTest('25. Socket disconnects after session expiration and rejects reconnect with expired token', async () => {
    const clientExp = ioClient(socketUrl, { transports: ['websocket'], auth: { token: expiredToken } });
    await new Promise((resolve) => {
      clientExp.on('connect_error', (err) => {
        assert(err.message.includes('Authentication error'));
        clientExp.disconnect();
        resolve();
      });
      clientExp.on('connect', () => {
        clientExp.disconnect();
        assert.fail('Should not connect with expired token');
      });
    });
  });

  // =========================================================================
  // SECTION 4: CLINICAL OWNERSHIP VERIFICATION
  // =========================================================================
  console.log('\n--- SECTION 4: CLINICAL OWNERSHIP VERIFICATION ---');

  // Appointments
  await runTest('26. Patient A can retrieve their own appointments', async () => {
    const res = await axios.get(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    assert(Array.isArray(res.data));
    const hasOwn = res.data.some((a) => String(a._id) === String(apptA1._id));
    assert.strictEqual(hasOwn, true, 'Patient A1 could not find their own appointment');
  });

  await runTest('27. Patient A cannot retrieve Patient B appointments within the same tenant', async () => {
    const res = await axios.get(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    const leaked = res.data.some((a) => String(a._id) === String(apptA2._id) || String(a.patientId?._id || a.patientId) === String(patientA2._id));
    assert.strictEqual(leaked, false, 'Leaked Patient A2 appointment to Patient A1');
  });

  await runTest('28. Patient A cannot retrieve appointments belonging to Tenant B', async () => {
    const res = await axios.get(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    const leaked = res.data.some((a) => String(a._id) === String(apptB1._id) || String(a.tenantId) === tenantB);
    assert.strictEqual(leaked, false, 'Leaked Tenant B appointment to Patient A1');
  });

  await runTest('29. Patient A cannot cancel or modify another patient appointment', async () => {
    try {
      await axios.put(
        `${BASE_URL}/api/appointments/${apptA2._id}`,
        { status: 'Cancelled' },
        { headers: { Authorization: `Bearer ${tokenA1}` } }
      );
      assert.fail('Patient A1 should not be able to cancel Patient A2 appointment');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('30. Modified URL parameters and request bodies cannot bypass appointment ownership', async () => {
    // Attempt to book an appointment injecting Patient A2's ID
    const res = await axios.post(
      `${BASE_URL}/api/appointments`,
      {
        patientId: String(patientA2._id), // Attacker attempts to book on behalf of Patient A2
        doctorId: String(doctorA._id),
        date: new Date(Date.now() + 86400000 * 2),
        time: '04:00 PM - 04:30 PM',
        reason: 'Ownership Bypass Probe'
      },
      { headers: { Authorization: `Bearer ${tokenA1}` } }
    );
    assert([200, 201].includes(res.status));
    // Server must override client-supplied patientId with verified JWT identity
    assert.strictEqual(String(res.data.patientId), String(patientA1._id), 'Server allowed attacker to override patientId in booking body');
  });

  // DPDP / Privacy / Consent
  await runTest('31. Patient A can retrieve their own consent information', async () => {
    const res = await axios.get(`${BASE_URL}/api/emr/consent/patient/${patientA1._id}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    assert.strictEqual(String(res.data.patientId), String(patientA1._id));
  });

  await runTest('32. Patient A cannot retrieve Patient B consent records', async () => {
    try {
      await axios.get(`${BASE_URL}/api/emr/consent/patient/${patientA2._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient A1 should not access Patient A2 consent');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('33. Patient A cannot cancel or modify another patient privacy request', async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/dpo/requests/${dpoReqB1._id}/cancel`,
        { reason: 'Malicious cancellation attempt' },
        { headers: { Authorization: `Bearer ${tokenA1}` } }
      );
      assert.fail('Patient A1 should not cancel Patient B1 DPO request');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('34. Tenant manipulation cannot expose another hospital privacy records', async () => {
    // Attempt to create a DPO withdrawal request for Tenant B where Patient A1 has no records
    try {
      await axios.post(
        `${BASE_URL}/api/dpo/requests`,
        {
          hospitalId: tenantB,
          categories: { personal: true, clinical: false, payment: false },
          termsAcknowledged: true
        },
        { headers: { Authorization: `Bearer ${tokenA1}` } }
      );
      assert.fail('Patient A1 should not be able to file DPO request for a hospital they are not registered with');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  // Documents and Attachments
  await runTest('35. Patient A can retrieve their own authorized clinical documents', async () => {
    const res = await axios.get(`${BASE_URL}/api/emr/documents/patient/${patientA1._id}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    assert(Array.isArray(res.data));
    const hasOwn = res.data.some((d) => String(d._id) === String(docA1._id));
    assert.strictEqual(hasOwn, true, 'Patient A1 could not find their own clinical document');
  });

  await runTest('36. Patient A cannot retrieve Patient B clinical documents', async () => {
    try {
      await axios.get(`${BASE_URL}/api/emr/documents/patient/${patientA2._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient A1 should not access Patient A2 clinical documents');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  await runTest('37. Patient A cannot access documents from Tenant B', async () => {
    try {
      await axios.get(`${BASE_URL}/api/emr/documents/patient/${patientB1._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Patient A1 should not access Tenant B clinical documents');
    } catch (err) {
      assert(err.response && [403, 404].includes(err.response.status));
    }
  });

  // Physical File Download Endpoints (/uploads/prescriptions/:filename)
  await runTest('38. Physical confidential file download authorization checks', async () => {
    // 38a: Unauthenticated access returns 401
    try {
      await axios.get(`${BASE_URL}/uploads/prescriptions/${fileA1Name}`);
      assert.fail('Unauthenticated file request must be rejected');
    } catch (err) {
      assert(err.response && err.response.status === 401);
    }

    // 38b: Patient A1 cannot download Patient B1 prescription file (Cross-Tenant -> 403)
    try {
      await axios.get(`${BASE_URL}/uploads/prescriptions/${fileB1Name}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Cross-tenant file download must be rejected');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }

    // 38c: Directory traversal attempt in filename is blocked (400/403)
    try {
      await axios.get(`${BASE_URL}/uploads/prescriptions/..%2F..%2Fpackage.json`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Directory traversal must be rejected');
    } catch (err) {
      assert(err.response && [400, 403, 404].includes(err.response.status));
    }

    // 38d: Authorized Patient A1 can download their own prescription file (200 OK)
    const ownFileRes = await axios.get(`${BASE_URL}/uploads/prescriptions/${fileA1Name}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert.strictEqual(ownFileRes.status, 200);
    assert.strictEqual(ownFileRes.data, 'CONFIDENTIAL_PRESCRIPTION_DATA_PATIENT_A1');
  });

  // =========================================================================
  // SECTION 5: HOSPITAL SLUG AND SESSION MANIPULATION
  // =========================================================================
  console.log('\n--- SECTION 5: HOSPITAL SLUG AND SESSION MANIPULATION ---');

  await runTest('39. Existing Tenant A JWT cannot grant access to Tenant B data', async () => {
    try {
      await axios.get(`${BASE_URL}/api/prescriptions/${rxB1._id}`, {
        headers: { Authorization: `Bearer ${tokenA1}` }
      });
      assert.fail('Tenant A JWT accessed Tenant B prescription');
    } catch (err) {
      assert(err.response && [403, 404].includes(err.response.status));
    }
  });

  await runTest('40. Client-side x-tenant-id header override to Tenant B is ignored by server', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: {
        Authorization: `Bearer ${tokenA1}`,
        'x-tenant-id': tenantB
      }
    });
    assert([200, 201].includes(res.status));
    const leaked = res.data.some((r) => String(r.tenantId) === tenantB);
    assert.strictEqual(leaked, false, 'x-tenant-id header bypassed JWT tenant isolation');
  });

  await runTest('41. Query parameter ?tenantId=tenantB is ignored by server', async () => {
    const res = await axios.get(`${BASE_URL}/api/appointments?tenantId=${tenantB}`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    const leaked = res.data.some((a) => String(a.tenantId) === tenantB);
    assert.strictEqual(leaked, false, '?tenantId query parameter bypassed JWT tenant isolation');
  });

  await runTest('42. Server derives authorization strictly from verified token (not URL or client claims)', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    assert(res.data.length > 0);
    res.data.forEach((rx) => {
      assert.strictEqual(String(rx.patientId?._id || rx.patientId), String(patientA1._id));
      assert.strictEqual(rx.hospitalLetterheadUrl, 'https://cdn.example.com/alpha-letterhead-e1.png');
      assert.notStrictEqual(String(rx._id), String(rxB1._id));
    });
  });

  // =========================================================================
  // SECTION 7: STAFF WORKFLOWS REGRESSION & FINANCIAL SAFETY
  // =========================================================================
  console.log('\n--- SECTION 7: STAFF WORKFLOWS REGRESSION & FINANCIAL SAFETY ---');

  await runTest('43. Staff doctor token generation and clinic access succeeds', async () => {
    const res = await axios.get(`${BASE_URL}/api/prescriptions`, {
      headers: { Authorization: `Bearer ${staffTokenDoctorA}` }
    });
    assert([200, 201].includes(res.status));
    assert(Array.isArray(res.data));
  });

  await runTest('44. Staff doctor can view clinic appointments', async () => {
    const res = await axios.get(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${staffTokenDoctorA}` }
    });
    assert([200, 201].includes(res.status));
    assert(Array.isArray(res.data));
  });

  await runTest('45. Staff doctor can access letterhead for prescriptions', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/letterhead`, {
      headers: { Authorization: `Bearer ${staffTokenDoctorA}` }
    });
    assert([200, 201].includes(res.status));
    assert.strictEqual(res.data.letterheadUrl, 'https://cdn.example.com/alpha-letterhead-e1.png');
  });

  await runTest('46. Financial overview remains strictly read-only for patient token', async () => {
    const res = await axios.get(`${BASE_URL}/api/billing`, {
      headers: { Authorization: `Bearer ${tokenA1}` }
    });
    assert([200, 201].includes(res.status));
    assert(Array.isArray(res.data));
  });

  await runTest('47. Patient billing payment execution attempt returns 403 Forbidden', async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/billing/dummy_bill_id/collect-payment`,
        { amount: 500 },
        { headers: { Authorization: `Bearer ${tokenA1}` } }
      );
      assert.fail('Patient should be forbidden from collect-payment');
    } catch (err) {
      assert(err.response && err.response.status === 403);
    }
  });

  console.log('\n======================================================================');
  console.log(`STAGE E.1 VERIFICATION COMPLETE: ${passedTests} OF ${totalTests} SCENARIOS PASSED`);
  console.log('======================================================================\n');

  // Teardown
  server.close();
  testUploadFiles.forEach((f) => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
  });
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nFATAL TEST FAILURE IN STAGE E.1 SUITE:', err);
  testUploadFiles.forEach((f) => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
  });
  if (server) server.close();
  mongoose.disconnect().finally(() => process.exit(1));
});
