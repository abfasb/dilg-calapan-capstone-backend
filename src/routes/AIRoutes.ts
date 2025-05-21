import express from 'express';
import fileUpload from 'express-fileupload';
import { searchByTemplate } from '../config/firebaseConfig';
import ReportForms from '../models/ReportForm';
import { bucket } from '../config/firebaseConfig';
import path from 'path';

const router = express.Router();

router.post(
  '/search-by-template',
  fileUpload(),
  searchByTemplate
);

router.get('/verify-templates', async (req, res) => {
  const allForms = await ReportForms.find().lean();
  const storageFiles = await bucket.getFiles();
  
  const verificationResults = allForms.map(form => {
  const templateFileName = form.template?.fileName;
  const exists = storageFiles[0].some(file => {
    const gcsFileName = path.basename(file.name); 
    return decodeURIComponent(gcsFileName) === templateFileName;
  });

  return {
    _id: form._id,
    title: form.title,
    fileName: templateFileName,
    exists
  };
});
});

export default router;