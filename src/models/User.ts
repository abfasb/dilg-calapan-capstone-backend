import mongoose, { Schema, Document} from "mongoose";


export interface IUser extends Document {
    id?: string,
    username: string,
    email: string,
    password: string,
    role: string,
    firstName: string,
    lastName: string,
    barangay: string,
    position: string,
    phoneNumber: string,
    resetToken?: string,
    resetTokenExpiry?: Date,
    createdAt: Date,
    updatedAt: Date,
    lastLogin: Date,
    fcmToken?: string;
    lastActivity: Date; 
    isActive: boolean;
}

const UserSchema : Schema = new Schema ({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'Citizen'
    },
    lastName: {
        type: String, 
        required: true
    },
    firstName: {
        type: String, 
        required: true
    },
    barangay: {
        type: String, 
        required: false
    },
    position: {
        type: String, 
        required: true
    },
    phoneNumber: {
        type: String, 
        required: true
    },
    fcmToken: {
        type: String,
    },
    resetToken: {
        type: String
    },
    resetTokenExpiry: {
        type: Date
    },
    lastLogin: {
        type: Date
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
     isActive: {  
        type: Boolean,
        default: true
    }
}, { timestamps: true})

const User = mongoose.model<IUser>('User', UserSchema);

export default User;

