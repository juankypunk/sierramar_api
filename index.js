/**
 * MIT License
 *
 * Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * 1. The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * 2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const express = require('express')
const cookieParser = require('cookie-parser')
const configureApp = require('./config/app')

const authRoutes = require('./routes/auth.routes')
const waterRoutes = require('./routes/water.routes')
const residentRoutes = require('./routes/resident.routes')
const employeeRoutes = require('./routes/employee.routes')
const userRoutes = require('./routes/user.routes')
const pushRoutes = require('./routes/push.routes')
const webpushRoutes = require('./routes/webpush.routes')

const app = express()
const port = process.env.PORT || 3030

// Configuración de la aplicación
configureApp(app)

// Rutas
app.use(cookieParser())
app.use('/auth', authRoutes)
app.use('/water', waterRoutes)
app.use('/residents', residentRoutes)
app.use('/employees', employeeRoutes)
app.use('/users', userRoutes)
// Ruta para guardar suscripciones push
app.use('/push', pushRoutes)
// Rutas para enviar notificaciones push
app.use('/webpush', webpushRoutes)

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})