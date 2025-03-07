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

export const getReportForms = async (req : Request, res : Response, next : NextFunction) : Promise<void> => {
    try {
      const forms = await ReportForms.find();
      res.status(200).json(forms);
    } catch (err) {
      res.status(500).json({ error: "Error fetching forms" });
    }
  }


  

export const updateReportForms = async (req : Request, res : Response, next : NextFunction) : Promise <void> => {
  try {
    const { id } = req.params
    const updateData = req.body

    const updatedForm = await ReportForms.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!updatedForm) {
      res.status(404).json({ success: false, message: 'Form not found' })
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Form updated successfully',
      data: updatedForm
    })
  } catch (error) {
    console.error('Update error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Server error during form update',
    })
  }
}