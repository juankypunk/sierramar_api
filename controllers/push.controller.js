const pushService = require('../services/push.service');

exports.saveSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys_auth, keys_p256dh } = req.body;
    if (!endpoint || !keys_auth || !keys_p256dh) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }
    await pushService.saveSubscription({ user_id: userId, endpoint, keys_auth, keys_p256dh });
    res.status(201).json({ message: 'Suscripción guardada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = await pushService.getSubscriptionsByUserId(userId);
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Falta el campo endpoint.' });
    }
    await pushService.deleteSubscription(userId, endpoint);
    res.json({ message: 'Suscripción eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};