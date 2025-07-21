const express = require('express');
const router = express.Router();
const collaboratorController = require('../controllers/collaboratorController');
const { authenticateFirebaseToken, authorizeClinicAccess, requireManager, auditLog } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas
router.use(authenticateFirebaseToken);

// GET /api/collaborators/:clinicId - Get all collaborators for a clinic
router.get('/:clinicId', authorizeClinicAccess, collaboratorController.getCollaborators);

// GET /api/collaborators/:clinicId/:collaboratorId - Get specific collaborator
router.get('/:clinicId/:collaboratorId', authorizeClinicAccess, collaboratorController.getCollaborator);

// POST /api/collaborators/:clinicId - Create new collaborator (require manager+)
router.post('/:clinicId', authorizeClinicAccess, requireManager, auditLog('CREATE_COLLABORATOR'), collaboratorController.createCollaborator);

// PUT /api/collaborators/:clinicId/:collaboratorId - Update collaborator (require manager+)
router.put('/:clinicId/:collaboratorId', authorizeClinicAccess, requireManager, auditLog('UPDATE_COLLABORATOR'), collaboratorController.updateCollaborator);

// DELETE /api/collaborators/:clinicId/:collaboratorId - Delete collaborator (require manager+)
router.delete('/:clinicId/:collaboratorId', authorizeClinicAccess, requireManager, auditLog('DELETE_COLLABORATOR'), collaboratorController.deleteCollaborator);

module.exports = router;
