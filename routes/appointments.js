const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateFirebaseToken, authorizeClinicAccess, auditLog } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas
router.use(authenticateFirebaseToken);

// GET /api/appointments/:clinicId - Get appointments for a clinic
router.get('/:clinicId', authorizeClinicAccess, appointmentController.getAppointments);

// GET /api/appointments/:clinicId/today - Get today's appointments
router.get('/:clinicId/today', authorizeClinicAccess, appointmentController.getTodayAppointments);

// GET /api/appointments/:clinicId/:appointmentId - Get specific appointment
router.get('/:clinicId/:appointmentId', authorizeClinicAccess, appointmentController.getAppointment);

// POST /api/appointments/:clinicId - Create new appointment
router.post('/:clinicId', authorizeClinicAccess, auditLog('CREATE_APPOINTMENT'), appointmentController.createAppointment);

// PUT /api/appointments/:clinicId/:appointmentId - Update appointment
router.put('/:clinicId/:appointmentId', authorizeClinicAccess, auditLog('UPDATE_APPOINTMENT'), appointmentController.updateAppointment);

// DELETE /api/appointments/:clinicId/:appointmentId - Delete appointment
router.delete('/:clinicId/:appointmentId', authorizeClinicAccess, auditLog('DELETE_APPOINTMENT'), appointmentController.deleteAppointment);

module.exports = router;
