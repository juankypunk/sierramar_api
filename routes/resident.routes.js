/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const router = require('express').Router()
const residentController = require('../controllers/resident.controller')
const {authenticateJWT, checkRole } = require('../middleware/auth.middleware')

// Rutas públicas
router.get('/', (req, res) => {
    res.json({ info: 'Node.js, Express, and Postgres API' })
  })

// Rutas protegidas
  //router.get('/protected', authenticateJWT, (req, res) => {
  //  res.json({ message: 'Ruta protegida' });
  //});
// Rutas de administrador
  //router.get('/admin', authenticateJWT, checkRole('admin'), (req, res) => {
  //  res.json({ message: 'Ruta de administrador' });
  //});

router.get('/contact/csv', authenticateJWT, residentController.getResidentContactCSV)  
router.get('/parcel/:id', authenticateJWT, residentController.getResidentParcelById)
router.get('/byname/:chunk', authenticateJWT, residentController.getResidentByName)
router.get('/list', authenticateJWT, residentController.getResidentList)
router.get('/:id_parcela/location', authenticateJWT, residentController.getResidentLocationByParcelId)
router.post('/:id_parcela/location', authenticateJWT, residentController.setResidentLocationByParcelId)
router.get('/:id_parcela/contact', authenticateJWT, residentController.getResidentContactByParcelId)
router.post('/:id_parcela/contact', authenticateJWT, residentController.setResidentContactByParcelId)
router.get('/:id_parcela/bank', authenticateJWT, residentController.getResidentBankByParcelId)
router.post('/:id_parcela/bank', authenticateJWT, residentController.setResidentBankByParcelId)


router.post('/currentdues', authenticateJWT, residentController.getResidentsCurrentDue)
router.post('/currentdues/csv', authenticateJWT, residentController.getResidentsCurrentDueCSV)
router.post('/currentdues/protect', authenticateJWT, residentController.setResidentsCurrentDueProtected)
router.post('/currentdues/newdate', authenticateJWT, residentController.setResidentsCurrentDueNewDate)
router.post('/dues/history', authenticateJWT,residentController.getResidentsDuesHistory)
router.get('/:id_parcela/dues', authenticateJWT, residentController.getResidentDuesByParcelId)
router.get('/:id_parcela/currentdue', authenticateJWT, residentController.getResidentCurrentDuesByParcelId)
router.post('/:id_parcela/receipt', authenticateJWT, residentController.getResidentReceiptByParcelId)


router.post('/currentremittances', authenticateJWT, residentController.getResidentsCurrentRemittance)
router.post('/currentremittances/csv', authenticateJWT, residentController.getResidentsCurrentRemittanceCSV)
router.get('/currentremittances/statistics', authenticateJWT, residentController.getResidentsCurrentRemittanceStatistics)
router.get('/remittances/statistics', authenticateJWT, residentController.getResidentsRemittanceStatistics)
router.post('/currentremittances/bankremittance', authenticateJWT, residentController.writeResidentsCurrentBankRemittance)
router.get('/currentremittances/bankremittance', authenticateJWT, residentController.downloadResidentsCurrentBankRemittance)


router.get('/specialremittances', authenticateJWT, residentController.getResidentsSpecialRemittances)
router.post('/specialremittances/new', authenticateJWT, residentController.newResidentsSpecialRemittances)
router.post('/specialremittances/modify/:id_parcela', authenticateJWT, residentController.modifyResidentsSpecialRemittances)
router.post('/specialremittances/delete', authenticateJWT, residentController.deleteResidentsSpecialRemittances)
router.post('/specialremittances/bankremittance', authenticateJWT, residentController.writeResidentsSpecialBankRemittance)
router.get('/specialremittances/bankremittance', authenticateJWT, residentController.downloadResidentsSpecialBankRemittance)

module.exports = router