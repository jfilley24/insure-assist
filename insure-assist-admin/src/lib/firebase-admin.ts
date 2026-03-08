import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK. 
// Without explicit service account JSON paths, it will default to 
// Google Application Default Credentials (ADC) attached to the gcloud CLI.
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'insure-assist-dev',
    });
}

export const adminAuth = admin.auth();
