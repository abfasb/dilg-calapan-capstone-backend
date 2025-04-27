import { Schema, model, Document, } from 'mongoose';
import mongoose from 'mongoose';

export interface IAppointment extends Document {
_id: string;
  title: string;
  date: Date;
  time: string;
  description?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  citizen: Schema.Types.ObjectId;
}

const appointmentSchema = new Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: false },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
}, { timestamps: true });

export default model<IAppointment>('Appointment', appointmentSchema);