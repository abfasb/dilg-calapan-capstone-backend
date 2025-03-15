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

    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);

    appointmentDate.setHours(hours, minutes, 0, 0);

    const oneHourBefore = new Date(appointmentDate);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);

    const oneHourAfter = new Date(appointmentDate);
    oneHourAfter.setHours(oneHourAfter.getHours() + 1);

    const existing = await Appointment.findOne({
      date: appointmentDate.toISOString().split('T')[0],
      time: {
        $gte: `${oneHourBefore.getHours()}:${oneHourBefore.getMinutes()}`,
        $lte: `${oneHourAfter.getHours()}:${oneHourAfter.getMinutes()}`
      }
    });

    if (existing) {
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

export const getAllAppointmentsByLGU = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};