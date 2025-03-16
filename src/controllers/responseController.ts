// response.controller.ts
import { NextFunction, Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';

export const getResponsesByForm = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const responses = await ResponseCitizen.find({ formId: req.params.formId })
      .populate('formId', 'title');
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateResponseStatus = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const response = await ResponseCitizen.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!response) {
         res.status(404).json({ message: 'Response not found' })
        return;
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};