/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const e = require('express');
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ResidentService {
  
  async getResidentContactCSV() {
    try {
      const result = await pool.query("SELECT * FROM vista_socios_contact ORDER BY id_parcela");
      if (result.rows.length === 0) {
        throw new Error('No se encontraron residentes');
      }
      return result.rows.map(row => ({
        id_parcela: row.id_parcela,
        titular: row.titular,
        titular2: row.titular2,
        email: row.email,
        email2: row.email2,
        domicilio: row.domicilio,
        localidad: row.localidad,
        cp: row.cp,
        telef1: row.telef1,
        telef2: row.telef2,
        telef3: row.telef3,
        nif_titular_cc_agua: row.nif_titular_cc_agua,
        titular_cc_agua: row.titular_cc_agua,
      }));
    } catch (error) {
      console.error('Error al generar el CSV de contactos de residentes:', error);
      throw new Error('Error al generar el CSV de contactos de residentes');
    }
    
  }
  
  
  async getResidentParcelById(id) {
    const result = await pool.query('SELECT id_parcela FROM user_socio WHERE id_user = $1', [id]);
    if (result.rows.length === 0) {
      throw new Error('No se encontró la parcela asociada al usuario');
    }
    return result.rows[0];
  }

  async getResidentDuesByParcelId(id_parcela) {
    const result = await pool.query("SELECT titular, fecha AS fecha_cuota,to_char(fecha,'DD-MM-YYYY') AS fecha,cuota,dto,domiciliado \
        FROM vista_cuotas WHERE id_parcela = $1 AND estado='C' ORDER BY fecha_cuota DESC", [id_parcela]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron cuotas para la parcela especificada');
    }
    return result.rows;
  }

  async getResidentCurrentDuesByParcelId(id_parcela) {
    const result = await pool.query("SELECT to_char(fecha,'DD-MM-YYYY') as fecha,cuota,dto,domicilia_bco \
        FROM cuotas WHERE id_parcela = $1 AND estado='R'", [id_parcela]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron cuotas para la parcela especificada');
    }
    return result.rows[0];
  }

  async generateResidentReceiptByParcelId(id_parcela,fecha,cuota,dto,domiciliado) {
    console.log('id_parcela', id_parcela);
    console.log('fecha', fecha);

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
         .text('RECIBO DE CUOTA', { align: 'center' })
         .moveDown()
         .fontSize(12)
         .text(`Fecha de emisión: ${new Date().toLocaleDateString()}`)
         .moveDown()
         .text(`Fecha: ${fecha}`)
         .text(`Parcela: ${id_parcela}`)
         .text(`Cuota: ${cuota}`)
         .text(`DTO: ${dto}`)
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
      console.error('Error en generateResidentReceiptByParcelId:', error);
      throw error;
    }
  }

async getResidentByName(chunk) {
    const result = await pool.query("SELECT * FROM resident_info($1) WHERE FALSE = ANY (SELECT unnest(id_parcela) IS NULL)", [chunk]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron residentes con ese nombre');
    }
    return result.rows;
}

async getResidentList() {
    const result = await pool.query("SELECT * FROM vista_socios_contact ORDER BY id_parcela");
    if (result.rows.length === 0) {
      throw new Error('No se encontraron residentes');
    }
    return result.rows;
  } 

async getResidentLocationByParcelId(id_parcela) {
    const result = await pool.query("SELECT geolocation,notas FROM socios WHERE id_parcela = $1", [id_parcela]);
    if (result.rows.length === 0) {
      throw new Error('No se encontró la ubicación para la parcela especificada');
    }
    return result.rows[0];
  }
  
async setResidentLocationByParcelId(id_parcela, geolocation, notas) {
  if(geolocation){
      var array_location = geolocation.split(",");
      var latitude= array_location[0];
      var longitude=array_location[1];  
    }
    const result = await pool.query("UPDATE socios SET geolocation = POINT($2::numeric,$3::numeric), notas=$4 WHERE id_parcela = $1 RETURNING geolocation,notas",
       [id_parcela,latitude, longitude, notas]);
    if (result.rowCount === 0) {
      throw new Error('No se pudo actualizar la ubicación para la parcela especificada');
    }
    return { message: 'Ubicación actualizada correctamente' };
  }


async getResidentContactByParcelId(id_parcela) {
    const result = await pool.query("SELECT * FROM vista_socios_contact WHERE id_parcela = $1", [id_parcela]);
    if (result.rows.length === 0) {
      throw new Error('No se encontró el contacto para la parcela especificada');
    }
    return result.rows[0];
  }

async setResidentContactByParcelId(id_parcela,titular,titular2,email,email2,domicilio,localidad,cp,telef1,telef2,telef3) {
    const result = await pool.query("UPDATE socios SET titular=$2, titular2=$3, email=$4, email2=$5, domicilio=$6 ,localidad=$7,cp=$8, \
     telef1=$9, telef2=$10, telef3=$11 WHERE id_parcela = $1",
       [id_parcela,titular,titular2,email,email2,domicilio,localidad,cp,telef1,telef2,telef3]);
    if (result.rowCount === 0) {
      throw new Error('No se pudo actualizar el contacto para la parcela especificada');
    }
    return { message: 'Contacto actualizado correctamente' };
  }

async getResidentBankByParcelId(id_parcela) {
    const result = await pool.query("SELECT *,to_char(fecha_mandato,'YYYY-MM-DD') AS fecha_mandato FROM vista_socios_bank WHERE id_parcela = $1", [id_parcela]);
    
    return result.rows[0]; // Devuelve null si no se encuentra la parcela
  }

async setResidentBankByParcelId(id_parcela,titular_cc_cuota,bic_cuota,iban_cuota,titular_cc_agua,bic_agua,iban_agua,fecha_mandato,nif_titular_cc_agua) {
    const result = await pool.query("UPDATE socios SET titular_cc_cuota=$2, bic_cuota=$3,iban_cuota=$4, \
        titular_cc_agua=$5,bic_agua=$6,iban_agua=$7,fecha_mandato=$8,nif_titular_cc_agua=$9 WHERE id_parcela = $1",
       [id_parcela,titular_cc_cuota,bic_cuota,iban_cuota,titular_cc_agua,bic_agua,iban_agua,fecha_mandato,nif_titular_cc_agua]);
    if (result.rowCount === 0) {
      throw new Error('No se pudo actualizar el banco para la parcela especificada');
    }
    return { message: 'Banco actualizado correctamente' };
  }


async getResidentsCurrentDue(domicilia_bco, reset_filter) {
  const query_unfiltered = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_parcela,titular,estado,cuota,dto,domiciliado,domicilia_bco \
      FROM vista_cuotas WHERE fecha = (SELECT MAX(fecha) FROM cuotas) ORDER BY id_parcela";
  
  const query_filtered = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_parcela,titular,estado,cuota,dto,domiciliado,domicilia_bco \
      FROM vista_cuotas WHERE fecha = (SELECT MAX(fecha) FROM cuotas) AND domicilia_bco=$1 ORDER BY id_parcela";
  
  const query = reset_filter ? query_unfiltered : query_filtered;
  const params = reset_filter ? [] : [domicilia_bco];
  const result = await pool.query(query, params);
  if (result.rows.length === 0) {
    throw new Error('No se encontraron cuotas actuales');
  }
  return result.rows.map(row => ({
    e: row.e,
    fecha: row.fecha ? row.fecha : null,
    id_parcela: row.id_parcela,
    titular: row.titular,
    estado: row.estado,
    cuota: row.cuota ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.cuota) : null,
    dto: row.dto ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.dto) : null,
    domiciliado: row.domiciliado ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.domiciliado) : null,
    domicilia_bco: row.domicilia_bco ? 'Sí' : 'No'
  }));
    
  }

  async getResidentsCurrentDueCSV(domicilia_bco, reset_filter) {
    const query_unfiltered = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_parcela,titular,estado,cuota,dto,domiciliado,domicilia_bco \
        FROM vista_cuotas WHERE fecha = (SELECT MAX(fecha) FROM cuotas) ORDER BY id_parcela";
    
    const query_filtered = "SELECT e,to_char(fecha,'DD-MM-YYYY') AS fecha,id_parcela,titular,estado,cuota,dto,domiciliado,domicilia_bco \
      FROM vista_cuotas WHERE fecha = (SELECT MAX(fecha) FROM cuotas) AND domicilia_bco=$1 ORDER BY id_parcela";
    
    const query = reset_filter ? query_unfiltered : query_filtered;
    const params = reset_filter ? [] : [domicilia_bco];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron cuotas actuales');
    }
    return result.rows.map(row => ({
      fecha: row.fecha ? row.fecha : null,
      id_parcela: row.id_parcela,
      titular: row.titular,
      estado: row.estado,
      cuota: row.cuota ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.cuota) : null,
      dto: row.dto ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.dto) : null,
      domiciliado: row.domiciliado ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.domiciliado) : null,
      domicilia_bco: row.domicilia_bco ? 'Sí' : 'No'
    }));
  }

  async setResidentsCurrentDueProtected(estado) {
    const result = await pool.query("UPDATE cuotas SET estado=$1 WHERE fecha = (SELECT MAX(fecha) FROM cuotas) RETURNING estado", [estado]);
    if (result.rowCount === 0) {
      throw new Error('No se encontraron cuotas para actualizar');
    }
    return { message: 'Estado de las cuotas actualizado correctamente' };
  }


  async setResidentsCurrentDueNewDate(fecha) {
    const result = await pool.query("INSERT INTO cuotas (id_parcela,fecha,cuota,notas,dto,domicilia_bco) \
            SELECT id_parcela,$1,cuota,notas,dto,domicilia_bco \
            FROM cuotas WHERE fecha=(SELECT MAX(fecha) FROM cuotas) RETURNING fecha", [fecha]);
    if (result.rowCount === 0) {
      throw new Error('No se encontraron cuotas para actualizar');
    }
    return { message: 'Fecha de las cuotas actualizada correctamente' };
  }

  async getResidentsCurrentRemittance(domicilia_bco, reset_filter) {
    const query_unfiltered = "SELECT id_parcela,titular,bic,iban,cuota,dto,domiciliado FROM vista_cuotas \
      WHERE fecha=(SELECT MAX(fecha) FROM cuotas) ORDER BY id_parcela";

    const query_filtered = "SELECT id_parcela,titular,bic,iban,cuota,dto,domiciliado FROM vista_cuotas \
      WHERE fecha=(SELECT MAX(fecha) FROM cuotas ) AND domicilia_bco=$1 ORDER BY id_parcela";
    // Si reset_filter es true, usamos la consulta sin filtro
    const query = reset_filter ? query_unfiltered : query_filtered;
    const params = reset_filter ? [] : [domicilia_bco];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron remesas actuales');
    }
    return result.rows.map(row => ({
      id_parcela: row.id_parcela,
      titular: row.titular,
      cuota: row.cuota ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.cuota) : null,
      dto: row.dto ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.dto) : null,
      domiciliado: row.domiciliado ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.domiciliado) : null,
    }));
  }
 
  async getResidentsCurrentRemittanceCSV(domicilia_bco, reset_filter) {
    const query_unfiltered = "SELECT id_parcela,titular,bic,iban,cuota,dto,domiciliado FROM vista_cuotas \
      WHERE fecha=(SELECT MAX(fecha) FROM cuotas) ORDER BY id_parcela";
    const query_filtered = "SELECT id_parcela,titular,bic,iban,cuota,dto,domiciliado FROM vista_cuotas \
      WHERE fecha=(SELECT MAX(fecha) FROM cuotas ) AND domicilia_bco=$1 ORDER BY id_parcela";
    // Si reset_filter es true, usamos la consulta sin filtro
    const query = reset_filter ? query_unfiltered : query_filtered;
    const params = reset_filter ? [] : [domicilia_bco];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron remesas actuales');
    }
    return result.rows.map(row => ({
      id_parcela: row.id_parcela,
      titular: row.titular,
      cuota: row.cuota ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.cuota) : null,
      dto: row.dto ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.dto) : null,
      domiciliado: row.domiciliado ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.domiciliado) : null,
      domicilia_bco: row.domicilia_bco === 't' ? 'Sí' : 'No'
    }));
  }

  async getResidentsCurrentRemittanceStatistics() {
    const result = await pool.query("SELECT to_char(fecha,'DD-MM-YYYY') AS fecha,cuota,\
      domiciliado,no_domiciliado,(domiciliado + no_domiciliado) AS recaudado \
          FROM estadistica_cuotas WHERE fecha = (SELECT MAX(fecha) FROM cuotas)");
    if (result.rows.length === 0) {
      throw new Error('No se encontraron estadísticas de remesas actuales');
    }
    return result.rows[0];
  }

  async getResidentsRemittanceStatistics() {
    const result = await pool.query("SELECT to_char(fecha,'DD-MM-YYYY') AS fecha,cuota,domiciliado,no_domiciliado,(domiciliado + no_domiciliado) AS recaudado \
          FROM estadistica_cuotas WHERE age(fecha) <= '5 years' ");
    if (result.rows.length === 0) {
      throw new Error('No se encontraron estadísticas de remesas');
    }
    return result.rows;
  }


  async getResidentsDuesHistory(fecha) {
    const result = await pool.query("SELECT e,fecha,id_parcela,titular,estado,cuota,dto,domiciliado,domicilia_bco \
      FROM vista_cuotas WHERE fecha = $1 ORDER BY id_parcela", [fecha]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron cuotas para la fecha especificada');
    }
    return result.rows;
  }


  async getResidentsSpecialRemittances() {
    const result = await pool.query("SELECT *,id_remesa as id, to_char(fecha_mandato,'YYYY-MM-DD') AS fecha_mandato FROM remesas_especiales");
    if (result.rows.length === 0) {
      throw new Error('No se encontraron remesas especiales');
    }
    return result.rows;
  }

  async writeResidentsCurrentBankRemittance(fecha_cobro) {
    
    try {
      const result = await pool.query("SELECT * FROM remesa_cuotas_sepa($1)",[fecha_cobro]);
      if (result.rowCount === 0) {
        throw new Error('No se pudo crear la remesa bancaria de cuotas');
      }
      const dirPath = path.join(__dirname, '../downloads');
      const filePath = path.resolve(dirPath, `remesa_cuotas_sepa.dat`);
      //console.log('Remesa:',result.rows[0].remesa);
      fs.writeFileSync(filePath,result.rows[0].remesa);
      return result.rows;
    } catch (error) {
      console.error('Error al escribir la remesa bancaria de agua:', error);
      throw error;
    }
  }

  async newResidentsSpecialRemittances(id_parcela,titular,bic,iban,importe,concepto,fecha_mandato){
    if(id_parcela && titular && bic && iban && importe && concepto && fecha_mandato){
      const result = await pool.query("INSERT INTO remesas_especiales (id_parcela,titular,bic,iban,importe,concepto,fecha_mandato) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [id_parcela,titular,bic,iban,importe,concepto,fecha_mandato]);
      if (result.rowCount === 0) {
        throw new Error('No se pudo crear la remesa especial');
      }
      return result.rows[0];
    }

  }


  async modifyResidentsSpecialRemittances(id_parcela,id_remesa,titular,bic,iban,importe,concepto,fecha_mandato){
    if(id_parcela && id_remesa && titular && bic && iban && importe && concepto && fecha_mandato && id_remesa){
      const result = await pool.query("UPDATE remesas_especiales SET id_parcela=$1,titular=$3,bic=$4,iban=$5,importe=$6,concepto=$7,fecha_mandato=$8 WHERE id_remesa = $2 RETURNING *",
        [id_parcela,id_remesa,titular,bic,iban,importe,concepto,fecha_mandato]);
      if (result.rowCount === 0) {
        throw new Error('No se pudo modificar la remesa especial');
      }
      return result.rows[0];
    }
  }


  async deleteResidentsSpecialRemittances(selected_ids) {
    if(selected_ids && selected_ids.length > 0){
      // Asegurarse de que selected_ids es un array de enteros
      if (!Array.isArray(selected_ids) || !selected_ids.every(id => Number.isInteger(id))) {
        throw new Error('selected_ids debe ser un array de enteros');
      }
      const result = await pool.query("DELETE FROM remesas_especiales WHERE id_remesa = ANY ($1) RETURNING *",  
        [selected_ids]);
      if (result.rowCount === 0) {
        throw new Error('No se pudo eliminar la remesa especial');
      }
      return result.rows[0];
    }
  }

  async writeResidentsSpecialBankRemittance(fecha_cobro, selected_ids) {
    try {
      const result = await pool.query("SELECT * FROM remesa_sepa($1,$2)",[fecha_cobro, selected_ids]);
      if (result.rowCount === 0) {
        throw new Error('No se pudo crear la remesa bancaria de agua');
      }
      const dirPath = path.join(__dirname, '../downloads');
      const filePath = path.resolve(dirPath, `remesa_especial_sepa.dat`);
      fs.writeFileSync(filePath, result.rows[0].remesa);
      return result.rows;
    } catch (error) {
      console.error('Error al escribir la remesa bancaria de agua:', error);
      throw error;
    }
  }





} // End of ResidentService class

module.exports = new ResidentService();