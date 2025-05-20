import express from 'express';
import fileUpload from 'express-fileupload';
import { searchByTemplate } from '../config/firebaseConfig';

const router = express.Router();

router.post(
  '/search-by-template',
  fileUpload(),
  searchByTemplate
);

export default router;