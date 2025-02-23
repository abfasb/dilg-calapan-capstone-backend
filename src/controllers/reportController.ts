import Express, { Request, Response, NextFunction} from 'express';
import ReportForms from '../models/ReportForm'

export const createReport = async (req : Request, res : Response, next : NextFunction) : Promise<void> => {
    try {
      const { title, description, fields } = req.body;
      const newForm = new ReportForms({ title, description, fields });
      await newForm.save();
      res.status(201).json({ message: "Form saved successfully" });
    } catch (err) {
      res.status(500).json({ error: "Error saving form" });
    }
  }