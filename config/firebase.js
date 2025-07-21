const admin = require('firebase-admin');

// Same project as frontend: dentalflow-system
const projectId = 'dentalflow-system';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // For development/testing - using project ID only
    // In production, you should use proper service account credentials
    admin.initializeApp({
      projectId: projectId,
      // If you have service account credentials, add them here:
      // credential: admin.credential.cert({
      //   projectId: process.env.FIREBASE_PROJECT_ID || projectId,
      //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // })
    });

    console.log(`🔥 Firebase Admin initialized for project: ${projectId}`);
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    
    // Fallback initialization for development
    if (error.code === 'app/invalid-credential') {
      console.log('🔄 Trying fallback initialization...');
      admin.initializeApp({
        projectId: projectId
      });
    }
  }
} else {
  console.log('🔥 Firebase Admin already initialized');
}

module.exports = admin;
