import api from './api';

/**
 * Prescription Service for Patient Portal
 * 
 * Interacts with:
 * - GET /api/prescriptions
 * - GET /api/prescriptions/:id
 * 
 * CRITICAL SECURITY RULE:
 * Prescriptions printing must not call /api/admin/letterhead.
 * The printing UI consumes `rx.hospitalLetterheadUrl` if present,
 * or gracefully renders hospital brand header metadata from PortalBrandingContext.
 */

export const prescriptionService = {
  /**
   * Retrieves verified prescriptions for the authenticated patient.
   */
  async getMyPrescriptions(params = {}) {
    const res = await api.get('/prescriptions', { params });
    return res.data;
  },

  /**
   * Retrieves a single prescription by ID with ownership verification.
   */
  async getPrescriptionById(id) {
    if (!id) throw new Error('Prescription ID is required');
    const res = await api.get(`/prescriptions/${id}`);
    return res.data;
  }
};

export default prescriptionService;
