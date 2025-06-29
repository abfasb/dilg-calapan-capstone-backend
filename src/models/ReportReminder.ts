import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  formId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ReportForms',
    required: true 
  },
  barangayId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ReportReminder = mongoose.model('ReportReminder', notificationSchema);

export default ReportReminder;