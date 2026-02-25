const db = require('../config/database');

exports.saveSubscription = async ({ user_id, endpoint, keys_auth, keys_p256dh }) => {
  const query = `
    INSERT INTO user_push_subscriptions (user_id, endpoint, keys_auth, keys_p256dh) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, endpoint, keys_auth, keys_p256dh) DO NOTHING
  `;
  await db.query(query, [user_id, endpoint, keys_auth, keys_p256dh]);
};

exports.getSubscriptionsByUserIdAndEndpoint = async (user_id, endpoint) => {
  if (!user_id || !endpoint) {
    throw new Error('user_id y endpoint son requeridos');
  }
  console.log(`Obteniendo suscripciones para user_id: ${user_id} y endpoint: ${endpoint}`);
  const { rows } = await db.query('SELECT endpoint, keys_auth, keys_p256dh FROM user_push_subscriptions WHERE user_id = $1 AND endpoint = $2', [user_id, endpoint]);
  return rows;
};

exports.deleteSubscription = async (user_id, endpoint) => {
  await db.query('DELETE FROM user_push_subscriptions WHERE user_id = $1 AND endpoint = $2', [user_id, endpoint]);
};