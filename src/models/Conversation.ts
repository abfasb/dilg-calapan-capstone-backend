import { Schema, model, Document } from 'mongoose';

interface Message {
  sender: 'user' | 'admin';
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation extends Document {
  userId: string;
  status: 'open' | 'closed' | 'pending';
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<Conversation>({
  userId: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed', 'pending'], default: 'pending' },
  messages: [{
    sender: { type: String, enum: ['user', 'admin'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }]
}, { timestamps: true });

export default model<Conversation>('Conversation', conversationSchema);