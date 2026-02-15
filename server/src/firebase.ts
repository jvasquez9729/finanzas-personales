import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      readFileSync(resolve(serviceAccountPath), "utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin inicializado");
  } catch (error) {
    // En desarrollo, permitir continuar sin Firebase (modo mock)
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  Firebase Admin no configurado. Modo desarrollo sin autenticación."
      );
      console.warn(
        "   Para configurar, descarga el service account desde Firebase Console"
      );
    } else {
      console.error("❌ Error inicializando Firebase Admin:", error);
      process.exit(1);
    }
  }
}

export const auth = admin.apps.length ? admin.auth() : null;
export default admin;
