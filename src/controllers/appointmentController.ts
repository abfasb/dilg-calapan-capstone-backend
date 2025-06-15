import { NextFunction, Request, Response } from 'express';
import Appointment, { IAppointment} from '../models/Appointment';
import { Types } from 'mongoose';
import { messaging } from '../config/firebaseConfig';
import User from '../models/User';
import { createNotification } from './citizenNotificationController';

export const createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, date,  user, ...rest } = req.body;

    if (!user) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }


    const appointmentDate = new Date(date);


    const appointment = new Appointment({
      title,
      ...rest,
      date: appointmentDate,
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

export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, time, date, userId } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    if (status === 'confirmed' && !time) {
      res.status(400).json({ error: 'Time is required for confirmation' });
      return;
    }

    if (status === 'confirmed') {
      const timeRegex = /^(0[8-9]|1[0-6]):00$/; 
      if (!timeRegex.test(time)) {
        res.status(400).json({ error: 'Invalid time. Use whole hours between 08:00-16:00' });
        return;
      }

      const existingAppointment = await Appointment.findOne({
        date,
        time,
        _id: { $ne: id }
      });

      if (existingAppointment) {
        res.status(400).json({ error: 'Time slot already booked' });
        return;
      }
    }

    const updateData = { status, ...(status === 'confirmed' && { time }) };

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    const user = await User.findById(userId);

    if (user?.fcmToken && (status === 'confirmed' || status === 'cancelled')) {
      try {
        const notifMessages = {
          confirmed: {
            title: 'Your appointment has been confirmed',
            body: 'You can now proceed with your appointment.',
          },
          cancelled: {
            title: 'Your appointment has been cancelled',
            body: 'Please book another slot if needed.',
          }
        };

         const notification = notifMessages[status as 'confirmed' | 'cancelled'];
          await messaging.send({
            token: user.fcmToken,
            notification,
            data: {
              click_action: `${process.env.FRONTEND_URL}/account/citizen/appointments/${user._id}`
            },
          });

          await createNotification(
            (user as { _id: Types.ObjectId })._id.toString(),
            notification.title,
            'appointment',
            appointment._id.toString()
          );


      } catch (err: any) {
        console.error('Failed to send FCM:', err);

        if (err.errorInfo?.code === 'messaging/registration-token-not-registered') {
          await User.findByIdAndUpdate(user._id, { $unset: { fcmToken: "" } });
          console.warn(`Removed invalid FCM token for user ${user._id}`);
        }
      }
    }


    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
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

export const getCitizenAppointments = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    const appointments = await Appointment.find({ user: userId })
      .sort({ date: 1 })
      .exec();

    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
};