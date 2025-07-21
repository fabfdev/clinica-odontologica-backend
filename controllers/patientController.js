const firestoreService = require('../services/FirestoreService');

// GET /api/patients/:clinicId
async function getPatients(req, res) {
  try {
    const { clinicId } = req.params;
    const { pageSize = 25, lastDoc } = req.query;

    const filters = {};
    if (req.query.active !== undefined) {
      filters.active = req.query.active === 'true';
    }

    const result = await firestoreService.getPatients(clinicId, filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/patients/:clinicId/:patientId
async function getPatient(req, res) {
  try {
    const { clinicId, patientId } = req.params;
    
    const patient = await firestoreService.getPatient(clinicId, patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }
    
    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error getting patient:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// POST /api/patients/:clinicId
async function createPatient(req, res) {
  try {
    const { clinicId } = req.params;
    const patientData = req.body;
    
    // Validate required fields
    if (!patientData.name || !patientData.phone) {
      return res.status(400).json({
        success: false,
        error: 'Name and phone are required'
      });
    }
    
    const patientId = await firestoreService.createPatient(clinicId, patientData);
    
    res.status(201).json({
      success: true,
      data: { id: patientId }
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/patients/:clinicId/:patientId
async function updatePatient(req, res) {
  try {
    const { clinicId, patientId } = req.params;
    const updateData = req.body;
    
    await firestoreService.updatePatient(clinicId, patientId, updateData);
    
    res.json({
      success: true,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/patients/:clinicId/:patientId
async function deletePatient(req, res) {
  try {
    const { clinicId, patientId } = req.params;
    
    await firestoreService.deletePatient(clinicId, patientId);
    
    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient
};
