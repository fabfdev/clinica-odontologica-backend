const firestoreService = require('../services/FirestoreService');

// GET /api/appointments/:clinicId
async function getAppointments(req, res) {
  try {
    const { clinicId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('🗓️  Getting appointments for clinic:', clinicId);
    console.log('🗓️  Date filters:', { startDate, endDate });

    let filters = {};
    if (startDate && endDate) {
      filters = { startDate: new Date(startDate), endDate: new Date(endDate) };
    }

    console.log('🗓️  Filters applied:', filters);
    const appointments = await firestoreService.getAppointments(clinicId, filters);
    
    console.log('🗓️  Appointments found:', appointments.length);
    if (appointments.length > 0) {
      console.log('🗓️  First appointment sample:', appointments[0]);
    }
    
    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('❌ Error getting appointments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/appointments/:clinicId/today
async function getTodayAppointments(req, res) {
  try {
    const { clinicId } = req.params;
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const appointments = await firestoreService.getAppointments(clinicId, {
      startDate: startOfDay,
      endDate: endOfDay
    });
    
    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting today appointments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/appointments/:clinicId/:appointmentId
async function getAppointment(req, res) {
  try {
    const { clinicId, appointmentId } = req.params;
    
    const appointment = await firestoreService.getAppointment(clinicId, appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error getting appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// POST /api/appointments/:clinicId
async function createAppointment(req, res) {
  try {
    const { clinicId } = req.params;
    const appointmentData = req.body;
    
    // Validate required fields
    if (!appointmentData.patientId || !appointmentData.dateTime || !appointmentData.serviceId) {
      return res.status(400).json({
        success: false,
        error: 'PatientId, dateTime and serviceId are required'
      });
    }
    
    const appointmentId = await firestoreService.createAppointment(clinicId, appointmentData);
    
    res.status(201).json({
      success: true,
      data: { id: appointmentId }
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/appointments/:clinicId/:appointmentId
async function updateAppointment(req, res) {
  try {
    const { clinicId, appointmentId } = req.params;
    const updateData = req.body;
    
    await firestoreService.updateAppointment(clinicId, appointmentId, updateData);
    
    res.json({
      success: true,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/appointments/:clinicId/:appointmentId
async function deleteAppointment(req, res) {
  try {
    const { clinicId, appointmentId } = req.params;
    
    await firestoreService.deleteAppointment(clinicId, appointmentId);
    
    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getAppointments,
  getTodayAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
