const firestoreService = require('../services/FirestoreService');

// GET /api/services/:clinicId
async function getServices(req, res) {
  try {
    const { clinicId } = req.params;
    
    const services = await firestoreService.getServices(clinicId);
    
    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/services/:clinicId/:serviceId
async function getService(req, res) {
  try {
    const { clinicId, serviceId } = req.params;
    
    const service = await firestoreService.getService(clinicId, serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error getting service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// POST /api/services/:clinicId
async function createService(req, res) {
  try {
    const { clinicId } = req.params;
    const serviceData = req.body;
    
    // Validate required fields
    if (!serviceData.name || !serviceData.price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }
    
    const serviceId = await firestoreService.createService(clinicId, serviceData);
    
    res.status(201).json({
      success: true,
      data: { id: serviceId }
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/services/:clinicId/:serviceId
async function updateService(req, res) {
  try {
    const { clinicId, serviceId } = req.params;
    const updateData = req.body;
    
    await firestoreService.updateService(clinicId, serviceId, updateData);
    
    res.json({
      success: true,
      message: 'Service updated successfully'
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/services/:clinicId/:serviceId
async function deleteService(req, res) {
  try {
    const { clinicId, serviceId } = req.params;
    
    await firestoreService.deleteService(clinicId, serviceId);
    
    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getServices,
  getService,
  createService,
  updateService,
  deleteService
};
