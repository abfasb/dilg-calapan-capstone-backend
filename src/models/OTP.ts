// backend OTP model (ensure this matches)
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    index: true
  },
  otp: { 
    type: String, 
    required: true,
    minlength: 6,
    maxlength: 6
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: { expires: '5m' } 
  }
});

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;