import api from './api';

/**
 * Clinical EMR Service for Patient Portal
 * 
 * Interacts with:
 * - GET /api/emr/visits/patient/:patientId
 * - GET /api/emr/vitals/patient/:patientId
 * - GET /api/emr/clinical-notes/patient/:patientId
 * - GET /api/emr/procedures/patient/:patientId
 * - GET /api/emr/documents/patient/:patientId
 */

export const clinicalService = {
  /**
   * Retrieves visits and consultation timeline.
   */
  async getVisits(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/emr/visits/patient/${patientId}`);
    return res.data;
  },

  /**
   * Retrieves vital signs history.
   */
  async getVitals(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/emr/vitals/patient/${patientId}`);
    return res.data;
  },

  /**
   * Retrieves verified doctor clinical notes.
   */
  async getClinicalNotes(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/emr/clinical-notes/patient/${patientId}`);
    return res.data;
  },

  /**
   * Retrieves clinical procedures recorded for the patient.
   */
  async getProcedures(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/emr/procedures/patient/${patientId}`);
    return res.data;
  },

  /**
   * Retrieves diagnostic and discharge clinical documents.
   */
  async getDocuments(patientId) {
    if (!patientId) return [];
    const res = await api.get(`/emr/documents/patient/${patientId}`);
    return res.data;
  }
};

export default clinicalService;
