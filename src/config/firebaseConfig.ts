import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import path from 'path';
import Tesseract from 'tesseract.js';
import natural from 'natural';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import ReportForms from '../models/ReportForm';
import fs from 'fs';
import os from 'os';

const Poppler = require('pdf-poppler');


dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS as string))),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
}); 


const bucket = getStorage().bucket();
const messaging = admin.messaging();

const { TfIdf } = natural;
const tfidf = new TfIdf();

import { Request, Response } from 'express';

interface FileUploadRequest extends Request {
  files?: {
    [fieldname: string]: any;
    file?: any;
  };
}

export const searchByTemplate = async (req: FileUploadRequest, res: Response): Promise<void> => {
  try {
    if (!req.files?.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const file = req.files.file;
    let ocrText = '';

    if (file.mimetype === 'application/pdf') {
      // Create temporary directory for PNG pages
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-poppler-'));
      // Temporary path for the uploaded PDF file
      const tempPdfPath = path.join(os.tmpdir(), `${uuidv4()}.pdf`);

      try {
        // Save uploaded PDF file to tempPdfPath
        await file.mv(tempPdfPath);

        const options = {
          format: 'png',
          out_dir: tempDir,
          out_prefix: 'page',
          page: null, 
          dpi: 300,
        };

        await Poppler.convert(tempPdfPath, options);

        const pngFiles = fs.readdirSync(tempDir)
          .filter(f => f.endsWith('.png'))
          .sort((a, b) => {
            const getPageNum = (name: string) => parseInt(name.match(/\d+/)?.[0] ?? '0', 10);
            return getPageNum(a) - getPageNum(b);
          });

        for (const pngFile of pngFiles) {
          const imgBuffer = fs.readFileSync(path.join(tempDir, pngFile));
          const { data: { text } } = await Tesseract.recognize(imgBuffer, 'eng+ind');
          ocrText += text + '\n';
        }
      } finally {
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

        fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f)));
        fs.rmdirSync(tempDir);
      }
    } else {
      const { data: { text } } = await Tesseract.recognize(file.data, 'eng+ind');
      ocrText = text;
    }

    const allForms = await ReportForms.find().lean();

    const matches = await Promise.all(allForms.map(async (form) => {
      const templateFile = bucket.file(form.template.fileName);
      const [templateData] = await templateFile.download();

      const { data: { text: templateText } } = await Tesseract.recognize(templateData, 'eng+ind');

      const similarity = calculateSimilarity(ocrText, templateText);
      return { form, similarity };
    }));

    const filteredMatches = matches
      .filter(m => m.similarity > 0.4)
      .sort((a, b) => b.similarity - a.similarity);

    res.json({
      matches: filteredMatches.slice(0, 5),
      extractedText: ocrText,
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
};

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  return intersection.length / Math.max(words1.length, words2.length);
}

export { bucket, messaging };