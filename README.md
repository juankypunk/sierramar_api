# Sierramar API

RESTful API for Sierramar residential community management system. This repository contains the server-side application that powers the [sierramar_pwa](https://github.com/juankypunk/sierramar_pwa) frontend.

## Overview

Sierramar API provides the backend services for managing residential communities, including member fees, water consumption billing, employee time tracking...

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control
  - Password reset functionality

- **Member Fee Management**
  - CRUD operations for member fees
  - Payment processing
  - Fee calculation system
  - Batch processing for payment orders

- **Water Management**
  - Water consumption tracking
  - Automated billing system
  - Usage statistics and reports
  - Separate management for gardens and residents

- **Employee Management**
  - Time tracking system
  - Work schedule management
  - Attendance records
  - Payroll reports

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- nodemailer for email notifications
- Handlebars for email templates

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Getting Started

```bash
# Clone the repository
git clone https://github.com/juankypunk/sierramar_api.git

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start development server
node index.js


```

## API Documentation

The API endpoints are organized into the following categories:

- `/api/auth` - Authentication endpoints
- `/api/users` - User management
- `/api/residents` - Resident management
- `/api/employees` - Employee management
- `/api/water` - Water consumption and billing

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Juan Carlos Moral - juanky@juancarlosmoral.es

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.