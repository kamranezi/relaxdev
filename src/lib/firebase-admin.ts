import * as admin from 'firebase-admin';

// Log the environment variables to check if they are loaded
console.log("Firebase Admin Init - Project ID:", process.env.FIREBASE_PROJECT_ID ? "Loaded" : "MISSING");
console.log("Firebase Admin Init - Client Email:", process.env.FIREBASE_CLIENT_EMAIL ? "Loaded" : "MISSING");
console.log("Firebase Admin Init - Private Key:", process.env.FIREBASE_PRIVATE_KEY ? "Loaded" : "MISSING");
console.log("Firebase Admin Init - Database URL:", process.env.FIREBASE_DATABASE_URL ? "Loaded" : "MISSING");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();
const adminAuth = admin.auth();

export { db, adminAuth };
