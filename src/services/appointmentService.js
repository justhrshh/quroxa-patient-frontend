import api from './api';

/**
 * Appointment Service for Patient Portal
 * 
 * Interacts with:
 * - GET  /api/appointments
 * - POST /api/appointments
 * - DELETE /api/appointments/:id
 * - GET  /api/auth/doctors/universal
 * - GET  /api/hr/doctor-availability/:doctorId?date=:date
 * - GET  /api/appointments/doctor-queue/:doctorId?date=:date
 */

export const appointmentService = {
  /**
   * Retrieves the authenticated patient's appointments (scoped to current tenant by backend).
   */
  async getMyAppointments() {
    const res = await api.get('/appointments');
    return res.data;
  },

  /**
   * Retrieves active doctors available across the portal.
   */
  async getUniversalDoctors() {
    const res = await api.get('/auth/doctors/universal');
    return res.data;
  },

  /**
   * Retrieves doctor slot availability for a specified date.
   */
  async getDoctorAvailability(doctorId, dateStr) {
    if (!doctorId) return null;
    const res = await api.get(`/hr/doctor-availability/${doctorId}`, {
      params: { date: dateStr }
    });
    return res.data;
  },

  /**
   * Retrieves doctor queue position and token status.
   */
  async getDoctorQueue(doctorId, dateStr, tokenParam) {
    if (!doctorId) return null;
    const res = await api.get(`/appointments/doctor-queue/${doctorId}`, {
      params: { date: dateStr, token: tokenParam }
    });
    return res.data;
  },

  /**
   * Books a new consultation appointment for the patient.
   */
  async bookAppointment(payload) {
    const res = await api.post('/appointments', payload);
    return res.data;
  },

  /**
   * Cancels an appointment.
   */
  async cancelAppointment(appointmentId, reason) {
    const res = await api.delete(`/appointments/${appointmentId}`, {
      data: { reason }
    });
    return res.data;
  }
};

export default appointmentService;
