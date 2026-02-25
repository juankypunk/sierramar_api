const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const pushController = require('../controllers/push.controller');

// Guardar suscripción push
router.post('/push-subscription', authenticateJWT, pushController.saveSubscription);
router.post('/get-subscriptions', authenticateJWT, pushController.getSubscriptions);
router.delete('/push-subscription', authenticateJWT, pushController.deleteSubscription);

module.exports = router;
