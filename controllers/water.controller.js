/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const WaterService = require('../services/water.service')
const csv = require('@fast-csv/format');
const path = require('path');

exports.getWaterCurrentRemittancesById = async (req, res) => {
  try {
    const { id_parcela } = req.body
    const remittance = await WaterService.getWaterCurrentRemittancesById(id_parcela)
    res.json(remittance)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getWaterStatisticsById = async (req, res) => {
  try {
    const id = req.params.id
    const years = req.params.years + ' year'
    const waterData = await WaterService.getWaterStatisticsById(id, years)
    res.json(waterData)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getWaterReadingsById = async (req, res) => {
  try {
    const { id } = req.params
    const readings = await WaterService.getWaterReadingsById(id)
    res.json(readings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.generateWaterReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('ID:', id);
    const { id_parcela, lectura, l1, l2, m3, domiciliado } = req.body;

    const pdfBuffer = await WaterService.generateWaterReceiptByParcelId(
      id_parcela, 
      lectura, 
      l1, 
      l2, 
      m3, 
      domiciliado
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-${id_parcela}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getWaterStatisticsCurrent = async (req, res) => {
  try {
    const stats = await WaterService.getCurrentStatistics()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getWaterCurrentReading = async (req, res) => {
  try {
    const {estado,averiado,inactivo,domicilia_bco,reset_filter} = req.body;
    const currentreading = await WaterService.getCurrentReading(estado,averiado,inactivo,domicilia_bco,reset_filter)
    res.json(currentreading)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getWaterCurrentReadingRoute = async (req, res) => {
  try {
    const route_reading = await WaterService.getCurrentReadingRoute();
    res.json(route_reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


exports.getWaterCurrentReadingById = async (req, res) => {
  const { id } = req.params;
  try {
    const currentReading = await WaterService.getWaterCurrentReadingById(id);
    res.json(currentReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
}


exports.setWaterMeterById = async (req, res) => {
  const { id } = req.params;
  const { l1, user_modif } = req.body;
  try {
    const updatedReading = await WaterService.setWaterMeterById(id, l1, user_modif);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


exports.setWaterCurrentReadingById = async (req, res) => {
  const { id } = req.params;
  const { l1,l2,m3,averiado,inactivo,notas,domicilia_bco,user_modif } = req.body;
  // Validar que l2 y m3 son números
  if (typeof l2 !== 'number' || typeof m3 !== 'number') {
    throw new Error('l2 y m3 deben ser números');
  }
  if(l2 !== null){
    try {
      const updatedReading = await WaterService.setWaterCurrentReadingById(id,l1,l2,m3,averiado,inactivo,notas,domicilia_bco,user_modif);
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }else {
    res.status(400).json({ error: 'l2 no puede ser nulo' });
  }
    
} 

exports.setWaterCurrentReadingProtected = async (req, res) => {
  const { estado } = req.body;
    try {
      const updatedReading = await WaterService.setWaterCurrentReadingProtected(estado);
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

exports.setWaterCurrentReadingNewDate = async (req, res) => {
  const { fecha } = req.body;
  try {
    const updatedReading = await WaterService.setWaterCurrentReadingNewDate(fecha);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.setWaterCurrentReadingChangeDate = async (req, res) => {
  const { fecha } = req.body;
  try {
    const updatedReading = await WaterService.setWaterCurrentReadingChangeDate(fecha);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 

exports.getWaterCurrentReadingCSV = async (req, res) => {
  try {
  const {estado,averiado,inactivo,domicilia_bco,reset_filter} = req.body;
    const data = await WaterService.getWaterCurrentReadingCSV(estado,averiado,inactivo,domicilia_bco,reset_filter);
    //console.log('data:', data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=lecturas.csv');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    // Crear stream directamente a la respuesta
    const csvStream = csv.format({ headers: true, delimiter: '|' });
    csvStream.pipe(res);
    // Escribir datos
    data.forEach(row => csvStream.write(row));
    // Finalizar stream
    csvStream.end();
  }catch (error) {
    res.status(500).json({ error: error.message });
  } 
}

exports.getWaterCurrentRemittances = async (req, res) => {
  try {
    const {ordena_columna,domicilia_bco,reset_filter} = req.body;
    const remittances = await WaterService.getWaterCurrentRemittances(ordena_columna,domicilia_bco,reset_filter);
    res.json(remittances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getWaterStatisticsCurrentRemittances = async (req, res) => {
  try {
    const stats = await WaterService.getWaterStatisticsCurrentRemittances();
    res.json(stats);
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getWaterCurrentRemittancesCSV = async (req, res) => { 
  try {
    const {ordena_columna,domicilia_bco,reset_filter} = req.body;
    const data = await WaterService.getWaterCurrentRemittancesCSV(ordena_columna,domicilia_bco,reset_filter);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=remesas.csv');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    
    // Crear stream directamente a la respuesta
    const csvStream = csv.format({ headers: true, delimiter: '|' });
    csvStream.pipe(res);
    
    // Escribir datos
    data.forEach(row => csvStream.write(row));
    
    // Finalizar stream
    csvStream.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 

exports.writeWaterBankRemittance = async (req, res) => {
  try {
    const { fecha_cobro } = req.body;
    const remittances = await WaterService.writeWaterBankRemittance(fecha_cobro);
    res.json(remittances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.downloadWaterBankRemittance = async (req, res) => {
  try {
    const dirPath = path.join(__dirname, '../downloads')
    const filePath = path.resolve(dirPath, `remesa_agua_sepa.dat`)
    res.download(filePath)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getWaterReadingsByDate = async (req, res) => {
  try {
    const { lectura } = req.body;
    const readings = await WaterService.getWaterReadingsByDate(lectura);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getIrrigationWaterCurrentReading = async (req, res) => {
  try {
    const { estado, averiado } = req.body;
    const irrigationReading = await WaterService.getIrrigationWaterCurrentReading(estado, averiado);
    res.json(irrigationReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getIrrigationWaterCurrentReadingById = async (req, res) => {
  const { id } = req.params;
  try {
    const irrigationReading = await WaterService.getIrrigationWaterCurrentReadingById(id);
    res.json(irrigationReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getIrrigationWaterReadingsById = async (req, res) => {
  const { id } = req.params;
  try {
    const irrigationReadings = await WaterService.getIrrigationWaterReadingsById(id);
    res.json(irrigationReadings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getIrrigationWaterCurrentReadingCSV = async (req, res) => {
   try {
    const data = await WaterService.getIrrigationWaterCurrentReadingCSV();
    //console.log('data:', data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=lecturas.csv');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    // Crear stream directamente a la respuesta
    const csvStream = csv.format({ headers: true, delimiter: '|' });
    csvStream.pipe(res);
    // Escribir datos
    data.forEach(row => csvStream.write(row));
    // Finalizar stream
    csvStream.end();
  }catch (error) {
    res.status(500).json({ error: error.message });
  }
}


exports.setIrrigationWaterCurrentReadingById = async (req, res) => {
  const { id } = req.params;
  const { l1,l2,m3,averiado,notas } = req.body;
  // Validar que l2 y m3 son números
  if (typeof l2 !== 'number' || typeof m3 !== 'number') {
    throw new Error('l2 y m3 deben ser números');
  }
  if(l2 !== null){
    try {
      const updatedReading = await WaterService.setIrrigationWaterCurrentReadingById(id,l1,l2,m3,averiado,notas);
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }else {
    res.status(400).json({ error: 'l2 no puede ser nulo' });
  }
}

exports.setIrrigationWaterMeterById = async (req, res) => {
  const { id } = req.params;
  const { l1 } = req.body;
  try {
    const updatedReading = await WaterService.setIrrigationWaterMeterById(id, l1);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.setIrrigationWaterCurrentReadingProtected = async (req, res) => {
  const { estado } = req.body;
  try {
    const updatedReading = await WaterService.setIrrigationWaterCurrentReadingProtected(estado);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.setIrrigationWaterCurrentReadingNewDate = async (req, res) => {
  const { fecha } = req.body;
  try {
    const updatedReading = await WaterService.setIrrigationWaterCurrentReadingNewDate(fecha);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getWaterSupplyCurrentReading = async (req, res) => {
  try {
    const { estado, averiado } = req.body;
    const supplyReading = await WaterService.getWaterSupplyCurrentReading(estado, averiado);
    res.json(supplyReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getWaterSupplyCurrentReadingById = async (req, res) => {
  const { id } = req.params;
  try {
    const supplyReading = await WaterService.getWaterSupplyCurrentReadingById(id);
    res.json(supplyReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.setWaterSupplyCurrentReadingById = async (req, res) => {
  const { id } = req.params;
  const { l1,l2,m3,averiado,notas} = req.body;
  // Validar que l2 y m3 son números
  if (typeof l2 !== 'number' || typeof m3 !== 'number') {
    throw new Error('l2 y m3 deben ser números');
  }
  if(l2 !== null){
    try {
      const updatedReading = await WaterService.setWaterSupplyCurrentReadingById(id, l1, l2, m3, averiado, notas);
      res.json(updatedReading);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }else {
    res.status(400).json({ error: 'l2 no puede ser nulo' });
  }
}

exports.setWaterSupplyCurrentReadingProtected = async (req, res) => {
  const { estado } = req.body;
  try {
    const updatedReading = await WaterService.setWaterSupplyCurrentReadingProtected(estado);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.setWaterSupplyCurrentReadingNewDate = async (req, res) => {
  const { fecha } = req.body;
  try {
    const updatedReading = await WaterService.setWaterSupplyCurrentReadingNewDate(fecha);
    res.json(updatedReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ... resto de controladores