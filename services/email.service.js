/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

require('dotenv').config()
const nodemailer = require('nodemailer');
const path = require('path');
//const handlebars = require('nodemailer-express-handlebars')
//const engine = handlebars.engine;
const hbs = require('nodemailer-express-handlebars') 
// Verificar la carga del módulo

//let hbs;
try {
  //const hbs = require('nodemailer-express-handlebars');
  console.log('✓ nodemailer-express-handlebars cargado correctamente');
} catch (error) {
  console.error('✗ Error al cargar nodemailer-express-handlebars:', error.message);
  process.exit(1);
}

class EmailService {
  constructor() {
    try {
      // 1. Crear y verificar el transporter
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASSWD,
          clientId: process.env.OAUTH_CLIENTID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        }
      });

      // 2. Verificar configuración de handlebars
      const handlebarOptions = {
        viewEngine: {
          extName: '.hbs',
          defaultLayout: false,
          layoutsDir: path.resolve('./views/email/'),
          partialsDir: path.resolve('./views/email/partials/')
        },
        viewPath: path.resolve('./views/email/'),
        extName: '.hbs'
      };

      // 3. Verificar que las rutas existen
      if (!require('fs').existsSync(handlebarOptions.viewPath)) {
        throw new Error(`Directory not found: ${handlebarOptions.viewPath}`);
      }

      // 4. Configurar y verificar handlebars
      try {
        //const engine = handlebars.engine(handlebarOptions);
        //const hbs = this.engine(handlebarOptions);
        this.transporter.use('compile', hbs(handlebarOptions));
        console.log('✓ Handlebars configurado correctamente');
      } catch (error) {
        throw new Error(`Error configurando Handlebars: ${error.message}`);
      }

    } catch (error) {
      console.error('✗ Error en la inicialización de EmailService:', error.message);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetUrl) {
    console.log('Enviando email de restablecimiento de contraseña a:', email);
    console.log('URL de restablecimiento:', resetUrl);
    // point to the template folder
    
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Restablecer contraseña - Sierramar',
      template: 'reset-password',
      context: {
        resetUrl: resetUrl,
      },
    };
    


    await this.transporter.sendMail(mailOptions,(err,info)=>{
      if(err){
        console.log(err)
      }else{
        console.log(info.response)        
        return info.response
      }
    });

  }
}

module.exports = new EmailService();