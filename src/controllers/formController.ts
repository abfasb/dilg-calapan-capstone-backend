import { NextFunction, Request, Response } from 'express';
import ReportForms from '../models/ReportForm';

export const getForms = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const forms = await ReportForms.find();
    res.json(forms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFormById = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const form = await ReportForms.findById(req.params.id);
    if (!form) {
        res.status(404).json({ message: 'Form not found' });
        return;
    }
    res.json(form);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};