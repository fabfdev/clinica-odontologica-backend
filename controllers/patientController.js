const firestoreService = require('../services/FirestoreService');
const { isValidCPF, cleanCPF } = require('../utils/cpfValidator');

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
    
    // Validate CPF if provided
    if (patientData.cpf) {
      const cleanedCpf = cleanCPF(patientData.cpf);
      
      // Validate CPF format
      if (!isValidCPF(cleanedCpf)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CPF format'
        });
      }
      
      // Check if CPF already exists
      const existingPatients = await firestoreService.getPatients(clinicId);
      const duplicateCpf = existingPatients.find(patient => 
        patient.cpf && cleanCPF(patient.cpf) === cleanedCpf
      );
      
      if (duplicateCpf) {
        return res.status(400).json({
          success: false,
          error: 'CPF already exists for another patient'
        });
      }
      
      // Store cleaned CPF
      patientData.cpf = cleanedCpf;
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
    
    // Prevent CPF from being updated
    if (updateData.cpf) {
      return res.status(400).json({
        success: false,
        error: 'CPF cannot be modified after patient creation'
      });
    }
    
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
