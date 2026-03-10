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
    // However, for generating Signed URLs local "User Identity" will fail.
    // If GOOGLE_APPLICATION_CREDENTIALS is set, we explicitly mandate the cert loading so it isn't swallowed by host defaults.
    try {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Check if the var is an absolute path to a file (dev) or stringified JSON (prod)
            const credPathOrStr = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (credPathOrStr.startsWith('{')) {
                config.credential = admin.credential.cert(JSON.parse(credPathOrStr));
            } else {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const serviceAccount = require(credPathOrStr);
                config.credential = admin.credential.cert(serviceAccount);
            }
        } else {
            config.credential = admin.credential.applicationDefault();
        }
    } catch (e: any) {
        console.warn("Firebase Admin Credential warning:", e.message);
    }

    return admin.initializeApp(config);
}
