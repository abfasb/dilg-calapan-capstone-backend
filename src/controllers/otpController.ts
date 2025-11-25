import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import OTP from '../models/OTP';
import { sendEmail } from '../services/sendEmail';

const sendSimpleEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const nodemailer = require('nodemailer');
    
    // Use environment variables with fallbacks
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_HOST || "smtp-relay.brevo.com",
      port: parseInt(process.env.BREVO_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.BREVO_USER || "your-default-username",
        pass: process.env.BREVO_PASS || "your-default-password",
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"DILG Calapan" <noreply@dilgcalapan.com>',
      to: to,
      subject: subject,
      html: html,
    });

    console.log("✅ Email sent to:", to);
    return true;
  } catch (error) {
    console.error("❌ Email error:", error);
    return false;
  }
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    console.log("📧 Received OTP request for:", email);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🔑 Generated OTP:", otp);

    // Save OTP to database
    const newOTP = new OTP({ 
      email: email.toLowerCase(), 
      otp, 
      createdAt: new Date() 
    });
    await newOTP.save();
    console.log("💾 OTP saved to database");

    // Email template
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1d24;">DILG Calapan City Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px;
                    margin: 20px 0; padding: 20px; background: #f5f5f5;
                    text-align: center; border-radius: 10px;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="font-size: 12px; color: #888; margin-top: 30px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `;

    // Send email
    const emailSent = await sendSimpleEmail(email, "Your Verification Code", html);

    if (emailSent) {
      console.log("✅ OTP process completed successfully for:", email);
      res.json({ 
        success: true, 
        message: "Verification code sent successfully" 
      });
    } else {
      // Clean up if email fails
      await OTP.deleteOne({ email: email.toLowerCase() });
      console.log("❌ Email sending failed for:", email);
      res.status(500).json({ 
        message: "Failed to send verification code. Please try again." 
      });
    }

  } catch (error: any) {
    console.error("❌ OTP send error:", error);
    
    // Send user-friendly error message
    res.status(500).json({ 
      message: "Service temporarily unavailable. Please try again in a few minutes." 
    });
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