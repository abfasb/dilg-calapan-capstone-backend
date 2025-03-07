import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS as string))),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
}); 

const bucket = getStorage().bucket();

export default bucket;
