import mongoose, { Schema, Document } from "mongoose";

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
    expires: 300 // Automatically delete after 5 minutes (300 seconds)
  }
});

const OTP = mongoose.model<IOTP>('OTP', OTPSchema);
export default OTP;