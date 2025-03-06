import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    referenceNumber: { type: String, unique: true, required: true },
    formId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: Map, of: mongoose.Schema.Types.Mixed },
    files: [{
      fieldId: String,
      fileNames: [String]
    }],
    createdAt: { type: Date, default: Date.now }
  });

const ResponseCitizen = mongoose.model("Response", submissionSchema);

export default ResponseCitizen;
  