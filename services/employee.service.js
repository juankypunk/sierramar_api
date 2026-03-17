/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const csv = require('@fast-csv/format');
const PDFDocument = require('pdfkit');

class EmployeeService {
  
  async getPublicHolidays(range_start, range_end) {  
    const result = await pool.query("SELECT to_char(fecha,'YYYY-MM-DD') AS start, to_char(fecha,'YYYY-MM-DD') AS end, title, 'publicholiday' AS class, 'true' AS \"allDay\", 'true' AS background \
                FROM publicholidays WHERE fecha BETWEEN $1 AND $2", [range_start, range_end]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron los días festivos');
    }
    return result.rows;
  }

  async getEventsLabel() {
    const result = await pool.query("SELECT DISTINCT label FROM events");
    if (result.rows.length === 0) {
      throw new Error('No se encontró ninguna etiqueta de eventos');
    }
    return result.rows;
  }
  
  async getEvents(range_start, range_end, label) {
    const result = await pool.query("SELECT title, to_char(starts_at,'YYYY-MM-DD HH24:MI') AS start, to_char(ends_at,'YYYY-MM-DD HH24:MI') AS end, 'vig_' || user_id::text AS class, 'true' AS background \
              FROM recurring_events_all($1,$2) r WHERE r.starts_at::date NOT IN (SELECT fecha FROM publicholidays WHERE fecha BETWEEN $1 AND $2) \
              AND r.label=$3 AND r.starts_at::date NOT IN (SELECT generate_recurrences('daily',fecha_inicio,fecha_fin) FROM holidays h WHERE r.user_id=h.user_id AND fecha_inicio BETWEEN $1 AND $2)",
               [range_start, range_end, label]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron eventos');
    }
    return result.rows;
  }

  async getEventsForUser(user_id, range_start, range_end, label) {
    const result = await pool.query("SELECT title, to_char(starts_at,'YYYY-MM-DD HH24:MI') AS start, to_char(ends_at,'YYYY-MM-DD HH24:MI') AS end,\
             'vig_' || user_id::text AS class, 'true' AS background, label \
              FROM recurring_events_for($1,$2,$3) \
              WHERE starts_at::date NOT IN (SELECT fecha FROM publicholidays WHERE fecha BETWEEN $2 AND $3) \
              AND label = $4 \
              AND starts_at::date NOT IN (SELECT generate_recurrences('daily',fecha_inicio,fecha_fin) FROM holidays WHERE user_id=$1 ) \
              ORDER BY starts_at",
               [user_id, range_start, range_end, label]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron eventos para el usuario');
    }
    return result.rows;
  }

  async getHolidaysForUser(user_id, range_start, range_end) {
    const result = await pool.query("SELECT to_char(fecha_inicio,'YYYY-MM-DD') AS start, to_char(fecha_fin,'YYYY-MM-DD') AS end, title, class \
        FROM holidays_scheduled_for($1,$2,$3) WHERE fecha_inicio NOT IN (SELECT fecha FROM publicholidays WHERE fecha BETWEEN $2 AND $3)", [user_id, range_start, range_end]);
    if (result.rows.length === 0) {
      //throw new Error('No se encontraron vacaciones para el usuario');
      console.log('No se encontraron vacaciones para el usuario');
      return [];
    }
    return result.rows;
  }

  async getEmployees() {
    const result = await pool.query("SELECT id, name FROM users WHERE 'emp' = ANY (roles) ORDER BY name");
    if (result.rows.length === 0) {
      console.log('No se encontraron empleados');
      return [];
    }
    return result.rows;
  }


  async getEmployeeByName(name) {
    const chunk = '%'+ name + '%';
    const result = await pool.query("SELECT id, name FROM users WHERE 'emp' = ANY (roles) AND name ILIKE $1", [chunk]);
    if (result.rows.length === 0) {
      console.log('No se encontró ningún empleado con ese nombre');
    }
    return result.rows;
  } 


  async getPlanningForUser(userId,range_start,range_end,label) {
    const result = await pool.query("SELECT v.id,to_char(s.fecha,'DD-MM') AS fecha,v.dia,v.empleado,to_char(v.inicia,'HH24:MI') AS inicia, \
      to_char(v.termina,'HH24:MI') AS termina,to_char(v.duracion,'HH24:MI') AS duracion,v.label, v.recurrence, \
      (to_char(v.inicia,'YYYY-MM-DD') || 'T' || to_char(v.inicia,'HH24:MI')) AS inicia_formated, \
      (to_char(v.termina,'YYYY-MM-DD') || 'T' || to_char(v.termina,'HH24:MI')) AS termina_formated \
      FROM generate_series($2::date, $3,'1 day') AS s(fecha) \
      LEFT JOIN planned_scheduled_for($1::integer,$2::timestamp,$3::timestamp) AS v ON v.inicia::date=s.fecha WHERE label=$4 \
      ORDER BY s.fecha", [userId, range_start, range_end, label]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron planes para el usuario');
    }
    return result.rows; 
  }

async getScheduledHoursForUser(userId, range_start, range_end, label) {
    const result = await pool.query("SELECT to_char(SUM(duration),'HH24:MI') AS duration \
            FROM recurring_events_for($1,$2,$3) \
            WHERE starts_at::date NOT IN (SELECT fecha FROM publicholidays) \
            AND starts_at::date NOT IN (SELECT generate_recurrences('daily',fecha_inicio,fecha_fin) FROM holidays WHERE user_id=$1 ) \
            AND label = $4", [userId, range_start, range_end, label]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron horas programadas para el usuario');
    }
    return result.rows;
  }


async updatePlanningForUser(userId, id, inicia_formated, termina_formated, recurrence, label) {
    const result = await pool.query("UPDATE events SET starts_at=$3,ends_at=$4,duration=($4::timestamp - $3::timestamp), \
        recurrence=$5, label=$6 WHERE user_id = $1 AND id = $2 RETURNING *", 
      [userId, id, inicia_formated, termina_formated, recurrence, label]);
    if (result.rows.length === 0) {
      throw new Error('No se pudo actualizar la planificación para el usuario');
    }
    return result.rows[0];
  }

async createNewEventForUser(userId, inicia_formated, termina_formated, recurrence, label, empleado) { 
    const result = await pool.query("INSERT INTO events (user_id, starts_at, ends_at, duration, recurrence, label, title) \
        VALUES ($1, $2, $3, ($3::timestamp - $2::timestamp), $4, $5, $6) RETURNING *", 
      [userId, inicia_formated, termina_formated, recurrence, label, empleado]);
    if (result.rows.length === 0) {
      console.log('No se pudo crear el nuevo evento para el usuario');
    }
    return result.rows;
  }

async deleteEventForUser(userId, id) {  
    const result = await pool.query("DELETE FROM events WHERE user_id = $1 AND id = $2 RETURNING *", [userId, id]);
    if (result.rows.length === 0) {
      console.log('No se pudo eliminar el evento para el usuario');
    }
    return result.rows[0];
  } 

async getSigningsForUser(userId, range_start, range_end) {
    const result = await pool.query("SELECT to_char(entrada, 'DD-MM-YYYY') AS fecha, to_char(entrada,'HH24:MI') AS entrada, to_char(salida,'HH24:MI') AS salida, \
      to_char(duracion,'HH24:MI') AS tiempo, lugar_entrada, lugar_salida \
      FROM vista_fichajes WHERE id_user = $1 AND entrada BETWEEN $2 AND $3 ORDER BY fecha DESC", [userId, range_start, range_end]);
    if (result.rows.length === 0) {
      console.log('No se encontraron registros de fichajes para el usuario');
      return [];
    }
    return result.rows;
  }

async getWorkedHoursForUser(userId, range_start, range_end) {
    const result = await pool.query("SELECT to_char(SUM(duracion),'HH24:MI') AS horas_trabajadas FROM vista_fichajes WHERE id_user=$1 AND entrada BETWEEN $2 AND $3",
       [userId, range_start, range_end]);
    if (result.rows.length === 0) {
      console.log('No se encontraron horas trabajadas para el usuario');
      return [];
    }
    return result.rows;
  }

async getExtraWorkedHoursForUser(userId, range_start, range_end) {
    const result = await pool.query("SELECT to_char(SUM(duration),'HH24:MI') AS horas_extra_trabajadas FROM vista_extrahours WHERE user_id=$1 AND starts_at BETWEEN $2 AND $3",
       [userId, range_start, range_end]);
    if (result.rows.length === 0) {
      console.log('No se encontraron horas extra trabajadas para el usuario');
      return [];
    }
    return result.rows;
  }

async getRawSigningsForUser(userId) {
    const result = await pool.query("SELECT id_user,to_char(momento,'DD-MM-YYYY') AS fecha, to_char(momento, 'HH24:MI') AS hora, accion, EXTRACT(EPOCH FROM momento) AS momento,\
         (to_char(momento,'YYYY-MM-DD') || 'T' || to_char(momento,'HH24:MI')) AS momento_formated \
        FROM fichajes WHERE id_user = $1 ORDER BY momento DESC LIMIT 60", [userId]);
    if (result.rows.length === 0) {
      console.log('No se encontraron registros de fichajes para el usuario');
      return [];
    }
    return result.rows;
  } 


async deleteSigningForUser(userId, momento) {
    const result = await pool.query("DELETE FROM fichajes WHERE id_user = $1 AND extract(epoch from momento) = $2 RETURNING *", [userId, momento]);
    if (result.rows.length === 0) {
      console.log('No se pudo eliminar el fichaje para el usuario');
    }
    return result.rows[0];
  }


async getLastSigningForUser(userId) {
    const result = await pool.query("SELECT * FROM vista_ult_fichaje_emp WHERE id_user=$1", [userId]);
    if (result.rows.length === 0) {
      console.log('No se encontraron registros de fichajes para el usuario');
      return null;
    }
    return result.rows[0];
  }


async signUser(id, latitud, longitud, locatedAt, accion) {
    const result = await pool.query("INSERT INTO fichajes (id_user,lugar,locatedat, accion) \
      VALUES ($1, point($2,$3), to_timestamp($4), $5) RETURNING to_char(momento,'DD-MM-YYYY HH24:MI') AS fichaje, *",
       [id, latitud, longitud, locatedAt, accion]);
    if (result.rows.length === 0) {
      console.log('No se pudo registrar el fichaje para el usuario');
    }
    return result.rows[0];
  }

  async updateSigningForUser(userId, momento, momento_updated) {
    const result = await pool.query("UPDATE fichajes SET momento = $3 WHERE id_user = $1 AND extract(epoch from momento) = $2 RETURNING *", 
      [userId, momento, momento_updated]);
    if (result.rows.length === 0) {
      console.log('No se pudo actualizar el fichaje para el usuario');
    }
    return result.rows[0];
  }

  async getIncidents(fecha_inicio, fecha_fin, id_user, estado) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (fecha_inicio && fecha_fin) {
      conditions.push(`fecha BETWEEN $${paramIndex++} AND $${paramIndex++}`);
      params.push(fecha_inicio, fecha_fin);
    }
    if (id_user) {
      conditions.push(`id_user = $${paramIndex++}`);
      params.push(id_user);
    }
    if (estado) {
      conditions.push(`estado = $${paramIndex++}`);
      params.push(estado);
    }

    let query = "SELECT id,id_user,empleado,to_char(fecha,'DD-MM-YYYY') AS fecha,incidencia, \
        entrada_real,salida_real,format_duration(duracion) AS duracion,estado,detectado, \
        entrada_propuesta,salida_propuesta,declaracion,declarado  \
        FROM vista_incidents";

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    const result = await pool.query(query, params);
    return result.rows;
  } 

  async getIncidentsForUser(userId) {
    const result = await pool.query("SELECT * \
      FROM vista_incidents i WHERE i.id_user = $1", [userId]);
    if (result.rows.length === 0) {
      console.log('No se encontraron incidentes de fichajes para el empleado');
      return [];
    }
    return result.rows;
  }

  async changeStatusForIncident(incident_id, new_status) {
    const result = await pool.query("UPDATE incidents SET status=$2 WHERE id=$1 RETURNING *", [incident_id, new_status]);
    if (result.rows.length === 0) {
      console.log('No se pudo actualizar el estado del incidente');
    }
    return result.rows[0];
  }

  async getIncidentsForUserRange(userId, range_start, range_end) {
    console.log('getIncidentsForUserRange called with:', { userId, range_start, range_end });   
    const result = await pool.query("SELECT id,id_user,to_char(fecha,'DD-MM-YYYY') AS fecha,incidencia, \
        entrada_real,salida_real,format_duration(duracion) AS duracion,estado,detectado, \
        entrada_propuesta,salida_propuesta,declaracion,declarado \
      FROM vista_incidents WHERE id_user = $1 AND fecha BETWEEN $2 AND $3", [userId, range_start, range_end]);
    if (result.rows.length === 0) {
      console.log('No se encontraron incidentes de fichajes para el empleado en el rango especificado');
      return [];
    }
    return result.rows;
  }

  async createStatementForUser(userId,incident_id,proposed_entry,proposed_exit,statement_text,ip_address,user_agent) {
    const result = await pool.query("INSERT INTO incident_statements (id_user, incident_id, proposed_entry, proposed_exit, statement_text, ip_address, user_agent) \
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", 
      [userId, incident_id, proposed_entry, proposed_exit, statement_text, ip_address, user_agent ]);
    if (result.rows.length === 0) {
      console.log('No se pudo crear la declaración para el empleado');
    }
    return result.rows[0];
  }

  // ... resto de métodos del servicio
}
module.exports = new EmployeeService();