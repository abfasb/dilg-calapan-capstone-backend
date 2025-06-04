import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  userId: Schema.Types.ObjectId;
  message: string;
  type: 'REPORT' | 'APPOINTMENT' | 'COMPLAINT' | 'EVENT';
  read: boolean;
  link: string;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String, required: true }
}, { timestamps: true });

export default model<INotification>('Notification', NotificationSchema);