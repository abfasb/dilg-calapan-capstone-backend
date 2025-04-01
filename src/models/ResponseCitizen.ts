import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    referenceNumber: { type: String, unique: true, required: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportForms', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
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
      default: "pending" 
    },
    history: [{
      status: String,
      updatedBy: String,
      document: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: { type: Date, default: Date.now }
  });

const ResponseCitizen = mongoose.model("Response", submissionSchema);

export default ResponseCitizen;
  