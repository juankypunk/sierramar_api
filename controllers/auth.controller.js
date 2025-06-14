/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

require('dotenv').config()
const AuthService = require('../services/auth.service');
const EmailService = require('../services/email.service');

class AuthController {
  async login(req, res) {
    try {
      const { email, passwd } = req.body;
      const tokens = await AuthService.login(email, passwd);
      
      // Si remember_me es true, establecemos una cookie de larga duración
      if (req.body.remember_me) {
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: false, // Cambia a true en producción: process.env.NODE_ENV === 'production'
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
          sameSite: 'lax', // Cambia a 'strict' en producción
        });
      }

      res.json(tokens);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.cookies;
      const tokens = await AuthService.refreshToken(refreshToken);
      
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: false,  // Cambia a true en producción: process.env.NODE_ENV === 'production'
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
        sameSite: 'lax', // Cambia a 'strict' en producción
      });
      res.json(tokens);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.id, oldPassword, newPassword);
      
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async logout(req, res) {
    res.clearCookie('refreshToken');
    res.json({ message: 'Sesión cerrada correctamente' });
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const resetToken = await AuthService.createPasswordResetToken(email);
      
      // Enviar email con el enlace de reset
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      await EmailService.sendPasswordResetEmail(email, resetUrl);
      
      res.json({ 
        message: 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña' 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;
      
      await AuthService.resetPassword(token, newPassword);
      
      res.json({ 
        message: 'Contraseña actualizada correctamente' 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async verifyResetToken(req, res) {
    try {
      const { token } = req.params;
      await AuthService.verifyResetToken(token);
      res.json({ valid: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  

}

module.exports = new AuthController();