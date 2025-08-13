import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import OTP from '../models/OTP';
import { IUser } from '../models/User';

interface IOTP extends Document {
  phoneNumber: string;
  otp: string;
  createdAt: Date;
}

export const sendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || !/^9\d{9}$/.test(phoneNumber)) {
      res.status(400).json({ message: 'Invalid phone number format' });
      return;
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newOTP = new OTP({
      phoneNumber,
      otp,
      createdAt: new Date()
    });
    
    await newOTP.save();
    
    const response = await axios.get('https://smspool.net/api/send', {
      params: {
        key: process.env.SMSPOOL_API_KEY,
        recipient: `63${phoneNumber}`,
        message: `Your DILG eGov Nexus verification code is: ${otp}`,
        sender: process.env.SMSPOOL_SENDER
      }
    });
    
    if (response.data.success) {
      res.json({ success: true });
    } else {
      await OTP.deleteOne({ phoneNumber });
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  } catch (error: any) {
    next(error);
  }
};

export const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, otp } = req.body;
    
    const otpRecord = await OTP.findOne({ phoneNumber })
      .sort({ createdAt: -1 })
      .limit(1);
    
    if (!otpRecord) {
      res.status(400).json({ message: 'OTP not found. Please request a new one.' });
      return;
    }
    
    const now = new Date();
    const otpAge = (now.getTime() - otpRecord.createdAt.getTime()) / 1000 / 60;
    
    if (otpAge > 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      return;
    }
    
    if (otpRecord.otp !== otp) {
      res.status(400).json({ message: 'Invalid OTP' });
      return;
    }
    
    await OTP.deleteOne({ _id: otpRecord._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};