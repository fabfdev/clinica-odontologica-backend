const admin = require('firebase-admin');

// Same project as frontend: dentalflow-system
const projectId = 'dentalflow-system';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || projectId,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      projectId: projectId
    });

    console.log(`🔥 Firebase Admin initialized for project: ${projectId}`);
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    throw error;
  }
} else {
  console.log('🔥 Firebase Admin already initialized');
}

module.exports = admin;
