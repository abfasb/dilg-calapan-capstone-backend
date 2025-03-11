import { Request, Response } from 'express';
import Complaint, { IComplaint } from '../models/Complaint';

export const createComplaint = async (req: Request, res: Response) : Promise<void> => {
  try {
    const { title, description, category, anonymous, location } = req.body;
    const userId = (req.user as any)?._id;


    const newComplaint: IComplaint = new Complaint({
      title,
      description,
      category,
      anonymous,
      location,
      userId: anonymous ? undefined : userId,
    });

    await newComplaint.save();
    res.status(201).json(newComplaint);
  } catch (error) {
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