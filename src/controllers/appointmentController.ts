// appointments.controller.ts
import { NextFunction, Request, Response } from 'express';
import Appointment from '../models/Appointment';

export const createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, date, time, user, ...rest } = req.body;

    if (!user) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const timeRegex = /^(0[8-9]|1[0-6]):00$/; // 08:00 to 16:00
    if (!timeRegex.test(time)) {
      res.status(400).json({ error: 'Invalid time. Please select a whole hour between 8:00 AM and 4:00 PM.' });
      return;
    }

    const appointmentDate = new Date(date);
    const [hours] = time.split(':').map(Number);
    appointmentDate.setHours(hours, 0, 0, 0);

    const existingExact = await Appointment.findOne({
      date: appointmentDate.toISOString().split('T')[0],
      time: time
    });

    if (existingExact) {
      res.status(400).json({ error: 'This time slot is already booked. Please choose another time.' });
      return;
    }

    const oneHourBefore = new Date(appointmentDate);
    oneHourBefore.setHours(hours - 1);
    
    const oneHourAfter = new Date(appointmentDate);
    oneHourAfter.setHours(hours + 1);

    const pad = (num: number) => num.toString().padStart(2, '0');

    const existingWindow = await Appointment.findOne({
      date: appointmentDate.toISOString().split('T')[0],
      time: {
        $gte: `${pad(oneHourBefore.getHours())}:00`,
        $lte: `${pad(oneHourAfter.getHours())}:00`
      }
    });

    if (existingWindow) {
      res.status(400).json({ error: 'Another appointment is within 1 hour of this slot. Please choose another time.' });
      return;
    }

    const appointment = new Appointment({
      title,
      ...rest,
      date: appointmentDate,
      time,
      user,
      status: 'pending'
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


export const getAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const appointments = await Appointment.find({ user: userId })
    .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
       res.status(400).json({ error: 'Invalid status' });
       return;
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllAppointmentsByLGU = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate({
        path: 'user',
        select: 'firstName lastName email'
      })
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};