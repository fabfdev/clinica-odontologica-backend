const express = require('express');
const router = express.Router();
const FirestoreService = require('../services/FirestoreService');
const { authenticateFirebaseToken, authorizeClinicAccess, requireManager, auditLog } = require('../middleware/auth');

/**
 * Check if CNPJ already exists
 * POST /api/auth/check-cnpj
 */
router.post('/check-cnpj', async (req, res) => {
  try {
    const { cnpj } = req.body;

    if (!cnpj) {
      return res.status(400).json({ 
        error: 'CNPJ é obrigatório' 
      });
    }

    console.log('🔍 Checking CNPJ:', cnpj);

    // Get all clinics to check CNPJ
    const clinics = await FirestoreService.getAllClinics();
    
    // Check if CNPJ already exists
    const existingClinic = clinics.find(clinic => clinic.cnpj === cnpj);

    if (existingClinic) {
      return res.status(409).json({ 
        error: 'CNPJ já cadastrado no sistema',
        exists: true 
      });
    }

    res.status(200).json({ 
      exists: false,
      message: 'CNPJ disponível'
    });

  } catch (error) {
    console.error('❌ Error checking CNPJ:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * Create user and clinic (registration)
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { userId, email, cnpj } = req.body;

    if (!userId || !email || !cnpj) {
      return res.status(400).json({ 
        error: 'userId, email e cnpj são obrigatórios' 
      });
    }

    console.log('👤 Creating user and clinic:', { userId, email, cnpj });

    // Check if CNPJ already exists
    const clinics = await FirestoreService.getAllClinics();
    const existingClinic = clinics.find(clinic => clinic.cnpj === cnpj);

    if (existingClinic) {
      return res.status(409).json({ 
        error: 'CNPJ já cadastrado no sistema' 
      });
    }

    // Create clinic first
    const clinicData = {
      name: email.split('@')[0], // Temporary name based on email
      email: email,
      phone: '',
      cnpj: cnpj,
      responsibleName: email.split('@')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        workingHours: {
          monday: { start: '08:00', end: '18:00', enabled: true },
          tuesday: { start: '08:00', end: '18:00', enabled: true },
          wednesday: { start: '08:00', end: '18:00', enabled: true },
          thursday: { start: '08:00', end: '18:00', enabled: true },
          friday: { start: '08:00', end: '18:00', enabled: true },
          saturday: { start: '08:00', end: '12:00', enabled: false },
          sunday: { start: '08:00', end: '12:00', enabled: false }
        },
        appointmentDuration: 30,
        reminderTemplate: {
          title: 'Lembrete de Consulta',
          message: 'Olá {patient_name}! Este é um lembrete da sua consulta marcada para {date} às {time} na {clinic_name}. Serviço: {service} com {collaborator}.'
        },
        confirmationTemplate: {
          title: 'Consulta Confirmada',
          message: 'Olá {patient_name}! Sua consulta foi confirmada para {date} às {time} na {clinic_name}. Serviço: {service} com {collaborator}. Até breve!'
        },
        receiverPhone: null
      }
    };

    const clinic = await FirestoreService.createClinic(clinicData);
    console.log('🏥 Clinic created:', clinic.id);

    // Create user
    const userData = {
      id: userId,
      email: email,
      name: email.split('@')[0],
      clinicId: clinic.id,
      role: 'owner', // Always owner for first user in clinic
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      isActive: true
    };

    await FirestoreService.createUser(userId, userData);
    console.log('👤 User created:', userId);

    res.status(201).json({
      message: 'Usuário e clínica criados com sucesso',
      user: userData,
      clinic: clinic
    });

  } catch (error) {
    console.error('❌ Error in registration:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * Get user profile with clinic data
 * GET /api/auth/profile
 * Requires authentication
 */
router.get('/profile', authenticateFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('👤 Getting profile for user:', userId);

    // Get user data
    const user = await FirestoreService.getUserByUid(userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    // Get clinic data if user has clinicId
    let clinic = null;
    if (user.clinicId) {
      clinic = await FirestoreService.getClinic(user.clinicId);
      console.log('🏥 Clinic data being returned:', {
        id: clinic?.id,
        name: clinic?.name,
        hasSettings: !!clinic?.settings,
        settingsKeys: clinic?.settings ? Object.keys(clinic.settings) : [],
        workingHours: clinic?.settings?.workingHours,
        reminderTemplate: clinic?.settings?.reminderTemplate,
        confirmationTemplate: clinic?.settings?.confirmationTemplate
      });
    }

    res.status(200).json({
      user,
      clinic
    });

  } catch (error) {
    console.error('❌ Error getting profile:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * Update user last login
 * POST /api/auth/login
 * Requires authentication
 */
router.post('/login', authenticateFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('🔐 Updating last login for user:', userId);

    // Update user last login
    await FirestoreService.updateUser(userId, {
      lastLogin: new Date()
    });

    // Get updated user and clinic data
    const user = await FirestoreService.getUserByUid(userId);
    let clinic = null;
    
    if (user && user.clinicId) {
      clinic = await FirestoreService.getClinic(user.clinicId);
    }

    res.status(200).json({
      message: 'Login registrado com sucesso',
      user,
      clinic
    });

  } catch (error) {
    console.error('❌ Error updating login:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
