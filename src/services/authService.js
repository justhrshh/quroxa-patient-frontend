import api from './api';

/**
 * Patient Portal Authentication & Tenant Resolution Service
 * 
 * Interacts with:
 * - GET  /api/public/portal/tenant/current?tenantId=:slug
 * - POST /api/auth/patient-portal/send-otp
 * - POST /api/auth/patient-portal/verify-otp
 * - POST /api/auth/patient-portal/select-profile
 * - POST /api/patients (Self-registration using tempToken)
 */

export const authService = {
  /**
   * Resolves hospital public profile and metadata by slug (code or hospitalId).
   */
  async resolveHospital(slug) {
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      throw new Error('Hospital identifier or slug is required.');
    }
    const clean = slug.trim().toLowerCase();
    const response = await api.get(`/public/portal/tenant/current`, {
      params: { tenantId: clean }
    });
    return response.data;
  },

  /**
   * Sends an OTP challenge to patient's mobile or email.
   * Requires hospital context (slug/code).
   */
  async sendOtp({ mobile, email, tenantId }) {
    if (!tenantId) {
      throw new Error('Hospital context is required to send OTP.');
    }
    const cleanTenantId = tenantId.trim().toLowerCase();
    const payload = {};
    if (mobile) payload.mobile = String(mobile).trim();
    if (email) payload.email = String(email).trim().toLowerCase();

    const response = await api.post(
      '/auth/patient-portal/send-otp',
      { ...payload, tenantId: cleanTenantId },
      { headers: { 'x-tenant-id': cleanTenantId } }
    );
    return response.data;
  },

  /**
   * Verifies the OTP challenge.
   * May return:
   * - { status: 'success', token, user }
   * - { status: 'multiple_profiles', profileSelectionToken, profiles }
   * - { isNewUser: true, tempToken, tenantId, emailOrPhone }
   */
  async verifyOtp({ mobile, email, otp, tenantId }) {
    if (!tenantId) {
      throw new Error('Hospital context is required to verify OTP.');
    }
    const cleanTenantId = tenantId.trim().toLowerCase();
    const payload = { otp: String(otp).trim() };
    if (mobile) payload.mobile = String(mobile).trim();
    if (email) payload.email = String(email).trim().toLowerCase();

    const response = await api.post(
      '/auth/patient-portal/verify-otp',
      { ...payload, tenantId: cleanTenantId },
      { headers: { 'x-tenant-id': cleanTenantId } }
    );
    return response.data;
  },

  /**
   * Disambiguates and chooses a profile among multiple profiles linked to the contact.
   * Single-use token is atomically burned on the backend.
   */
  async selectProfile({ profileSelectionToken, patientId }) {
    if (!profileSelectionToken || !patientId) {
      throw new Error('Profile selection token and patient ID are required.');
    }
    const response = await api.post('/auth/patient-portal/select-profile', {
      profileSelectionToken: String(profileSelectionToken).trim(),
      patientId: String(patientId).trim()
    });
    return response.data;
  },

  /**
   * Registers a new patient profile using the short-lived tempToken issued during OTP verification.
   */
  async registerPatient(patientData, tempToken) {
    if (!tempToken) {
      throw new Error('Temporary registration token is required.');
    }
    const response = await api.post('/patients', patientData, {
      headers: {
        Authorization: `Bearer ${tempToken.trim()}`
      }
    });
    return response.data;
  },

  // ==========================================================================
  // GLOBAL PATIENT PORTAL MVP METHODS (PHASE H)
  // ==========================================================================

  /**
   * Sends OTP to patient's registered mobile number globally (no hospital required).
   */
  async sendGlobalOtp({ mobile, phone }) {
    const raw = mobile || phone;
    if (!raw) {
      throw new Error('Registered mobile number is required.');
    }
    const response = await api.post('/auth/patient-portal/global/send-otp', {
      mobile: String(raw).trim()
    });
    return response.data;
  },

  /**
   * Verifies global OTP challenge.
   * Returns:
   * - { status: 'success', globalToken, patient, hospitals } (single profile)
   * - { status: 'multiple_profiles', profileSelectionToken, profiles } (multi profile)
   * - { status: 'no_profile', message, contact, registrationToken } (new patient)
   */
  async verifyGlobalOtp({ mobile, otp }) {
    if (!mobile || !otp) {
      throw new Error('Mobile number and OTP code are required.');
    }
    const response = await api.post('/auth/patient-portal/global/verify-otp', {
      mobile: String(mobile).trim(),
      otp: String(otp).trim()
    });
    return response.data;
  },

  /**
   * Disambiguates and chooses a profile among multiple profiles found for the mobile.
   */
  async selectGlobalProfile({ profileSelectionToken, patientId }) {
    if (!profileSelectionToken || !patientId) {
      throw new Error('Profile selection token and patient ID are required.');
    }
    const response = await api.post('/auth/patient-portal/global/select-profile', {
      profileSelectionToken: String(profileSelectionToken).trim(),
      patientId: String(patientId).trim()
    });
    return response.data;
  },

  /**
   * Retrieves global patient profile and associated hospitals using global token.
   */
  async getGlobalPortalData(globalToken) {
    const token = globalToken || localStorage.getItem('quroxa_global_token');
    if (!token) {
      throw new Error('Global patient session token is required.');
    }
    const response = await api.get('/auth/patient-portal/global/portal-data', {
      headers: {
        Authorization: `Bearer ${token.trim()}`
      }
    });
    return response.data;
  },

  /**
   * Exchanges global patient session token for a hospital-scoped JWT.
   */
  async selectGlobalHospital({ tenantId, patientId, globalToken }) {
    if (!tenantId) {
      throw new Error('Hospital tenantId is required.');
    }
    const token = globalToken || localStorage.getItem('quroxa_global_token');
    if (!token) {
      throw new Error('Global patient session token is required.');
    }
    const response = await api.post(
      '/auth/patient-portal/global/select-hospital',
      {
        tenantId: String(tenantId).trim().toLowerCase(),
        patientId: patientId ? String(patientId).trim() : undefined
      },
      {
        headers: {
          Authorization: `Bearer ${token.trim()}`
        }
      }
    );
    return response.data;
  },

  /**
   * Issues temporary registration token scoped to a specific clinic.
   */
  async issueRegistrationToken({ tenantId, registrationToken, mobile }) {
    if (!tenantId) {
      throw new Error('Hospital identifier is required.');
    }
    const response = await api.post('/auth/patient-portal/global/issue-registration-token', {
      tenantId: String(tenantId).trim().toLowerCase(),
      registrationToken,
      mobile
    });
    return response.data;
  }
};

export default authService;
