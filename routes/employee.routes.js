/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const router = require('express').Router()
const employeeController = require('../controllers/employee.controller')
const {authenticateJWT, checkRole } = require('../middleware/auth.middleware')

// Rutas públicas
router.get('/', (req, res) => {
    res.json({ info: 'Node.js, Express, and Postgres API' })
  })

// Rutas protegidas
  //router.get('/protected', authenticateJWT, (req, res) => {
  //  res.json({ message: 'Ruta protegida' });
  //});

router.post('/public-holidays', authenticateJWT, employeeController.getPublicHolidays)
router.get('/geteventslabel', authenticateJWT, employeeController.getEventsLabel)
router.get('/:id/geteventslabel', authenticateJWT, employeeController.getEventsLabel)
router.post('/events', authenticateJWT, employeeController.getEvents)
router.post('/:id/events', authenticateJWT, employeeController.getEventsForUser)
router.post('/:id/holidays', authenticateJWT, employeeController.getHolidaysForUser)
router.get('/byname/:name', authenticateJWT, employeeController.getEmployeeByName);
router.post('/:id/planning', authenticateJWT, employeeController.getPlanningForUser);
router.post('/:id/scheduledhours', authenticateJWT, employeeController.getScheduledHoursForUser);
router.post('/:id/updateplanning', authenticateJWT, employeeController.updatePlanningForUser);
router.post('/:id/newevent', authenticateJWT, employeeController.createNewEventForUser);
router.post('/:id/deleteevent', authenticateJWT, employeeController.deleteEventForUser);
router.post('/:id/getsignings', authenticateJWT, employeeController.getSigningsForUser);
router.post('/:id/getworkedhours', authenticateJWT, employeeController.getWorkedHoursForUser);
router.post('/:id/getextraworkedhours', authenticateJWT, employeeController.getExtraWorkedHoursForUser);
router.get('/:id/getrawsignings', authenticateJWT, employeeController.getRawSigningsForUser);
router.post('/:id/deletesigning', authenticateJWT, employeeController.deleteSigningForUser);
router.post('/:id/updatesigning', authenticateJWT, employeeController.updateSigningForUser);
//router.post('/:id/createsigning', authenticateJWT, employeeController.createSigningForUser);
router.get('/:id/lastsigning', authenticateJWT, employeeController.getLastSigningForUser);
router.post('/sign', authenticateJWT, employeeController.signUser);

  
router.get('/admin', authenticateJWT, checkRole('admin'), (req, res) => {
    res.json({ message: 'Ruta de administrador' });
  });



// ... resto de rutas

module.exports = router