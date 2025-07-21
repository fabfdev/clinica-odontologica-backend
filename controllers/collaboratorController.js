const firestoreService = require('../services/FirestoreService');

// GET /api/collaborators/:clinicId
async function getCollaborators(req, res) {
  try {
    const { clinicId } = req.params;
    
    const collaborators = await firestoreService.getCollaborators(clinicId);
    
    res.json({
      success: true,
      data: collaborators
    });
  } catch (error) {
    console.error('Error getting collaborators:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/collaborators/:clinicId/:collaboratorId
async function getCollaborator(req, res) {
  try {
    const { clinicId, collaboratorId } = req.params;
    
    const collaborator = await firestoreService.getCollaborator(clinicId, collaboratorId);
    
    if (!collaborator) {
      return res.status(404).json({
        success: false,
        error: 'Collaborator not found'
      });
    }
    
    res.json({
      success: true,
      data: collaborator
    });
  } catch (error) {
    console.error('Error getting collaborator:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// POST /api/collaborators/:clinicId
async function createCollaborator(req, res) {
  try {
    const { clinicId } = req.params;
    const collaboratorData = req.body;
    
    // Validate required fields
    if (!collaboratorData.name || !collaboratorData.role) {
      return res.status(400).json({
        success: false,
        error: 'Name and role are required'
      });
    }
    
    const collaboratorId = await firestoreService.createCollaborator(clinicId, collaboratorData);
    
    res.status(201).json({
      success: true,
      data: { id: collaboratorId }
    });
  } catch (error) {
    console.error('Error creating collaborator:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/collaborators/:clinicId/:collaboratorId
async function updateCollaborator(req, res) {
  try {
    const { clinicId, collaboratorId } = req.params;
    const updateData = req.body;
    
    await firestoreService.updateCollaborator(clinicId, collaboratorId, updateData);
    
    res.json({
      success: true,
      message: 'Collaborator updated successfully'
    });
  } catch (error) {
    console.error('Error updating collaborator:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/collaborators/:clinicId/:collaboratorId
async function deleteCollaborator(req, res) {
  try {
    const { clinicId, collaboratorId } = req.params;
    
    await firestoreService.deleteCollaborator(clinicId, collaboratorId);
    
    res.json({
      success: true,
      message: 'Collaborator deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getCollaborators,
  getCollaborator,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator
};
