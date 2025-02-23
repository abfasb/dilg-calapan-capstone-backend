import mongoose, { Schema, Document } from 'mongoose';

interface IFormField {
    id: string;
    type: "text" | "number" | "radio" | "checkbox" | "image" | "dropdown";
    label: string;
    required: boolean;
    options?: string[];
    description?: string;
    image?: string;
  }
  
  interface IForm extends mongoose.Document {
    title: string;
    description: string;
    fields: IFormField[];
  }
  
  const formSchema = new mongoose.Schema<IForm>({
    title: { type: String, required: true },
    description: String,
    fields: [{ type: Object, required: true }],
  });
  
  const ReportForms = mongoose.model<IForm>("ReportForms", formSchema);

  export default ReportForms;