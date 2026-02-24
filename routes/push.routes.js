const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const pushController = require('../controllers/push.controller');

// Guardar suscripción push
router.post('/push-subscription', authenticateJWT, pushController.saveSubscription);

module.exports = router;
