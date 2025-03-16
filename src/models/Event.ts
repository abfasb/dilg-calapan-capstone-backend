import { Schema, model, Document } from 'mongoose';

interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  status: 'draft' | 'published';
  attendees: number;
  capacity: number;
  lguId: Schema.Types.ObjectId;
  createdAt?: Date; 
  updatedAt?: Date; 
}

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String },
  location: { type: String, default: 'TBA' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
}, { timestamps: true });

export default model<IEvent>('Event', EventSchema);