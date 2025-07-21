const express = require('express');
const ClinicController = require('../controllers/clinicController');

const router = express.Router();

// Middleware básico de autenticação
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  next();
};

// Rotas de clínica
router.get('/:clinicId', authenticate, ClinicController.getClinic);
router.post('/:clinicId', authenticate, ClinicController.createClinic);
router.put('/:clinicId', authenticate, ClinicController.updateClinic);
router.get('/:clinicId/users', authenticate, ClinicController.getClinicUsers);
router.put('/:clinicId/usage', authenticate, ClinicController.updateClinicUsage);

module.exports = router;
