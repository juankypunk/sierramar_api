/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const router = require('express').Router()
const userController = require('../controllers/user.controller')
const {authenticateJWT, checkRole } = require('../middleware/auth.middleware')

// Rutas públicas
router.get('/', (req, res) => {
    res.json({ info: 'Node.js, Express, and Postgres API' })
  })

// Rutas protegidas
  //router.get('/protected', authenticateJWT, (req, res) => {
  //  res.json({ message: 'Ruta protegida' });
  //});

router.get('/:id', authenticateJWT, userController.getUserById);

router.put('/:id/update', authenticateJWT, userController.updateUserById);

  
router.get('/admin', authenticateJWT, checkRole('admin'), (req, res) => {
    res.json({ message: 'Ruta de administrador' });
  });



// ... resto de rutas

module.exports = router