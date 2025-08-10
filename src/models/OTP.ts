import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  otp: string;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema({
  phoneNumber: { 
    type: String, 
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: { expires: '10m' } // Auto-delete after 10 minutes
  }
});

export default mongoose.model<IOTP>('OTP', OTPSchema);