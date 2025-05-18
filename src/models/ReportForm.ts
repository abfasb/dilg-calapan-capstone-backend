  import mongoose, { Schema, Document } from 'mongoose';

  interface ITemplateFile {
    fileName: string;
    fileUrl: string;
    mimetype: string;
  }

  interface IFormField {
      type: "text" | "number" | "radio" | "checkbox" | "image" | "dropdown";
      label: string;
      required: boolean;
      options?: string[];
      description?: string;
      image?: string;
    }

    interface IResponse {
      data: any;
      submittedAt: Date;
    }
    
    interface IForm extends mongoose.Document {
      title: string;
      description: string;
      createdAt: Date;
      fields: IFormField[];
      responses: IResponse[]; 
      template: ITemplateFile;
    }
    
    const formSchema = new mongoose.Schema<IForm>({
      title: { type: String, required: true },
      description: String,
      createdAt: { type: Date, default: Date.now },
      fields: [{ type: Object, required: true }],
      responses: [
        {
          data: Schema.Types.Mixed,
          submittedAt: { type: Date, default: Date.now },
        },
      ],
      template: {
        fileName: String,
        fileUrl: String,
        mimetype: String
      },
    });
    
    const ReportForms = mongoose.model<IForm>("ReportForms", formSchema);


    export default ReportForms;