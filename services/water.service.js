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
const PDFDocument = require('pdfkit');

class WaterService {

  async getWaterCurrentRemittancesById(id_parcela) {
    const result = await pool.query(
      "SELECT r_id_parcela AS id_parcela,to_char(r_fecha,'DD-MM-YYYY') AS fecha,r_titular_cc AS titular,r_bic AS bic,r_iban AS iban,r_l1 AS l1,r_l2 AS l2,r_m3 AS m3,r_t1 AS T1, r_t2 AS T2,r_pm3 AS PVPm3, \
        r_f_a AS f_a,r_f_b AS f_b, r_f_c AS f_c,r_m3_a AS m3_t1,r_m3_b AS m3_t2,r_m3_c AS m3_t3,r_p_m3_a AS p_m3_a,r_p_m3_b AS p_m3_b,r_p_m3_c AS p_m3_c, \
        round(r_total,2) AS importe, r_domiciliado AS domiciliado,r_resumen AS concepto,to_char(r_ult_modif,'DD-MM-YYYY HH24:MI') AS ult_modif,r_user_modif AS user_modif\
        FROM detalla_remesa_agua_residente() WHERE r_id_parcela = $1",
      [id_parcela]
    );
    return result.rows;
  }

  async getWaterStatisticsById(id, years) {
    const result = await pool.query(
      "SELECT to_char(fecha,'Mon-YYYY') AS fecha_f, fecha, m3, avg FROM vista_consumo WHERE id_parcela = $1 AND age(fecha) <= $2 ORDER BY fecha DESC",
      [id, years]
    );
    return result.rows;
  }

  async getWaterReadingsById(id) {
    const result = await pool.query(
      "SELECT e, id_parcela, to_char(fecha,'DD-MM-YYYY') AS lectura, estado, l1, l2, m3, domiciliado, averiado, notas, domicilia_bco FROM vista_agua WHERE id_parcela = $1 ORDER BY fecha DESC",
      [id]
    );
    return result.rows;
  }

  async generateWaterReceiptByParcelId(id, lectura, l1, l2, m3, domiciliado) {
    console.log('id_parcela', id);
    console.log('lectura', lectura);
    console.log('l1', l1);
    console.log('l2', l2);
    console.log('m3', m3);
    console.log('domiciliado', domiciliado);
    try {
      console.log('Iniciando generación de PDF...');
      const doc = new PDFDocument();
      const buffers = [];
      
      // Guardar una copia local para debug
      //const debugPath = path.join(__dirname, `../downloads/receipt-${id}-${Date.now()}.pdf`);
      //doc.pipe(fs.createWriteStream(debugPath));
      
      doc.on('data', chunk => {
        console.log('Chunk size:', chunk.length);
        buffers.push(chunk);
      });
  
      doc.font('Times-Roman')
         .fontSize(16)
         .text('RECIBO DE AGUA', { align: 'center' })
         .moveDown()
         .fontSize(12)
         .text(`Fecha de emisión: ${new Date().toLocaleDateString()}`)
         .moveDown()
         .text(`Lectura: ${lectura}`)
         .text(`Parcela: ${id}`)
         .text(`Lectura anterior: ${l1}`)
         .text(`Lectura actual: ${l2}`)
         .text(`Consumo (m³): ${m3}`)
         .text(`Domiciliado: ${domiciliado}`)
         .moveDown()
         .text('Firma: _________________', { align: 'right' });
      
      // Añadir un borde para visualizar mejor
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
         .stroke();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          console.log('PDF generado correctamente');
          console.log('Tamaño total:', Buffer.concat(buffers).length);
          //console.log('PDF guardado en:', debugPath);
          resolve(Buffer.concat(buffers));
        });
        
        doc.on('error', (err) => {
          console.error('Error generando PDF:', err);
          reject(err);
        });
  
        doc.end();
      });
    } catch (error) {
      console.error('Error en generateWaterReceiptByParcelId:', error);
      throw error;
    }
  }


  async getCurrentStatistics() {
    const result = await pool.query("SELECT to_char(fecha,'DD-MM-YYYY') AS lectura,to_char(fecha,'YYYY(TQ)') AS trimestre,fecha,m3,max,min,avg,stddev,importe,domiciliado FROM estadistica_agua WHERE age(fecha) <= '5 years' ORDER BY fecha DESC",[]);
    return result.rows;
  }


  async getWaterStatisticsCurrentRemittances() {
    try {
      const result = await pool.query(
      "SELECT to_char(fecha,'DD-MM-YYYY') AS lectura,fecha,m3,max,min,avg,stddev,importe,domiciliado \
        FROM estadistica_agua WHERE fecha = (SELECT MAX(fecha) FROM agua)"
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getWaterStatisticsCurrentRemittances:', error);
      throw error;        
    }
    
  } 

  async getCurrentReading(estado,averiado,inactivo,domicilia_bco,reset_filter) {
    const query_unfiltered = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,orden,id_parcela,titular,estado,\
      l1,l2,m3,c,avg,stddev,averiado,inactivo,domicilia_bco,importe,notas \
      FROM vista_lectura WHERE estado = ANY ($1) ORDER BY id_parcela";
    const query_filtered = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,orden,id_parcela,titular,estado,\
      l1,l2,m3,c,avg,stddev,averiado,inactivo,domicilia_bco,importe,notas \
      FROM vista_lectura WHERE estado = ANY ($1) AND averiado=$2 AND inactivo=$3 AND domicilia_bco=$4 ORDER BY id_parcela"; 
    
    const query = reset_filter ? query_unfiltered : query_filtered;
    const params = reset_filter ? [estado] : [estado, averiado, inactivo, domicilia_bco];
    // Ejecutar la consulta
    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      fecha: row.fecha ? row.fecha : '',
      orden: row.orden,
      estado: row.estado,
      e: row.e,
      id_parcela: row.id_parcela,
      titular: row.titular || '',
      l1: row.l1 || '',
      l2: row.l2 || '',
      m3: row.m3 || '',
      c: row.c || '',
      avg: new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(row.avg) || '',
      importe: row.importe ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.importe) : null,
      notas: row.notas
    }));
    
  }

  
  async getCurrentReadingRoute() {  
    const result = await pool.query("SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,orden,id_parcela,titular,estado,l1,l2,m3,c,avg,stddev,averiado,inactivo,domicilia_bco,importe,notas FROM vista_lectura ORDER BY id_parcela", []);
    return result.rows;
  }


  async getWaterCurrentReadingById(id) {
    const result = await pool.query(
      "SELECT e,c,id_parcela,orden,titular,to_char(fecha,'DD-MM-YYYY') AS fecha,estado,l1,l2,m3,avg,averiado,inactivo,notas,domicilia_bco \
        FROM vista_lectura WHERE id_parcela=$1 and fecha = (SELECT MAX(fecha) FROM agua)",
      [id]
    );
    return result.rows;
  }

  async setWaterMeterById(id, l1, user_modif) {
    const result = await pool.query(
      "UPDATE agua SET l1=$2,user_modif=$3,ult_modif=CURRENT_TIMESTAMP \
        WHERE id_parcela=$1 AND fecha = (SELECT MAX(fecha) FROM agua) RETURNING l1",
      [id,l1, user_modif]
    );
    console.log('Resultado de la actualización del contador:', result.rows);
    return result.rows;
  }


  async setWaterCurrentReadingById(id,l1,l2,m3,averiado,inactivo,notas,domicilia_bco,user_modif) {
    console.log('Actualizando lectura de agua para la parcela:', id);
    console.log('Datos de la lectura:', { l2, m3, averiado, inactivo, notas, domicilia_bco, user_modif });
    
    const result = await pool.query(
      "UPDATE agua SET l2=$2,m3=$3,averiado=$4,inactivo=$5,notas=$6,domicilia_bco=$7,user_modif=$8,ult_modif=CURRENT_TIMESTAMP,estado='R' \
        WHERE id_parcela=$1 AND fecha = (SELECT MAX(fecha) FROM agua) RETURNING *",
      [id,l2,m3,averiado,inactivo,notas,domicilia_bco,user_modif]
    );
    console.log('Resultado de la actualización:', result.rows);
    return result.rows;
  }  

  async setWaterCurrentReadingProtected(estado) {
    const result = await pool.query(
      "UPDATE agua SET estado=$1 WHERE fecha = (SELECT MAX(fecha) FROM agua WHERE estado <> 'A')",
      [estado]
    );
    return result.rows;
  }

  async setWaterCurrentReadingNewDate(new_date) {
    const result = await pool.query(
      "INSERT INTO agua (id_parcela,fecha,l1,pm3,averiado,notas,domicilia_bco,t1,t2,f_a,f_b,f_c,inactivo) \
            SELECT id_parcela,$1,l2,pm3,averiado,notas,domicilia_bco,t1,t2,f_a,f_b,f_c,inactivo \
            FROM agua WHERE fecha=(SELECT MAX(fecha) FROM agua) AND NOT EXISTS (SELECT * FROM agua WHERE l2 IS NULL) RETURNING fecha",
      [new_date]
    );
    console.log('Resultado de la actualización de fecha:', result.rowCount);
    return result.rows;
  }

  async setWaterCurrentReadingChangeDate(new_date) {
    const result = await pool.query(
      "UPDATE agua SET fecha=$1 WHERE fecha=(SELECT MAX(fecha) FROM agua) AND estado IN ('R','A') RETURNING fecha",
      [new_date]
    );
    console.log('Resultado de la actualización de cambio de fecha:', result.rowCount);
    return result.rows;
  }


  async getWaterCurrentReadingCSV(estado, averiado, inactivo, domicilia_bco, reset_filter) {
    try {
    // Query base
    const baseQuery = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,orden,id_parcela,titular,estado, \
      l1,l2,m3,c,avg,stddev,averiado,inactivo,domicilia_bco,importe,notas FROM vista_lectura";
    
    // Construir query según filtros
    const query = reset_filter 
      ? `${baseQuery} ORDER BY id_parcela`
      : `${baseQuery} WHERE estado = ANY ($1) AND averiado=$2 AND inactivo=$3 AND domicilia_bco=$4 ORDER BY id_parcela`;
    
    // Ejecutar query con o sin parámetros
    const params = reset_filter ? [] : [estado, averiado, inactivo, domicilia_bco];
    const result = await pool.query(query, params);
    
    console.log('WaterReadings (rows):', result.rowCount);

    // Transformar datos para CSV
    return result.rows.map(row => ({
        Parcela: row.id_parcela,
        Fecha: row.fecha ? new Date(row.fecha).toLocaleDateString() : '',
        'Lectura Anterior': row.l1 || '',
        'Lectura Actual': row.l2 || '',
        'Consumo (m³)': row.m3 || '',
        'Importe': row.importe ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
          }).format(row.importe) : '' ,
        Estado: row.estado,
        Averiado: row.averiado ? 'Sí' : 'No',
        Inactivo: row.inactivo ? 'Sí' : 'No',
        Domiciliado: row.domicilia_bco ? 'Sí' : 'No',
        Notas: row.notas || ''
      }));
    } catch (error) {
      console.error('Error generando CSV:', error);
      throw error;
    } 
  }
        
  async getWaterCurrentRemittances(ordena_columna,domicilia_bco,reset_filter) {
    try {
      if(ordena_columna=='r_m3'){
        var orden="ORDER BY r_m3 DESC";
      }else{
        var orden="ORDER BY r_id_parcela ASC";
      }

      if(reset_filter==false){
        if(domicilia_bco==true){
          var where_condition="WHERE r_domicilia_bco='t'";
        }else{
          var where_condition="WHERE r_domicilia_bco='f'";
        }
      }
      
      const query = `SELECT r_num_recibo AS id,r_id_parcela AS id_parcela,to_char(r_fecha,'DD-MM-YYYY') AS fecha,r_estado AS estado,r_titular_cc AS titular,r_bic AS bic,r_iban AS iban,r_l1 AS l1,r_l2 AS l2,r_m3 AS m3,r_t1 AS T1, r_t2 AS T2,r_pm3 AS PVPm3, \
        r_f_a AS f_a,r_f_b AS f_b, r_f_c AS f_c,r_m3_a AS m3_t1,r_m3_b AS m3_t2,r_m3_c AS m3_t3,r_p_m3_a AS p_m3_a,r_p_m3_b AS p_m3_b,r_p_m3_c AS p_m3_c, \
        r_total AS importe,r_domiciliado AS domiciliado,r_resumen AS concepto,to_char(r_ult_modif,'DD-MM-YYYY HH24:MI') AS ult_modif,r_user_modif AS user_modif\
        FROM detalla_remesa_agua() ${where_condition} ${orden}`;
        const result = await pool.query(query);

      return result.rows.map(row => ({  
        id: row.id,
        id_parcela: row.id_parcela,
        fecha: row.fecha,
        estado: row.estado,
        titular: row.titular || '',
        bic: row.bic || '',
        iban: row.iban || '',
        l1: row.l1 || '',
        l2: row.l2 || '',
        m3: row.m3 || '',
        t1: row.t1 || '',
        t2: row.t2 || '',
        f_a: row.f_a  || '',
        f_b: row.f_b  || '',
        f_c: row.f_c  || '',
        m3_t1: row.m3_t1 || '',
        m3_t2: row.m3_t2 || '',
        m3_t3: row.m3_t3 || '',
        pvpm3: row.pvpm3 || '',
        p_m3_a: row.p_m3_a  || '',
        p_m3_b: row.p_m3_b  || '',
        p_m3_c: row.p_m3_c  || '',
        importe: row.importe ? new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }).format(row.importe) : '',
        domiciliado: row.domiciliado ? new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }).format(row.domiciliado) : '',
        concepto: row.concepto || '',
        ult_modif: row.ult_modif || '',
        user_modif: row.user_modif || ''
      }));
    
    } catch (error) {
      console.error('Error en getWaterCurrentRemittances:', error);
      throw error;
    }    
  }

  async getWaterCurrentRemittancesVAT(selected_ids) {
    try {
      const query = `SELECT * FROM vista_agua_iva WHERE id = ANY ($1) ORDER BY id_parcela`;
      const result = await pool.query(query, [selected_ids]);
      return result.rows; 
    } catch (error) {
      console.error('Error en getWaterCurrentRemittancesVAT:', error);
      throw error;
    }
  }



  async getWaterCurrentRemittancesCSV(ordena_columna,domicilia_bco,reset_filter) {
    try {
        if(ordena_columna=='r_m3'){
        var orden="ORDER BY r_m3 DESC";
      }else{
        var orden="ORDER BY r_id_parcela ASC";
      }

      if(reset_filter==false){
        if(domicilia_bco==true){
          var where_condition="WHERE r_domicilia_bco='t'";
        }else{
          var where_condition="WHERE r_domicilia_bco='f'";
        }
      }
      const query = `SELECT r_id_parcela AS id_parcela,to_char(r_fecha,'DD-MM-YYYY') AS fecha,r_estado AS estado,r_titular_cc AS titular,r_bic AS bic,r_iban AS iban,r_l1 AS l1,r_l2 AS l2,r_m3 AS m3,r_t1 AS T1, r_t2 AS T2,r_pm3 AS PVPm3, \
        r_f_a AS f_a,r_f_b AS f_b, r_f_c AS f_c,r_m3_a AS m3_t1,r_m3_b AS m3_t2,r_m3_c AS m3_t3,r_p_m3_a AS p_m3_a,r_p_m3_b AS p_m3_b,r_p_m3_c AS p_m3_c, \
        r_total AS importe,r_domiciliado AS domiciliado,r_resumen AS concepto,to_char(r_ult_modif,'DD-MM-YYYY HH24:MI') AS ult_modif,r_user_modif AS user_modif\
        FROM detalla_remesa_agua() ${where_condition} ${orden}`;
        const result = await pool.query(query);
        console.log('WaterCurrentRemittances (rows):', result.rowCount);
     
      // Transformar datos para CSV     
      return result.rows.map(row => ({
        Parcela: row.id_parcela,
        Fecha: row.fecha ? new Date(row.fecha).toLocaleDateString() : '',
        Estado: row.estado,
        Titular: row.titular || '',
        BIC: row.bic || '',
        IBAN: row.iban || '',
        'Lectura Anterior': row.l1 || '',
        'Lectura Actual': row.l2 || '',
        'Consumo (m³)': row.m3 || '',
        'T1': row.t1 || '',
        'T2': row.t2 || '',
        'F_A': row.f_a ? new Date(row.f_a).toLocaleDateString() : '',
        'F_B': row.f_b ? new Date(row.f_b).toLocaleDateString() : '',
        'F_C': row.f_c ? new Date(row.f_c).toLocaleDateString() : '',
        'M3 T1': row.m3_t1 || '',
        'M3 T2': row.m3_t2 || '',
        'M3 T3': row.m3_t3 || '',
        'PVP_M3': row.pvpm3  ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(row.pvpm3) : '' ,
        'PVP_M3 A': row.p_m3_a  ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(row.p_m3_a) : '' ,
        'PVP_M3 B': row.p_m3_b  ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(row.p_m3_b) : '' ,
        'PVP_M3 C': row.p_m3_c  ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(row.p_m3_c) : '' ,
        Importe: row.importe ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(row.importe) : '',
        Domiciliado: row.domiciliado ? new Intl.NumberFormat('es-ES', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        }).format(row.domiciliado) : '',
        Concepto: row.concepto || '',
        Ult_Modif: row.ult_modif || '',
        User_Modif: row.user_modif || ''
      }));    

    } catch (error) {
      console.error('Error generando CSV de remesas actuales:', error);
      throw error;
    }
  }

  async writeWaterBankRemittance(fecha_cobro) {
    try {
      const result = await pool.query("SELECT * FROM remesa_agua_sepa($1)",[fecha_cobro]);
      if (result.rowCount === 0) {
        throw new Error('No se pudo crear la remesa bancaria de agua');
      }
      console.log('Remesa bancaria de agua creada con éxito:', result.rows);
      const dirPath = path.join(__dirname, '../downloads');
      const filePath = path.resolve(dirPath, `remesa_agua_sepa.dat`);
      //console.log('Remesa:',result.rows[0].remesa);
      fs.writeFileSync(filePath,result.rows[0].remesa);
      return result.rows;
    } catch (error) {
      console.error('Error al escribir la remesa bancaria de agua:', error);
      throw error;
    }
  }

  async getWaterReadingsByDate(lectura) {
    try {
      const result = await pool.query(
        "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_parcela,titular,estado,l1,l2,m3,avg,stddev,averiado,inactivo,domicilia_bco,importe,notas \
        FROM vista_agua WHERE estado='C' AND fecha=$1 ORDER BY id_parcela",
        [lectura]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener lecturas de agua por fecha:', error);
      throw error;
    }
  }


  async getIrrigationWaterCurrentReading(estado, averiado) {
    try {
      const result = await pool.query(
        "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_contador,lugar,estado,l1,l2,m3,averiado,notas FROM vista_riego ORDER BY id_contador",
        []
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener lecturas de riego:', error);
      throw error;
    }
  } 

  async getIrrigationWaterCurrentReadingById(id) {
    try {
      const result = await pool.query("SELECT e,id_contador,lugar,to_char(fecha,'DD-MM-YYYY') AS fecha,estado,l1,l2,m3,averiado,notas \
        FROM vista_riego WHERE id_contador = $1 and fecha = (SELECT MAX(fecha) FROM riego)",
        [id]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener lectura de riego por ID:', error);
      throw error;
    }
  }

  async getIrrigationWaterReadingsById(id) {
    try {
      const result = await pool.query(
        "SELECT to_char(fecha,'DD-MM-YYYY') AS lectura,estado,l1,l2,m3,averiado,notas \
          FROM riego WHERE id_contador=$1 ORDER BY fecha DESC",
        [id]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener lecturas de riego por ID:', error);
      throw error;
    }
  }

  async getIrrigationWaterCurrentReadingCSV(estado, averiado) {
    try {
    const query = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_contador,lugar,estado,l1,l2,m3,averiado,notas \
      FROM vista_riego ORDER BY id_contador";    
    const result = await pool.query(query);
    
    console.log('WaterReadings (rows):', result.rowCount);

    // Transformar datos para CSV
    return result.rows.map(row => ({
        Id_contador: row.id_contador,
        Lugar: row.lugar,
        Fecha: row.fecha ? new Date(row.fecha).toLocaleDateString() : '',
        'Lectura Anterior': row.l1 || '',
        'Lectura Actual': row.l2 || '',
        'Consumo (m³)': row.m3 || '',
        Averiado: row.averiado ? 'Sí' : 'No',
        Estado: row.estado,
        Notas: row.notas || ''
      }));
    } catch (error) {
      console.error('Error generando CSV:', error);
      throw error;
    }
  
  
  }

  async setIrrigationWaterCurrentReadingById(id,l1,l2,m3,averiado,notas) {
    console.log('Actualizando lectura de agua para la parcela:', id);
    console.log('Datos de la lectura:', { id, l1, l2, m3, averiado, notas });
    
    const result = await pool.query(
      "UPDATE riego SET l2=$2,m3=$3,averiado=$4,notas=$5,estado='R' \
        WHERE id_contador=$1 AND fecha = (SELECT MAX(fecha) FROM riego) RETURNING *",
      [id,l2,m3,averiado,notas]
    );
    console.log('Resultado de la actualización:', result.rows);
    return result.rows;
  }  

  async setIrrigationWaterMeterById(id, l1) {
    const result = await pool.query(
      "UPDATE riego SET l1=$2 \
        WHERE id_contador=$1 AND fecha = (SELECT MAX(fecha) FROM riego) RETURNING l1",
      [id,l1]
    );
    console.log('Resultado de la actualización del contador:', result.rows);
    return result.rows;
  }

  async setIrrigationWaterCurrentReadingProtected(estado) {
    const result = await pool.query(
      "UPDATE riego SET estado=$1 WHERE fecha = (SELECT MAX(fecha) FROM riego WHERE estado <> 'A') RETURNING estado",
      [estado]
    );
    console.log('Resultado de la actualización protegida:', result.rowCount);
    return result.rows;
  }

  async setIrrigationWaterCurrentReadingNewDate(fecha) {
    const result = await pool.query(
      "INSERT INTO riego (id_contador,fecha,l1,averiado,notas) \
            SELECT id_contador,$1,l2,averiado,notas \
            FROM riego WHERE fecha=(SELECT MAX(fecha) FROM riego) RETURNING fecha",
      [fecha]
    );
    console.log('Resultado de la actualización de fecha:', result.rowCount);
    return result.rows;
  }

  async getWaterSupplyCurrentReading(estado, averiado) {
    try {
      const result = await pool.query(
        "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_contador,lugar,estado,l1,l2,m3,averiado,notas \
      FROM vista_suministro ORDER BY id_contador",
        []
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener lecturas de suministro:', error);
      throw error;
    }
  }

  async getWaterSupplyCurrentReadingById(id) {
    try {
      const result = await pool.query(
        "SELECT e,id_contador,lugar,to_char(fecha,'DD-MM-YYYY') AS fecha,estado,l1,l2,m3,averiado,notas \
      FROM vista_suministro WHERE id_contador = $1 and fecha = (SELECT MAX(fecha) FROM suministro)",
        [id]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener lectura de suministro por ID:', error);
      throw error;
    }
  }

  async setWaterSupplyCurrentReadingById(id,l1,l2,m3,averiado,notas) {
    const result = await pool.query(
      "UPDATE suministro SET l2=$2,m3=$3,averiado=$4,notas=$5,estado='R' \
        WHERE id_contador=$1 AND fecha = (SELECT MAX(fecha) FROM suministro) RETURNING *",
      [id,l2,m3,averiado,notas]
    );
    console.log('Resultado de la actualización:', result.rows);
    return result.rows;
  }


  async setWaterSupplyCurrentReadingProtected(estado) {
    const result = await pool.query(
      "UPDATE suministro SET estado=$1 WHERE fecha = (SELECT MAX(fecha) FROM suministro WHERE estado <> 'A')",
      [estado]
    );
    console.log('Resultado de la actualización protegida:', result.rowCount);
    return result.rows;
  }


  async setWaterSupplyCurrentReadingNewDate(fecha) {
    const result = await pool.query(
      "INSERT INTO suministro (id_contador,fecha,l1,averiado,notas) \
            SELECT id_contador,$1,l2,averiado,notas \
            FROM suministro WHERE fecha=(SELECT MAX(fecha) FROM suministro) RETURNING fecha",
      [fecha]
    );
    console.log('Resultado de la actualización de fecha:', result.rowCount);
    return result.rows;
  }


} //end class WaterService

module.exports = new WaterService();