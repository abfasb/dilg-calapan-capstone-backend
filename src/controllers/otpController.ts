import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import OTP from '../models/OTP';
import { sendEmail } from '../services/sendEmail';

export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newOTP = new OTP({ email, otp, createdAt: new Date() });
    await newOTP.save();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1d24;">DILG Calapan City Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px;
                    margin: 20px 0; padding: 10px; background: #f5f5f5;
                    text-align: center;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="font-size: 12px; color: #888; margin-top: 30px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `;

    const success = await sendEmail(email, "Your Verification Code", html) as any;

    if (success) {
      res.json({ success: true });
    } else {
      await OTP.deleteOne({ email });
      res.status(500).json({ message: "Failed to send OTP email" });
    }
  } catch (error : any) {
    console.error("❌ OTP send error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    next(error);
  }
};

// backend verification handler
export const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase();
    
    const otpRecord = await OTP.findOne({ email: normalizedEmail })
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