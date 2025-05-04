import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) : Promise<void>=> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
         res.status(401).json({ message: 'Missing authorization token' });
         return;
      }
  
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      
      const user = await User.findById(decoded.id).select('-password') as { _id: string; email: string };
      
      if (!user) {
         res.status(401).json({ message: 'Invalid token - user not found' });
         return;
      }
  
      req.user = {
        _id: user._id.toString(),
        email: user.email,
      };
  
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ message: 'Token expired' });
        return;
      }
      res.status(401).json({ message: 'Not authorized' });
    }
  };