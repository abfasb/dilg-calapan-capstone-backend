import { Request, Response } from 'express';
import User from '../models/User';
import GoogleUser from '../models/GoogleUser';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const [users, googleUsers] = await Promise.all([
        User.find(),
        GoogleUser.find(),
      ]);
  
      const formattedUsers = users.map(user => ({
        _id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        type: "Regular",
      }));
  
      const formattedGoogleUsers = googleUsers.map(user => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        role: "Google User", 
        phoneNumber: null,
        createdAt: null, 
        type: "Google", 
      }));
  
      const allUsers = [...formattedUsers, ...formattedGoogleUsers];
  
      res.status(200).json(allUsers);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };