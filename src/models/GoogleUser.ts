import mongoose, { Schema, Document} from 'mongoose';

export interface IGoogleUser extends Document {
    googleId: string;
    email: string,
    name: string,
    fcmToken?: string; 
}

const GoogleUserSchema : Schema = new Schema({
    googleId: { type: String , unique: true},
    email: { type: String, unique: true, required: true},
    name: { type: String},
})

const GoogleUser = mongoose.model<IGoogleUser>('GoogleUser', GoogleUserSchema);

export default GoogleUser;