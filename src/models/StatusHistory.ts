import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  documentName: { type: String, required: true },
  referenceNumber: { type: String, required: true },
  previousStatus: { type: String, required: true },
  newStatus: { type: String, required: true },
  updatedBy: { type: String, required: true },
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportForms' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("StatusHistory", statusHistorySchema);