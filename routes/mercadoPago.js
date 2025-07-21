const express = require('express');
const MercadoPagoController = require('../controllers/mercadoPagoController');

const router = express.Router();

// Middleware básico de autenticação
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  next();
};

// Rotas do Mercado Pago
router.post('/create-subscription', authenticate, MercadoPagoController.createSubscription);
router.post('/cancel-subscription', authenticate, MercadoPagoController.cancelSubscription);
router.get('/subscription-status/:clinicId', authenticate, MercadoPagoController.getSubscriptionStatus);
router.get('/payment-methods', authenticate, MercadoPagoController.getPaymentMethods);

// Webhook (sem autenticação pois vem do Mercado Pago)
router.post('/webhooks', MercadoPagoController.handleWebhook);

module.exports = router;
