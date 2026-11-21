import admin from 'firebase-admin';
import config from '../config';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

export async function initializeFirebase(): Promise<void> {
  try {
    let credential: admin.credential.Credential;

    // If service account key path is provided, load from JSON file
    if (config.firebase.serviceAccountKeyPath) {
      const serviceAccountPath = path.resolve(config.firebase.serviceAccountKeyPath);
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        credential = admin.credential.cert(serviceAccount);
        logger.info('Firebase initialized from service account JSON file');
      } else {
        throw new Error(`Service account key file not found at: ${serviceAccountPath}`);
      }
    } else {
      // Fall back to environment variables
      const serviceAccount: admin.ServiceAccount = {
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      };
      credential = admin.credential.cert(serviceAccount);
      logger.info('Firebase initialized from environment variables');
    }

    admin.initializeApp({
      credential,
      databaseURL: config.firebase.databaseUrl,
    });

    db = admin.firestore();
    auth = admin.auth();

    logger.info('Firebase initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

export function getFirestore(): admin.firestore.Firestore | null {
  return db || null;
}

export function getAuth(): admin.auth.Auth | null {
  return auth || null;
}

export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    logger.error('Failed to verify ID token:', error);
    throw error;
  }
}

export async function createUser(userData: {
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<admin.auth.UserRecord> {
  try {
    return await auth.createUser(userData);
  } catch (error) {
    logger.error('Failed to create user:', error);
    throw error;
  }
}

export async function getUser(uid: string): Promise<admin.auth.UserRecord> {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    logger.error('Failed to get user:', error);
    throw error;
  }
}

export async function updateUser(
  uid: string,
  userData: admin.auth.UpdateRequest
): Promise<admin.auth.UserRecord> {
  try {
    return await auth.updateUser(uid, userData);
  } catch (error) {
    logger.error('Failed to update user:', error);
    throw error;
  }
}

export async function deleteUser(uid: string): Promise<void> {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    logger.error('Failed to delete user:', error);
    throw error;
  }
}
