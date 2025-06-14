/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config()
const pool = require('../config/database');
const crypto = require('crypto');
const e = require('express');

module.exports = pool;

class AuthService {
  async generateTokens(user) {
    const accessToken = jwt.sign(
      { 
        id: user.id,
        name: user.name, 
        email: user.email,
        roles: user.roles,
        parcela: user.id_parcela,
        agua: user.id_parcela_agua, 
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id,
        email: user.email
       },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken,refreshToken };
  }

  async login(email, passwd) {
    try {
      console.log('Intentando login para email:', email);
      console.log('Contraseña proporcionada:', passwd);
      const hashedPassword = await bcrypt.hash(passwd, 10);
      console.log('Contraseña hasheada:', hashedPassword);
      
      const result = await pool.query(
        'SELECT * FROM resident_info_userid($1)',
        [email]
      );

      console.log('Resultado de la consulta:', {
        rowCount: result.rowCount,
        userFound: !!result.rows[0]
      });

      const user = result.rows[0];
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      console.log('user en db:', user);
      

      const validPassword = await bcrypt.compare(passwd, user.passwd);
      console.log('Validación de contraseña:', {
        passwordProvided: !!passwd,
        hashedPasswordInDB: !!user.passwd,
        isValid: validPassword
      });

      if (!validPassword) {
        throw new Error('Contraseña incorrecta');
      }

      await this.updateLastLogin(user.id);
      return this.generateTokens(user);
    } catch (error) {
      console.error('Error en login:', {
        message: error.message,
        stack: error.stack,
        code: error.code // Código de error de PostgreSQL
      });
      throw error;
    }
  }

  async refreshToken(token) {
    if (!token) {
      throw new Error('Token de refresco no proporcionado');
    }
    try {
      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      console.log('Token decodificado en refreshToken [auth.service]:', decoded);
      const result = await pool.query(
        'SELECT * FROM resident_info_userid($1)',
        [decoded.email]
      );
      
      const user = result.rows[0];
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Token de refresco inválido');
    }
  }

  async updateLastLogin(userId) {
    
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }

  async createPasswordResetToken(email) {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    console.log('user en createPasswordResetToken:', user);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.PASSWORD_RESET_TOKEN_SECRET,
      { expiresIn: '1h' }
    );
    // hash el token
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    console.log('Token hasheado:', hashedToken);
    // Guardar el token en la base de datos
    await pool.query(
      'UPDATE users SET token = $1 WHERE id = $2',
      [hashedToken, user.id]
    );
    console.log('Token guardado en la base de datos');
    return resetToken;
  }

  async resetPassword(token, newPassword) {
    if (!token) {
      throw new Error('Token no proporcionado');
    }
    const decoded = jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET passwd = $1, token=NULL WHERE id = $2',
      [hashedPassword, decoded.id]
    );
  }

  async verifyResetToken(token) {
    console.log('Token en verifyResetToken:', token);
    if (!token) {
      throw new Error('Token no proporcionado');
    }
    //hash del token para comparar con el de la base de datos
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    console.log('Token hasheado:', hashedToken);
    // Comprobar si el token existe en la base de datos
    const result = await pool.query(
      'SELECT * FROM users WHERE token = $1',
      [hashedToken]
    );
    console.log('Resultado de la consulta:', {
      rowCount: result.rowCount,
      userFound: !!result.rows[0]
    });
    const user = result.rows[0];
    if (!user) {
      throw new Error('Token de restablecimiento de contraseña inválido');
    }
    return jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_SECRET);
  }



  async changePassword(userId, oldPassword, newPassword) {
    console.log('userId en change-passwd:', userId);
    console.log('oldPassword en change-passwd:', oldPassword);
    console.log('newPassword en change-passwd:', newPassword);  
    const result = await pool.query(
      'SELECT passwd FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    console.log('user en change-passwd:', user);

    const validPassword = await bcrypt.compare(oldPassword, user.passwd);
    if (!validPassword) {
      throw new Error('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET passwd = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
  }
}

module.exports = new AuthService();