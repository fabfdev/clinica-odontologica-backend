const firestoreService = require('../services/FirestoreService');

// GET /api/transactions/:clinicId
async function getTransactions(req, res) {
  try {
    const { clinicId } = req.params;
    const { startDate, endDate, pageSize = 25, lastDoc } = req.query;

    let filters = {};
    if (startDate && endDate) {
      filters = { startDate: new Date(startDate), endDate: new Date(endDate) };
    }

    const transactions = await firestoreService.getTransactions(clinicId, filters);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/transactions/:clinicId/:transactionId
async function getTransaction(req, res) {
  try {
    const { clinicId, transactionId } = req.params;
    
    const transaction = await firestoreService.getTransaction(clinicId, transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// POST /api/transactions/:clinicId
async function createTransaction(req, res) {
  try {
    const { clinicId } = req.params;
    const transactionData = req.body;
    
    // Validate required fields
    if (!transactionData.description || !transactionData.amount || !transactionData.type) {
      return res.status(400).json({
        success: false,
        error: 'Description, amount and type are required'
      });
    }
    
    const transactionId = await firestoreService.createTransaction(clinicId, transactionData);
    
    res.status(201).json({
      success: true,
      data: { id: transactionId }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/transactions/:clinicId/:transactionId
async function updateTransaction(req, res) {
  try {
    const { clinicId, transactionId } = req.params;
    const updateData = req.body;
    
    await firestoreService.updateTransaction(clinicId, transactionId, updateData);
    
    res.json({
      success: true,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/transactions/:clinicId/:transactionId
async function deleteTransaction(req, res) {
  try {
    const { clinicId, transactionId } = req.params;
    
    await firestoreService.deleteTransaction(clinicId, transactionId);
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
