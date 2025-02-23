import { Schema, model, Document } from "mongoose";

export interface ILGU extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  position: string;
  phoneNumber: string;
  status: "pending" | "approved" | "rejected";
}

const lguSchema = new Schema<ILGU>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const LGU = model<ILGU>("LGUPendingUsers", lguSchema);
export default LGU;
