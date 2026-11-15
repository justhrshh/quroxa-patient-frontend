import api from './api';

/**
 * Laboratory Service for Patient Portal
 * 
 * Interacts with:
 * - GET /api/labs
 */

export const laboratoryService = {
  /**
   * Retrieves laboratory test orders and reports for the authenticated patient.
   */
  async getMyLabRequests() {
    const res = await api.get('/labs');
    return res.data;
  }
};

export default laboratoryService;
