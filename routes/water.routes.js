/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const router = require('express').Router()
const waterController = require('../controllers/water.controller')
const WaterService = require('../services/water.service')

const {authenticateJWT, checkRole } = require('../middleware/auth.middleware')

// Rutas públicas
router.get('/', (req, res) => {
    res.json({ info: 'Node.js, Express, and Postgres API' })
  })
router.get('/test-pdf/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const pdfBuffer = await WaterService.generateWaterReceiptByParcelId(
        id,
        '2024-04-14',
        100,
        200,
        100,
        true
      );
      
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Rutas protegidas
  //router.get('/protected', authenticateJWT, (req, res) => {
  //  res.json({ message: 'Ruta protegida' });
  //});

router.get('/history/:id', authenticateJWT, waterController.getWaterReadingsById)
router.post('/receipt/:id', authenticateJWT, waterController.generateWaterReceipt)
router.post('/currentremittances', authenticateJWT, waterController.getWaterCurrentRemittances)
router.post('/currentremittances/parcel', authenticateJWT, waterController.getWaterCurrentRemittancesById) 
router.post('/currentremittances/csv', authenticateJWT, waterController.getWaterCurrentRemittancesCSV)
router.get('/currentremittances/statistics',authenticateJWT, waterController.getWaterStatisticsCurrentRemittances)
router.get('/statistics/:id/:years', authenticateJWT, waterController.getWaterStatisticsById) 
router.get('/statistics/current', authenticateJWT, waterController.getWaterStatisticsCurrent)
router.post('/currentreading', authenticateJWT, waterController.getWaterCurrentReading) 
router.post('/currentreading/route', authenticateJWT, waterController.getWaterCurrentReadingRoute) 
router.get('/currentreading/:id', authenticateJWT, waterController.getWaterCurrentReadingById)
router.post('/currentreading/:id/update', authenticateJWT, waterController.setWaterCurrentReadingById) 
router.post('/currentreading/:id/setmeter', authenticateJWT, waterController.setWaterMeterById) 
router.post('/currentreading/protect', authenticateJWT, waterController.setWaterCurrentReadingProtected) 
router.post('/currentreading/newdate', authenticateJWT, waterController.setWaterCurrentReadingNewDate)
router.post('/currentreading/changedate', authenticateJWT, waterController.setWaterCurrentReadingChangeDate)
router.post('/currentreading/csv', authenticateJWT, waterController.getWaterCurrentReadingCSV)
router.post('/bankremittance', authenticateJWT, waterController.writeWaterBankRemittance)
router.get('/bankremittance', authenticateJWT, waterController.downloadWaterBankRemittance)
router.post('/readings', authenticateJWT, waterController.getWaterReadingsByDate)
router.post('/irrigation/currentreading', authenticateJWT, waterController.getIrrigationWaterCurrentReading) 
router.get('/irrigation/currentreading/:id', authenticateJWT, waterController.getIrrigationWaterCurrentReadingById) 
router.get('/irrigation/readings/:id', authenticateJWT, waterController.getIrrigationWaterReadingsById)
router.post('/irrigation/currentreading/:id/update', authenticateJWT, waterController.setIrrigationWaterCurrentReadingById)
router.post('/irrigation/currentreading/:id/setmeter', authenticateJWT, waterController.setIrrigationWaterMeterById)
router.post('/irrigation/currentreading/csv', authenticateJWT, waterController.getIrrigationWaterCurrentReadingCSV) 
router.post('/irrigation/currentreading/protect', authenticateJWT, waterController.setIrrigationWaterCurrentReadingProtected) 
router.post('/irrigation/currentreading/newdate', authenticateJWT, waterController.setIrrigationWaterCurrentReadingNewDate)
router.post('/supply/currentreading', authenticateJWT, waterController.getWaterSupplyCurrentReading)
router.get('/supply/currentreading/:id', authenticateJWT, waterController.getWaterSupplyCurrentReadingById)
router.post('/supply/currentreading/:id/update', authenticateJWT, waterController.setWaterSupplyCurrentReadingById)
router.post('/supply/currentreading/protect', authenticateJWT, waterController.setWaterSupplyCurrentReadingProtected)
router.post('/supply/currentreading/newdate', authenticateJWT, waterController.setWaterSupplyCurrentReadingNewDate)

  

router.get('/admin', authenticateJWT, checkRole('admin'), (req, res) => {
    res.json({ message: 'Ruta de administrador' });
  });

//router.post('/:date/statistics', authenticateJWT, waterController.getWaterStatistics)
//router.get('/current/statistics', authenticateJWT, waterController.getWaterStatisticsCurrent)
//router.get('/current/remittances/statistics', authenticateJWT, waterController.getWaterStatisticsCurrentRemittance)
// ... resto de rutas de water

module.exports = router