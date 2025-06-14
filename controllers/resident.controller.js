/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const e = require('express')
const residentService = require('../services/resident.service')
const csv = require('@fast-csv/format');
const path = require('path');



exports.getResidentContactCSV = async (req, res) => {
  try {
    const data = await residentService.getResidentContactCSV()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=resident_contacts.csv')
    res.setHeader('Content-Transfer-Encoding', 'binary');
    // Crear stream directamente a la respuesta
    const csvStream = csv.format({ headers: true, delimiter: '|' });
    csvStream.pipe(res);
    // Escribir datos
    data.forEach(row => csvStream.write(row));
    // Finalizar stream
    csvStream.end();
  }
  catch (error) {
    res.status(500).json({ error: error.message })
  }
}


exports.getResidentParcelById = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const parcel = await residentService.getResidentParcelById(id)
    res.json(parcel)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentDuesByParcelId = async (req, res) => { 
  try {
    const id_parcela = req.params.id_parcela
    const dues = await residentService.getResidentDuesByParcelId(id_parcela)
    res.json(dues)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentCurrentDuesByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const currentDue = await residentService.getResidentCurrentDuesByParcelId(id_parcela)
    res.json(currentDue)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentReceiptByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const { fecha,cuota,dto,domiciliado } = req.body
    const pdfBuffer = await residentService.generateResidentReceiptByParcelId(
      id_parcela,
      fecha,
      cuota,
      dto,
      domiciliado
    )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=recibo-cuota-${id_parcela}.pdf`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentByName = async (req, res) => {
  try {
    const chunk = req.params.chunk
    const residents = await residentService.getResidentByName(chunk)
    res.json(residents)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentList = async (req, res) => {
  try {
    const residents = await residentService.getResidentList()
    res.json(residents)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentLocationByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const location = await residentService.getResidentLocationByParcelId(id_parcela)
    res.json(location)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.setResidentLocationByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const { geolocation, notas } = req.body
    const result = await residentService.setResidentLocationByParcelId(id_parcela, geolocation, notas)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
  
exports.getResidentContactByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const contact = await residentService.getResidentContactByParcelId(id_parcela)
    res.json(contact)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.setResidentContactByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const { titular,titular2,email,email2,domicilio,localidad,cp,telef1,telef2,telef3 } = req.body
    const result = await residentService.setResidentContactByParcelId(id_parcela,titular,titular2,email,email2,domicilio,localidad,cp,telef1,telef2,telef3)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentBankByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const bank = await residentService.getResidentBankByParcelId(id_parcela)
    res.status(200).json(bank)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.setResidentBankByParcelId = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela
    const { titular_cc_cuota,bic_cuota,iban_cuota,titular_cc_agua,bic_agua,iban_agua,fecha_mandato,nif_titular_cc_agua } = req.body
    const result = await residentService
      .setResidentBankByParcelId(id_parcela,titular_cc_cuota,bic_cuota,iban_cuota,titular_cc_agua,bic_agua,iban_agua,fecha_mandato,nif_titular_cc_agua)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getResidentsCurrentDue = async (req, res) => {
  try {
    const {domicilia_bco,reset_filter} = req.body;
    
    const currentDue = await residentService.getResidentsCurrentDue(domicilia_bco, reset_filter)
    if (!currentDue || currentDue.length === 0) {
      return res.status(404).json({ message: 'No se encontraron cuotas actuales' });
    }
    res.json(currentDue)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
} 

exports.getResidentsCurrentDueCSV = async (req, res) => {
  try {
    const {domicilia_bco,reset_filter} = req.body;
    const data = await residentService.getResidentsCurrentDueCSV(domicilia_bco, reset_filter)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=residents_current_due.csv')
    res.setHeader('Content-Transfer-Encoding', 'binary');
    // Crear stream directamente a la respuesta
    const csvStream = csv.format({ headers: true, delimiter: '|' });
    csvStream.pipe(res);
    // Escribir datos
    data.forEach(row => csvStream.write(row));
    // Finalizar stream
    csvStream.end();
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.setResidentsCurrentDueProtected = async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await residentService.setResidentsCurrentDueProtected(estado);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.setResidentsCurrentDueNewDate = async (req, res) => {
  try {
    const { fecha } = req.body;
    const result = await residentService.setResidentsCurrentDueNewDate(fecha);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getResidentsCurrentRemittance = async (req, res) => {
  try {
    const {domicilia_bco,reset_filter} = req.body;
    const remittance = await residentService.getResidentsCurrentRemittance(domicilia_bco, reset_filter);
    if (!remittance || remittance.length === 0) {
      return res.status(404).json({ message: 'No se encontraron remesas actuales' });
    }
    res.json(remittance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getResidentsCurrentRemittanceCSV = async (req, res) => {
  try {
    const {domicilia_bco,reset_filter} = req.body;
    const data = await residentService.getResidentsCurrentRemittanceCSV(domicilia_bco, reset_filter);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=residents_current_remittance.csv');
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

exports.getResidentsCurrentRemittanceStatistics = async (req, res) => {
  try {
    const statistics = await residentService.getResidentsCurrentRemittanceStatistics();
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getResidentsRemittanceStatistics = async (req, res) => {
  try {
    const statistics = await residentService.getResidentsRemittanceStatistics();
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.getResidentsDuesHistory = async (req, res) => {
  try {
    const { fecha } = req.body;
    const dues = await residentService.getResidentsDuesHistory(fecha);
    if (!dues || dues.length === 0) {
      return res.status(404).json({ message: 'No se encontraron deudas' });
    }
    res.json(dues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 

exports.getResidentsSpecialRemittances = async (req, res) => {
  try {
    const specialRemittances = await residentService.getResidentsSpecialRemittances();
    res.json(specialRemittances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.writeResidentsCurrentBankRemittance = async (req, res) => {
  try {
    const { fecha_cobro } = req.body;
    const result = await residentService.writeResidentsCurrentBankRemittance(fecha_cobro);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.downloadResidentsCurrentBankRemittance = async (req, res) => {
  try {
      const dirPath = path.join(__dirname, '../downloads')
      const filePath = path.resolve(dirPath, `remesa_cuotas_sepa.dat`)
      res.download(filePath)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
}

exports.newResidentsSpecialRemittances = async (req, res) => {  
  try {
    const {id_parcela,titular,bic,iban,importe,concepto,fecha_mandato } = req.body;
    const result = await residentService.newResidentsSpecialRemittances(id_parcela,titular,bic,iban,importe,concepto,fecha_mandato );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.modifyResidentsSpecialRemittances = async (req, res) => {
  try {
    const id_parcela = req.params.id_parcela;
    const {id_remesa,titular,bic,iban,importe,concepto,fecha_mandato } = req.body;
    const result = await residentService.modifyResidentsSpecialRemittances(id_parcela,id_remesa,titular,bic,iban,importe,concepto,fecha_mandato );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.deleteResidentsSpecialRemittances = async (req, res) => {
  try { 
    const { selected_ids } = req.body;
    const result = await residentService.deleteResidentsSpecialRemittances(selected_ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.writeResidentsSpecialBankRemittance = async (req, res) => {
  try {
    const { fecha_cobro, selected_ids } = req.body;
    const result = await residentService.writeResidentsSpecialBankRemittance(fecha_cobro, selected_ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

exports.downloadResidentsSpecialBankRemittance = async (req, res) => {
  try {
    const dirPath = path.join(__dirname, '../downloads')
    const filePath = path.resolve(dirPath, `remesa_especial_sepa.dat`)
    res.download(filePath)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}



// ... resto de controladores