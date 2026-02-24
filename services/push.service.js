const db = require('../config/database');

exports.saveSubscription = async ({ user_id, endpoint, keys_auth, keys_p256dh }) => {
  const query = `INSERT INTO user_push_subscriptions (user_id, endpoint, keys_auth, keys_p256dh) VALUES ($1, $2, $3, $4)`;
  await db.query(query, [user_id, endpoint, keys_auth, keys_p256dh]);
};
