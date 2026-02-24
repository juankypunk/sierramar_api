const webpushService = require('../services/webpush.service');

exports.sendToUser = async (req, res) => {
  const { user_id, title, body, url } = req.body;
  if (!user_id || !title) {
    return res.status(400).json({ error: 'user_id y title son requeridos' });
  }
  try {
    await webpushService.sendNotificationToUser(user_id, { title, body, url });
    res.json({ message: 'Notificación enviada al usuario' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendToAll = async (req, res) => {
  const { title, body, url } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title es requerido' });
  }
  try {
    await webpushService.sendNotificationToAll({ title, body, url });
    res.json({ message: 'Notificación enviada a todos' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
