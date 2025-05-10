import { NextFunction, Request, Response } from 'express';
import Complaint, { IComplaint } from '../models/Complaint';
import mongoose from 'mongoose';

export const createComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category, anonymous, location, name } = req.body;
    
    const user = req.user as { _id: string; name?: string } | undefined;
    
    const userId = user?._id ? new mongoose.Types.ObjectId(user._id) : undefined;
    const complaintData: Partial<IComplaint> = {
      title,
      description,
      category,
      location,
      anonymous,
      status: 'Pending',
      name: anonymous ? 'Anonymous' : name,
    };

    if (anonymous) {
      delete complaintData.name;
    }

    const newComplaint = await Complaint.create(complaintData);
    res.status(201).json(newComplaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Error submitting complaint' });
  }
};

export const getComplaints = async (req: Request, res: Response) : Promise<void> => {
  try {
    //@ts-ignore
    const complaints = await Complaint.find({ userId: req.user?._id });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints' });
  }
};


export const getAllComplaintsForAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const complaints = await Complaint.find();
    res.status(200).json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Error fetching complaints' });
  }
};


export const updateComplaintStatus = async (req: Request, res: Response) : Promise<void> => {
  const { id } = req.params;
  const { status, adminNote } = req.body;

  try {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      { status, adminNote },
      { new: true, runValidators: true }
    );

    if (!updatedComplaint) {
       res.status(404).json({ message: 'Complaint not found' });
       return;
    }

    res.status(200).json(updatedComplaint);
  } catch (error) {
    res.status(500).json({ message: 'Error updating complaint status', error });
  }
};


export const getCitizenComplaints = async (req: Request, res: Response) : Promise<void> => {
  try {
    const complaints = await Complaint.find({ 
      userId: req.params.userId 
    }).sort({ createdAt: -1 });

    const sanitizedComplaints = complaints.map(complaint => ({
      ...complaint.toObject(),
      name: complaint.anonymous ? 'Anonymous' : complaint.name
    }));

    res.json(sanitizedComplaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints' });
  }
};

export const getComplaintDetails = async (req: Request, res: Response) : Promise<void> => {
  try {
    const user = req.user as { _id: string };
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      userId: user._id
    });

    if (!complaint) {
     res.status(404).json({ message: 'Complaint not found' });
     return;
    }

    const response = {
      ...complaint.toObject(),
      name: complaint.anonymous ? 'Anonymous' : complaint.name,
      userId: undefined
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaint details' });
  }
};

export const getComplaintById = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
       res.status(400).json({ message: 'Invalid complaint ID' });
       return;
    }

    const complaint = await Complaint.findById(req.params.id).lean();

    if (!complaint) {
       res.status(404).json({ message: 'Complaint not found' });
       return;
    }

    res.status(200).json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};