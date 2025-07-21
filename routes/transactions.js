const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateFirebaseToken, authorizeClinicAccess, auditLog } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas
router.use(authenticateFirebaseToken);

// GET /api/transactions/:clinicId - Get all transactions for a clinic
router.get('/:clinicId', authorizeClinicAccess, transactionController.getTransactions);

// GET /api/transactions/:clinicId/:transactionId - Get specific transaction
router.get('/:clinicId/:transactionId', authorizeClinicAccess, transactionController.getTransaction);

// POST /api/transactions/:clinicId - Create new transaction
router.post('/:clinicId', authorizeClinicAccess, auditLog('CREATE_TRANSACTION'), transactionController.createTransaction);

// PUT /api/transactions/:clinicId/:transactionId - Update transaction
router.put('/:clinicId/:transactionId', authorizeClinicAccess, auditLog('UPDATE_TRANSACTION'), transactionController.updateTransaction);

// DELETE /api/transactions/:clinicId/:transactionId - Delete transaction
router.delete('/:clinicId/:transactionId', authorizeClinicAccess, auditLog('DELETE_TRANSACTION'), transactionController.deleteTransaction);

module.exports = router;
