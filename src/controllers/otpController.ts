import { Request, Response, NextFunction } from 'express';
import speakeasy from 'speakeasy';
import OTP from '../models/OTP';
import twilio from 'twilio';


export const sendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '***present***' : '***missing***');
    console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);

    const { phoneNumber } = req.body;
    
    const otp = speakeasy.totp({
      secret: speakeasy.generateSecret().base32,
      digits: 6
    });

    const newOTP = new OTP({
      phoneNumber,
      otp
    });
    await newOTP.save();

    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      await twilioClient.messages.create({
        body: `Your DILG eGov verification code is: ${otp}. Valid for 10 minutes.`,
        to: `+63${phoneNumber}`,
        from: process.env.TWILIO_PHONE_NUMBER
      });
    } catch (twilioError: any) {
      console.error('Twilio error:', twilioError);
       res.status(500).json({ message: 'Failed to send SMS' });
       return;
    }

    res.status(200).json({ 
      message: 'OTP sent successfully' 
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    const otpRecord = await OTP.findOne({ 
      phoneNumber,
      createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 mins
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      return res.status(400).json({ 
        message: 'OTP expired or not found. Please request a new one.' 
      });
    }
    
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ 
        message: 'Invalid OTP. Please try again.' 
      });
    }
    
    await OTP.deleteOne({ _id: otpRecord._id });
    
    next();
  } catch (error) {
    next(error);
  }
};