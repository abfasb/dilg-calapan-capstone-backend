import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
  title: string;
  description: string;
  category: string;
  status: 'Pending' | 'In Review' | 'Resolved';
  anonymous: boolean;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
  userId?: Schema.Types.ObjectId;
  adminNote?: string;
}

const ComplaintSchema = new Schema<IComplaint>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'In Review', 'Resolved'] },
  anonymous: { type: Boolean, default: false },
  location: { type: String, required: true },
  name: { type: String },
  adminNote: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);