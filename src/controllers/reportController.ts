import Express, { Request, Response, NextFunction} from 'express';
import ReportForms from '../models/ReportForm'
import ResponseCitizen from '../models/ResponseCitizen';

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
export const getUserReports = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const reports = await ResponseCitizen.find({ userId : id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserReportsAndTracking = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      ResponseCitizen.find({ id })
        .populate({ path: 'formId', select: 'title' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ResponseCitizen.countDocuments({ id })
    ]);

    const reports = responses.map(response => ({
      _id: response._id,
      caseId: response.referenceNumber,
      title: typeof response.formId === 'object' && 'title' in response.formId ? response.formId.title : 'Deleted Form',
      status: response.status,
      createdAt: response.createdAt,
      updatedAt: 'updatedAt' in response ? response.updatedAt : null,
      category: typeof response.formId === 'object' && 'title' in response.formId ? response.formId.title : 'General' // Using form title as category
    }));

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};