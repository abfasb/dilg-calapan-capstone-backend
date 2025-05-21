import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import path from 'path';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import natural from 'natural';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import ReportForms from '../models/ReportForm';
import fs from 'fs';
import os from 'os';

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS as string))),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
}); 

const bucket = getStorage().bucket();
const messaging = admin.messaging();

import { Request, Response } from 'express';

interface FileUploadRequest extends Request {
  files?: {
    [fieldname: string]: any;
    file?: any;
  };
}

async function retry<T>(fn: () => Promise<T>, options: { retries: number; factor: number; }): Promise<T> {
  let attempt = 0;
  let delay = 100;
  while (attempt < options.retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= options.retries) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay *= options.factor;
    }
  }
  throw new Error('Retry attempts exhausted');
}

export const searchByTemplate = async (req: FileUploadRequest, res: Response): Promise<void> => {
  try {
    if (!req.files?.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const file = req.files.file;
    const originalFilename = file.name;

    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    const processedBase = baseName.replace(/\s*\(\d+\)$/, '');
    const processedFilename = processedBase + ext;

    const escapedBase = escapeRegex(processedBase);
    const escapedExt = escapeRegex(ext);
    const regexPattern = `^${escapedBase}.*${escapedExt}$`;

    const matchedForms = await ReportForms.find({
      'template.fileName': { 
        $regex: regexPattern,
        $options: 'i'
      }
    }).lean();

    const sortedForms = matchedForms.sort((a, b) => {
      const aExact = a.template?.fileName === originalFilename ? 1 : 0;
      const bExact = b.template?.fileName === originalFilename ? 1 : 0;
      return bExact - aExact || a.template?.fileName.localeCompare(b.template?.fileName);
    });

    res.json({
      matches: sortedForms.map(form => ({
        formId: form._id,
        title: form.title,
        templateFileName: form.template?.fileName,
        isExactMatch: form.template?.fileName === originalFilename
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { bucket, messaging };

