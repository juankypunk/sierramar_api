const express = require('express');
const router = express.Router();
const { authenticateJWT, checkRole } = require('../middleware/auth.middleware');
const webpushController = require('../controllers/webpush.controller');

// Enviar notificación a un usuario (requiere rol admin o junta)
router.post('/user', authenticateJWT, checkRole('admin', 'junta'), webpushController.sendToUser);

// Enviar notificación a todos (requiere rol admin o junta)
router.post('/all', authenticateJWT, checkRole('admin', 'junta'), webpushController.sendToAll);

module.exports = router;
