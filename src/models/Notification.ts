import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  message: string;
  type: 'complaint' | 'response';
  relatedId: mongoose.Schema.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ['complaint', 'response'] },
  relatedId: { type: Schema.Types.ObjectId, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<INotification>('Notification', NotificationSchema);