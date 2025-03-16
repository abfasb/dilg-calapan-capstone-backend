import { NextFunction, Request, Response } from 'express';
import Event from '../models/Event';

export const createEvent = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const event = new Event({ ...req.body });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};


export const getEvents = async (req: Request, res: Response, next: NextFunction) : Promise<void>=> {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
    };

export const updateEvent = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event)  {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteEvent = async (req: Request, res: Response, next : NextFunction) : Promise<void> => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event){
        res.status(404).json({ error: 'Event not found' });
        return;
    } 
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      const events = await Event.find({ status: "published" })
        .sort({ date: 1, time: 1 })
        .lean();

      const transformedEvents = events.map(event => ({
        ...event,
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : null,
        createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
        updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : null,
      }));

      res.status(200).json(transformedEvents);
  } catch (error: any) {
      console.error('Error fetching events:', error);
      res.status(500).json({ 
        message: 'Server error',
        error: error.message 
      });
  }
};
