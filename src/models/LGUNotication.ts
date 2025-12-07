import mongoose, { Schema, Document } from 'mongoose';

export interface ILGUnNotification extends Document {
  userId: Schema.Types.ObjectId;
  type: 'submission' | 'appointment';
  referenceId: Schema.Types.ObjectId;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const LGUnNotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['submission', 'appointment'], required: true },
  referenceId: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.LGUnNotification || 
       mongoose.model<ILGUnNotification>('LGUnNotification', LGUnNotificationSchema);