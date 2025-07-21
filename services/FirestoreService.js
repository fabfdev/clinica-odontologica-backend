const admin = require('../config/firebase');

class FirestoreService {
  constructor() {
    this.db = admin.firestore();
  }

  // =================== CLINICS ===================
  async getClinic(clinicId) {
    const doc = await this.db.collection('clinics').doc(clinicId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async getAllClinics() {
    const snapshot = await this.db.collection('clinics').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createClinic(clinicData) {
    const docRef = await this.db.collection('clinics').add({
      ...clinicData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Return the created clinic with its ID
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async updateClinic(clinicId, data) {
    await this.db.collection('clinics').doc(clinicId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // =================== PATIENTS ===================
  async getPatients(clinicId, filters = {}) {
    let query = this.db.collection('clinics').doc(clinicId).collection('patients');
    
    // Apply filters
    if (filters.active !== undefined) {
      query = query.where('isActive', '==', filters.active);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getPatient(clinicId, patientId) {
    const doc = await this.db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async createPatient(clinicId, patientData) {
    const docRef = await this.db.collection('clinics').doc(clinicId).collection('patients').add({
      ...patientData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });
    return docRef.id;
  }

  async updatePatient(clinicId, patientId, patientData) {
    await this.db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).update({
      ...patientData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  async deletePatient(clinicId, patientId) {
    await this.db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).delete();
  }

  // =================== APPOINTMENTS ===================
  async getAppointments(clinicId, filters = {}) {
    console.log('🔍 FirestoreService.getAppointments called:', { clinicId, filters });
    
    const snapshot = await this.db.collection('clinics').doc(clinicId).collection('appointments').get();
    console.log('🔍 Raw Firestore documents found:', snapshot.docs.length);
    
    // Filter and sort in memory to avoid index issues
    let appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('🔍 Mapped appointments:', appointments.length);
    
    if (appointments.length > 0) {
      console.log('🔍 Sample appointment data:', appointments[0]);
    }
    
    // Apply date filters if provided
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      console.log('🔍 Applying date filters:', { startDate, endDate });
      
      const beforeFilterCount = appointments.length;
      
      appointments = appointments.filter(appointment => {
        let appointmentDate;
        
        // Handle both Date objects and Firestore timestamps
        if (appointment.dateTime?.toDate) {
          appointmentDate = appointment.dateTime.toDate();
        } else {
          appointmentDate = new Date(appointment.dateTime);
        }
        
        const isInRange = appointmentDate >= startDate && appointmentDate <= endDate;
        if (!isInRange) {
          console.log('🔍 Filtered out appointment:', {
            id: appointment.id,
            appointmentDate,
            startDate,
            endDate
          });
        }
        
        return isInRange;
      });
      
      console.log('🔍 After date filter: ', beforeFilterCount, '->', appointments.length);
    }
    
    // Sort by dateTime ascending
    appointments.sort((a, b) => {
      let dateA, dateB;
      
      if (a.dateTime?.toDate) {
        dateA = a.dateTime.toDate();
      } else {
        dateA = new Date(a.dateTime);
      }
      
      if (b.dateTime?.toDate) {
        dateB = b.dateTime.toDate();
      } else {
        dateB = new Date(b.dateTime);
      }
      
      return dateA - dateB;
    });
    
    console.log('🔍 Final appointments to return:', appointments.length);
    return appointments;
  }

  async createAppointment(clinicId, appointmentData) {
    const docRef = await this.db.collection('clinics').doc(clinicId).collection('appointments').add({
      ...appointmentData,
      dateTime: new Date(appointmentData.dateTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async updateAppointment(clinicId, appointmentId, appointmentData) {
    const updateData = { ...appointmentData };
    if (appointmentData.dateTime) {
      updateData.dateTime = new Date(appointmentData.dateTime);
    }
    
    await this.db.collection('clinics').doc(clinicId).collection('appointments').doc(appointmentId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  async deleteAppointment(clinicId, appointmentId) {
    await this.db.collection('clinics').doc(clinicId).collection('appointments').doc(appointmentId).delete();
  }

  // =================== COLLABORATORS ===================
  async getCollaborators(clinicId) {
    const snapshot = await this.db.collection('clinics').doc(clinicId).collection('collaborators').get();
    
    // Filter and sort in memory to avoid composite index requirement
    const collaborators = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(collaborator => collaborator.isActive !== false) // Include undefined as active
      .sort((a, b) => {
        // Sort by createdAt desc, handling undefined dates
        const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
    
    return collaborators;
  }

  async createCollaborator(clinicId, collaboratorData) {
    const docRef = await this.db.collection('clinics').doc(clinicId).collection('collaborators').add({
      ...collaboratorData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });
    return docRef.id;
  }

  async updateCollaborator(clinicId, collaboratorId, collaboratorData) {
    await this.db.collection('clinics').doc(clinicId).collection('collaborators').doc(collaboratorId).update({
      ...collaboratorData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  async deleteCollaborator(clinicId, collaboratorId) {
    await this.db.collection('clinics').doc(clinicId).collection('collaborators').doc(collaboratorId).delete();
  }

  // =================== SERVICES ===================
  async getServices(clinicId) {
    const snapshot = await this.db.collection('clinics').doc(clinicId).collection('services').get();
    
    // Filter and sort in memory to avoid composite index requirement
    const services = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(service => service.isActive !== false) // Include undefined as active
      .sort((a, b) => {
        // Sort by createdAt desc, handling undefined dates
        const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
    
    return services;
  }

  async createService(clinicId, serviceData) {
    const docRef = await this.db.collection('clinics').doc(clinicId).collection('services').add({
      ...serviceData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });
    return docRef.id;
  }

  async updateService(clinicId, serviceId, serviceData) {
    await this.db.collection('clinics').doc(clinicId).collection('services').doc(serviceId).update({
      ...serviceData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  async deleteService(clinicId, serviceId) {
    await this.db.collection('clinics').doc(clinicId).collection('services').doc(serviceId).delete();
  }

  // =================== TRANSACTIONS ===================
  async getTransactions(clinicId, filters = {}) {
    let query = this.db.collection('clinics').doc(clinicId).collection('transactions');
    
    if (filters.startDate && filters.endDate) {
      query = query.where('date', '>=', new Date(filters.startDate))
                   .where('date', '<=', new Date(filters.endDate));
    }
    
    const snapshot = await query.orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createTransaction(clinicId, transactionData) {
    const docRef = await this.db.collection('clinics').doc(clinicId).collection('transactions').add({
      ...transactionData,
      date: new Date(transactionData.date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async updateTransaction(clinicId, transactionId, transactionData) {
    const updateData = { ...transactionData };
    if (transactionData.date) {
      updateData.date = new Date(transactionData.date);
    }
    
    await this.db.collection('clinics').doc(clinicId).collection('transactions').doc(transactionId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  async deleteTransaction(clinicId, transactionId) {
    await this.db.collection('clinics').doc(clinicId).collection('transactions').doc(transactionId).delete();
  }

  // =================== USERS ===================
  async getUserByUid(uid) {
    const doc = await this.db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async createUser(uid, userData) {
    await this.db.collection('users').doc(uid).set({
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  async updateUser(uid, userData) {
    await this.db.collection('users').doc(uid).update({
      ...userData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // =================== ANALYTICS ===================
  async getClinicStats(clinicId, period = 'month') {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get data for the period
    const [appointments, transactions, patients] = await Promise.all([
      this.getAppointments(clinicId, { startDate, endDate: now }),
      this.getTransactions(clinicId, { startDate, endDate: now }),
      this.getPatients(clinicId, { active: true })
    ]);

    return {
      appointments: {
        total: appointments.length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length
      },
      transactions: {
        total: transactions.length,
        income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0),
        expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0)
      },
      patients: {
        total: patients.length,
        new: patients.filter(p => {
          const createdAt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
          return createdAt >= startDate;
        }).length
      }
    };
  }
}

module.exports = new FirestoreService();
