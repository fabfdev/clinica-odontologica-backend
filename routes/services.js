const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateFirebaseToken, authorizeClinicAccess, requireManager, auditLog } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas
router.use(authenticateFirebaseToken);

// GET /api/services/:clinicId - Get all services for a clinic
router.get('/:clinicId', authorizeClinicAccess, serviceController.getServices);

// GET /api/services/:clinicId/:serviceId - Get specific service
router.get('/:clinicId/:serviceId', authorizeClinicAccess, serviceController.getService);

// POST /api/services/:clinicId - Create new service (require manager+)
router.post('/:clinicId', authorizeClinicAccess, requireManager, auditLog('CREATE_SERVICE'), serviceController.createService);

// PUT /api/services/:clinicId/:serviceId - Update service (require manager+)
router.put('/:clinicId/:serviceId', authorizeClinicAccess, requireManager, auditLog('UPDATE_SERVICE'), serviceController.updateService);

// DELETE /api/services/:clinicId/:serviceId - Delete service (require manager+)
router.delete('/:clinicId/:serviceId', authorizeClinicAccess, requireManager, auditLog('DELETE_SERVICE'), serviceController.deleteService);

module.exports = router;
