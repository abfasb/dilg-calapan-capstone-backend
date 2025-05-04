import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const authenticate = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
         res.status(401).json({ message: 'Authentication required' });
         return;
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await User.findById(decoded.userId) as { _id: string } | null;
      
      if (!user) {
         res.status(404).json({ message: 'User not found' });
        return;
      }
  
      req.user = { _id: user._id };
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };

  export default authenticate;