import api from './api';

/**
 * DPDP Privacy & Consent Service for Patient Portal
 * 
 * Interacts with:
 * - GET  /api/emr/consent/patient/:patientId
 * - POST /api/emr/consent
 * - GET  /api/dpo/patient/my-requests
 * - POST /api/emr/consent/patient/:patientId/dpdp-request
 * - POST /api/dpo/requests/:id/cancel
 * - GET  /api/emr/audits/patient/:patientId
 */

export const privacyService = {
  /**
   * Retrieves active patient consent status.
   */
  async getMyConsent(patientId) {
    if (!patientId) return null;
    const res = await api.get(`/emr/consent/patient/${patientId}`);
    return res.data;
  },

  /**
   * Creates or updates consent settings.
   */
  async updateConsent(payload) {
    const res = await api.post('/emr/consent', payload);
    return res.data;
  },

  /**
   * Retrieves the patient's DPO requests (data access, correction, erasure).
   */
  async getMyDpoRequests(hospitalCode) {
    const params = hospitalCode ? { hospitalId: hospitalCode } : {};
    const res = await api.get('/dpo/patient/my-requests', { params });
    return res.data;
  },

  /**
   * Submits a new formal DPDP privacy request.
   */
  async submitDpdpRequest(patientId, payload) {
    if (!patientId) throw new Error('Patient ID is required');
    const res = await api.post(`/emr/consent/patient/${patientId}/dpdp-request`, payload);
    return res.data;
  },

  /**
   * Cancels a pending DPO privacy request.
   */
  async cancelDpoRequest(requestId) {
    if (!requestId) throw new Error('Request ID is required');
    const res = await api.post(`/dpo/requests/${requestId}/cancel`);
    return res.data;
  },

  /**
   * Retrieves patient consent and access audit records.
   */
  async getAudits(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/emr/audits/patient/${patientId}`);
    return res.data;
  }
};

export default privacyService;
