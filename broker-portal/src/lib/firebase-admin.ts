import * as admin from 'firebase-admin';

export function initAdmin() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // To support generating cryptographic Signed URLs locally, we strictly provide the JSON key.
    // In production, when this path is missing, it seamlessly falls back to the secure Workload Identity (ADC).
    const config: admin.AppOptions = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };

    // Utilizing applicationDefault() correctly delegates authentication dynamically.
    // If GOOGLE_APPLICATION_CREDENTIALS is set, it reads the JSON. If it's a User Identity
    // it connects securely. If it's a Service Account, it uses it.
    try {
        config.credential = admin.credential.applicationDefault();
    } catch (e: any) {
        console.warn("Application Default Credential warning:", e.message);
    }

    return admin.initializeApp(config);
}
