/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const csv = require('@fast-csv/format');
const PDFDocument = require('pdfkit');

class UserService {
  
  async getUserById(userId) {  
    const result = await pool.query("SELECT name, email FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      throw new Error('No se encontraron los días festivos');
    }
    return result.rows;
  }

  
  async updateUserById(userId, userData) {
    const { name, email } = userData;
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
      [name, email, userId]
    );
    if (result.rows.length === 0) {
      throw new Error('No se pudo actualizar el usuario');
    }
    return result.rows[0];
  } 

  

}

module.exports = new UserService();