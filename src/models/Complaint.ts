import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  anonymous: boolean;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: Schema.Types.ObjectId;
}

const ComplaintSchema = new Schema<IComplaint>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'in_progress', 'resolved'] },
  anonymous: { type: Boolean, default: false },
  location: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);