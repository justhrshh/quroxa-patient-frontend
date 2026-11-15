import api from './api';

/**
 * Financial & Billing Service for Patient Portal
 * 
 * Interacts with:
 * - GET /api/billing
 * 
 * CRITICAL BUSINESS RULE:
 * Strictly read-only and informational for patient financial record-keeping.
 * NO online payments, NO checkout, NO simulated transactions.
 */

export const billingService = {
  /**
   * Retrieves billing records, invoices, receipts, and dues for the authenticated patient.
   */
  async getMyBills() {
    const res = await api.get('/billing');
    return res.data;
  }
};

export default billingService;
