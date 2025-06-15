import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  message: string;
  read: boolean;
  type: 'submission' | 'complaint' | 'appointment';
  referenceId: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['submission', 'complaint', 'appointment'], required: true },
  referenceId: { type: Schema.Types.ObjectId, required: true },
}, { timestamps: true });

export default mongoose.model<INotification>('CitizenNotification', NotificationSchema);