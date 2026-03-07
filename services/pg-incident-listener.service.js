const { Pool } = require('pg');
const webpushService = require('./webpush.service');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sierramar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

let isListening = false;
const frontendUrl = `${process.env.FRONTEND_URL}/empleados/misincidentes`;

async function startIncidentListener() {
  if (isListening) return;
  
  const client = await pool.connect();
  await client.query('LISTEN new_incident');
  isListening = true;
  console.log('🔔 Listener de incidentes iniciado');

  client.on('notification', async (msg) => {
    try {
      const incident = JSON.parse(msg.payload);
      console.log('📥 Nuevo incidente recibido:', incident.id);

      const payload = {
        title: 'Registro de Jornada',
        body: `Se ha registrado un nuevo incidente: ${incident.rule_code || 'Sin código'}`,
        url: frontendUrl
      };

      await webpushService.sendNotificationToUser(incident.id_user, payload);
      console.log('✅ Notificación enviada al usuario', incident.id_user);
    } catch (err) {
      console.error('❌ Error procesando incidente:', err);
    }
  });

  client.on('error', (err) => {
    console.error('Error en listener:', err);
    isListening = false;
    setTimeout(startIncidentListener, 5000);
  });
}

module.exports = { startIncidentListener };
