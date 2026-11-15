import api from './api';

/**
 * Patient Profile Service
 * 
 * Interacts with:
 * - GET /api/patients/:id
 * - PUT /api/patients/:id
 * - PUT /api/patients/:id/password
 */

export const profileService = {
  /**
   * Retrieves the detailed patient record.
   */
  async getMyProfile(patientId) {
    if (!patientId) throw new Error('Patient ID is required');
    const res = await api.get(`/patients/${patientId}`);
    return res.data;
  },

  /**
   * Updates patient demographics, emergency contact, or address.
   */
  async updateMyProfile(patientId, updateData) {
    if (!patientId) throw new Error('Patient ID is required');
    const res = await api.put(`/patients/${patientId}`, updateData);
    return res.data;
  },

  /**
   * Updates patient portal account password.
   */
  async changePassword(patientId, { currentPassword, newPassword }) {
    if (!patientId) throw new Error('Patient ID is required');
    const res = await api.put(`/patients/${patientId}/password`, {
      currentPassword,
      newPassword
    });
    return res.data;
  }
};

export default profileService;
