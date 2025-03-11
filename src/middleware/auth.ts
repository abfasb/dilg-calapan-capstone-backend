import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

const auth = async (req: AuthRequest, res: Response, next: NextFunction) : Promise<void>=> {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log(process.env.JWT_SECRET_KEY);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as { 
      _id: string; 
      role: string 
    };

    req.user = {
      _id: decoded._id,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({ 
      message: 'Please authenticate',
      error: (error as Error).message 
    });
  }
};

export default auth;