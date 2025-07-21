const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateFirebaseToken, authorizeClinicAccess, auditLog } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas
router.use(authenticateFirebaseToken);

// GET /api/patients/:clinicId - Get all patients for a clinic
router.get('/:clinicId', authorizeClinicAccess, patientController.getPatients);

// GET /api/patients/:clinicId/:patientId - Get specific patient
router.get('/:clinicId/:patientId', authorizeClinicAccess, patientController.getPatient);

// POST /api/patients/:clinicId - Create new patient
router.post('/:clinicId', authorizeClinicAccess, auditLog('CREATE_PATIENT'), patientController.createPatient);

// PUT /api/patients/:clinicId/:patientId - Update patient
router.put('/:clinicId/:patientId', authorizeClinicAccess, auditLog('UPDATE_PATIENT'), patientController.updatePatient);

// DELETE /api/patients/:clinicId/:patientId - Delete patient
router.delete('/:clinicId/:patientId', authorizeClinicAccess, auditLog('DELETE_PATIENT'), patientController.deletePatient);

module.exports = router;
