import mongoose, { Schema } from "mongoose";

const submissionSchema = new mongoose.Schema({
    referenceNumber: { type: String, unique: true, required: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportForms', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: Map, of: mongoose.Schema.Types.Mixed },
    files: [{
      filename: String,
      url: String,
      mimetype: String
    }],
    bulkFile: {
      fileName: String,
      fileType: String,
      fileUrl: String,
      uploadedAt: Date
    },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending",
      comments: { type: String, required: false },
    },
    comments: { type: String},
    signature: {
      fileName: { type: String },
      fileUrl: { type: String },
      mimetype: { type: String },
      signedAt: { type: Date },
    },
    history: [{
      status: String,
      updatedBy: String,
      lguId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      lguName: String, 
      document: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      assignedLgu: { type: Schema.Types.ObjectId, ref: 'User' },
      currentStatus: String,
      comments: String
    }],
    createdAt: { type: Date, default: Date.now }
  });

const ResponseCitizen = mongoose.model("Response", submissionSchema);

export default ResponseCitizen;
  