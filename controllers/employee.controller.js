/*
MIT License

Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const employeeService = require('../services/employee.service')

exports.getPublicHolidays = async (req, res) => {
  try {
    const { range_start, range_end  } = req.body
    const publicHolidays = await employeeService.getPublicHolidays(range_start, range_end)
    res.json(publicHolidays)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getEventsLabel = async (req, res) => {
    try {
        const eventsLabel = await employeeService.getEventsLabel()
        res.json(eventsLabel)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getEvents = async (req, res) => {
    try {
        const { range_start, range_end, label } = req.body
        const events = await employeeService.getEvents(range_start, range_end, label)
        res.json(events)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getEventsForUser = async (req, res) => {
    try {
        const { range_start, range_end, label } = req.body
        const userId = req.params.id
        const events = await employeeService.getEventsForUser(userId, range_start, range_end, label)
        res.json(events)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getHolidaysForUser = async (req, res) => {
    try {
        const { range_start, range_end } = req.body
        const userId = req.params.id
        const holidays = await employeeService.getHolidaysForUser(userId, range_start, range_end)
        res.json(holidays)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
} 

exports.getEmployeeByName = async (req, res) => {
    try {
        const name = req.params.name
        const employee = await employeeService.getEmployeeByName(name)
        res.json(employee)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getPlanningForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { range_start, range_end, label  } = req.body
        const planning = await employeeService.getPlanningForUser(userId,range_start,range_end,label)
        res.json(planning)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}   

exports.getScheduledHoursForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { range_start, range_end, label } = req.body
        const scheduledHours = await employeeService.getScheduledHoursForUser(userId, range_start, range_end, label)
        res.json(scheduledHours)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.updatePlanningForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { id,inicia_formated,termina_formated,recurrence,label } = req.body
        const updatedPlanning = await employeeService.updatePlanningForUser(userId, id, inicia_formated, termina_formated, recurrence, label)
        res.json(updatedPlanning)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.createNewEventForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { inicia_formated,termina_formated,recurrence,label,empleado } = req.body
        const newEvent = await employeeService.createNewEventForUser(userId, inicia_formated, termina_formated, recurrence, label, empleado)
        res.json(newEvent)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.deleteEventForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { id } = req.body
        const deletedEvent = await employeeService.deleteEventForUser(userId, id)
        res.json(deletedEvent)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getSigningsForUser = async (req, res) => {  
    try {
        const userId = req.params.id
        const { range_start, range_end } = req.body
        const signings = await employeeService.getSigningsForUser(userId, range_start, range_end)
        res.json(signings)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getWorkedHoursForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { range_start, range_end } = req.body
        const workedHours = await employeeService.getWorkedHoursForUser(userId, range_start, range_end)
        res.json(workedHours)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getExtraWorkedHoursForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { range_start, range_end } = req.body
        const extraWorkedHours = await employeeService.getExtraWorkedHoursForUser(userId, range_start, range_end)
        res.json(extraWorkedHours)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.getRawSigningsForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const rawSignings = await employeeService.getRawSigningsForUser(userId)
        res.json(rawSignings)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.deleteSigningForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { momento } = req.body
        const deletedSigning = await employeeService.deleteSigningForUser(userId, momento)
        res.json(deletedSigning)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}


exports.getLastSigningForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const lastSigning = await employeeService.getLastSigningForUser(userId)
        res.json(lastSigning)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.signUser = async (req, res) => {
    try {
        const { id, latitud, longitud, locatedAt, accion } = req.body
        const signedUser = await employeeService.signUser(id, latitud, longitud, locatedAt, accion);
        res.json(signedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.updateSigningForUser = async (req, res) => {
    try {
        const userId = req.params.id
        const { momento, momento_updated } = req.body
        const updatedSigning = await employeeService.updateSigningForUser(userId, momento, momento_updated)
        res.json(updatedSigning)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}



// ... resto de controladores