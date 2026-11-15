/**
 * QUROXA — Stage E.1 Browser Journey Backend Server
 * 
 * Runs a standalone Express + Socket.IO server on port 5000 to power
 * the real Playwright browser journey test.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Point module resolution to backend node_modules
const backendModules = path.join(__dirname, '../../clinical_management/backend/node_modules');
module.paths.push(backendModules);

const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

require('dotenv').config({ path: path.join(__dirname, '../../clinical_management/backend/.env') });

const connectDB = require('../../clinical_management/backend/config/db');
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

const PORT = 5000;

async function startServer() {
  await connectDB();
  console.log('[JOURNEY_SERVER] MongoDB Atlas Connected.');

  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
  });

  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    configureSocketTenantIsolation(io, socket);
  });
  app.set('io', io);

  // Mount routes
  app.use('/uploads', secureUploadsMiddleware);
  app.use('/api/public/portal', require('../../clinical_management/backend/routes/portalRoutes'));
  app.use('/api/auth', require('../../clinical_management/backend/routes/authRoutes'));
  app.use('/api/patients', require('../../clinical_management/backend/routes/patientRoutes'));
  app.use('/api/appointments', require('../../clinical_management/backend/routes/appointmentRoutes'));
  app.use('/api/prescriptions', require('../../clinical_management/backend/routes/prescriptionRoutes'));
  app.use('/api/labs', require('../../clinical_management/backend/routes/labRoutes'));
  app.use('/api/emr', require('../../clinical_management/backend/routes/emrRoutes'));
  app.use('/api/billing', require('../../clinical_management/backend/routes/billingRoutes'));
  app.use('/api/dpo', require('../../clinical_management/backend/routes/dpoRoutes'));
  app.use('/api/admin', require('../../clinical_management/backend/routes/adminRoutes'));
  app.use('/api/pharmacy-sales', require('../../clinical_management/backend/routes/pharmacySaleRoutes'));

  // Seed journey hospital and patient data
  const tenantCode = 'test_journey_hosp';

  await SuperAdminHospital.findOneAndUpdate(
    { code: tenantCode },
    {
      name: 'Journey City Hospital',
      code: tenantCode,
      hospitalId: 'JOURNEY-CITY',
      status: 'active',
      letterheadUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=60',
      logo: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=200&auto=format&fit=crop&q=60',
      address: '742 Evergreen Terrace, Medical District, Delhi',
      phone: '+91 98765 43210',
      gst: '07AAAAA0000A1Z5'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const doctor = await User.findOneAndUpdate(
    { email: 'dr_journey@hospital.test' },
    {
      name: 'Dr. Ramesh Kumar',
      email: 'dr_journey@hospital.test',
      role: 'doctor',
      specialty: 'Internal Medicine',
      department: 'General OPD',
      tenantId: tenantCode,
      staff_id: 'DOC-JRN-01',
      password_hash: 'HASH_123'
    },
    { upsert: true, returnDocument: 'after' }
  );

  const patient = await Patient.findOneAndUpdate(
    { contact: '9988001101', tenantId: tenantCode },
    {
      name: 'Amara Alpha',
      contact: '9988001101',
      email: 'amara@alpha.test',
      tenantId: tenantCode,
      uhId: 'UHID-JRN-001',
      patientId: 'PID-JRN-001',
      gender: 'Female',
      age: 32,
      bloodGroup: 'B+'
    },
    { upsert: true, returnDocument: 'after' }
  );

  await User.findOneAndUpdate(
    { phone: '9988001101' },
    {
      name: 'Amara Alpha',
      phone: '9988001101',
      email: 'amara@alpha.test',
      role: 'patient',
      tenantId: tenantCode,
      staff_id: 'PAT-JRN-001',
      password_hash: 'PATIENT_OTP_AUTH'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Appointment
  await Appointment.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      doctorId: doctor._id,
      date: new Date(Date.now() + 86400000 * 2),
      time: '10:00 AM - 10:30 AM',
      status: 'Confirmed',
      reason: 'Routine Health Checkup',
      tokenNumber: 4
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Prescription
  await Prescription.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      doctorId: doctor._id,
      diagnosis: 'Mild Dyspepsia & Fatigue',
      notes: 'Take Pantoprazole before breakfast. Hydrate well.',
      status: 'Direct Patient',
      items: [
        { medicine: 'Pantoprazole 40mg', dosage: '1-0-0', duration: '14 days' },
        { medicine: 'Multivitamin Gold', dosage: '0-1-0', duration: '30 days' }
      ]
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Lab Request
  await LabRequest.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      doctorId: doctor._id,
      testName: 'Complete Blood Count (CBC) with ESR',
      status: 'Completed',
      results: 'Hemoglobin: 13.5 g/dL (Normal). Platelets: 280,000 /mcL.'
    },
    { upsert: true, returnDocument: 'after' }
  );

  // EMR Visit
  await Visit.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      doctorId: doctor._id,
      visitId: 'VISIT-JRN-001',
      complaint: 'Acidity and post-meal fullness for 1 week',
      diagnosis: 'Acute Gastritis',
      doctorNotes: 'Dietary adjustments advised. Avoid spicy food.',
      vitals: { pulse: 74, temperature: 98.4, bpSystolic: 120, bpDiastolic: 80 }
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Clinical Document
  await ClinicalDocument.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id, title: 'Annual Health Evaluation Summary' },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      title: 'Annual Health Evaluation Summary',
      category: 'Discharge',
      fileUrl: 'https://cdn.example.com/docs/annual-health-eval.pdf',
      uploadedBy: doctor._id
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Billing (Read-Only)
  await Billing.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      billNumber: 'INV-JRN-2026-001',
      totalAmount: 850,
      paidAmount: 850,
      balanceAmount: 0,
      status: 'Paid',
      items: [
        { description: 'OPD Consultation Fee', amount: 500 },
        { description: 'Complete Blood Count Test', amount: 350 }
      ]
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Consent
  await Consent.findOneAndUpdate(
    { tenantId: tenantCode, patientId: patient._id },
    {
      tenantId: tenantCode,
      patientId: patient._id,
      purposes: { treatment: true, insurance: true, research: false },
      status: 'Active',
      ipAddress: '127.0.0.1'
    },
    { upsert: true, returnDocument: 'after' }
  );

  server.listen(PORT, () => {
    console.log(`[JOURNEY_SERVER] Live on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[JOURNEY_SERVER] Error starting server:', err);
  process.exit(1);
});
