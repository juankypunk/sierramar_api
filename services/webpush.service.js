const webpush = require('web-push');
const db = require('../config/database');

// Configura las claves VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@sierramar.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.sendNotificationToUser = async (user_id, payload) => {
  const { rows } = await db.query('SELECT endpoint, keys_auth, keys_p256dh FROM user_push_subscriptions WHERE user_id = $1', [user_id]);
  for (const sub of rows) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        auth: sub.keys_auth,
        p256dh: sub.keys_p256dh
      }
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410) {
        await db.query('DELETE FROM user_push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        console.log(`Suscripción expirada eliminada: ${sub.endpoint}`);
      } else {
        console.error('Error enviando notificación:', err);
      }
    }
  }
};

exports.sendNotificationToAll = async (payload) => {
  const { rows } = await db.query('SELECT endpoint, keys_auth, keys_p256dh FROM user_push_subscriptions');
  for (const sub of rows) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        auth: sub.keys_auth,
        p256dh: sub.keys_p256dh
      }
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410) {
        await db.query('DELETE FROM user_push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        console.log(`Suscripción expirada eliminada: ${sub.endpoint}`);
      } else {
        console.error('Error enviando notificación:', err);
      }
    }
  }
};
