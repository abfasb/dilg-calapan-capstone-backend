import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from '../path-to-your-serviceAccountKey.json'; // Update the path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'your-project-id.appspot.com',

const bucket = getStorage().bucket();

export { bucket };
