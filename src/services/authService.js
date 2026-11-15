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
  }
};

export default authService;
