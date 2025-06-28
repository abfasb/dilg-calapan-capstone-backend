import { Request, Response, NextFunction, raw, response } from 'express';
import User, { IUser } from '../models/User'; 
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import GoogleUser from '../models/GoogleUser';
import AutditLogs from '../models/AutditLogs';


const jwtSecret = process.env.JWT_SECRET_KEY || 'asdsajbdjba';

export const createUser = async(req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
        const { email, password, role = "citizen", lastName, firstName, barangay, position, phoneNumber } = req.body;

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
             res.status(409).json({ message: 'Email already exists' });
             return
        }

        const existingPosition = await User.findOne({ barangay, position });
        if (existingPosition) {
             res.status(409).json({ message: 'This position in the selected barangay is already taken' });
             return
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user: IUser = new User({ 
            email, 
            password: hashedPassword, 
            role, 
            lastName, 
            firstName, 
            barangay, 
            position, 
            phoneNumber 
        });
        
        await user.save();
        res.status(201).json({ message: 'Account created successfully!' });

    } catch(error) {
        next(error);
    }
}

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const findUser = await User.findOne({ email });

    if (!findUser) {
      res.status(404).json({ message: 'You don’t have an account' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, findUser.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid Credentials' });
      return;
    }

    const expiresIn = rememberMe ? '30d' : '1d';

    const token = jwt.sign(
      { 
        id: findUser._id, 
        role: findUser.role, 
        email: findUser.email 
      },
      jwtSecret,
      { expiresIn }
    );

    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString();
    const userAgent = req.headers['user-agent'] || 'Unknown device';

    const dateToday = new Date();

    await User.updateOne(
      { _id: findUser._id },
      { $set: { lastActivity: dateToday } }
    );

    // Create audit log
    await AutditLogs.create({
      userId: findUser._id,
      email: findUser.email,
      role: findUser.role,
      action: `Logged in as ${findUser.role}`,
      ipAddress,
      userAgent,
    });

    // Determine redirect URL based on role
    let redirectUrl = '';
    switch (findUser.role.toLowerCase()) {
      case 'admin':
        redirectUrl = `/account/admin/${findUser._id}`;
        break;
      case 'lgu':
        redirectUrl = `/account/lgu/${findUser._id}`;
        break;
      default:
        redirectUrl = `/account/citizen/${findUser._id}`;
    }

    res.status(200).json({
      message: "Login Successfully",
      token,
      user: {
        id: findUser._id,
        firstName: findUser.firstName,
        lastName: findUser.lastName,
        position: findUser.position,
        barangay: findUser.barangay,
        phoneNumber: findUser.phoneNumber,
        name: `${findUser.firstName} ${findUser.lastName}`,
        email: findUser.email,
        role: findUser.role,
      },
      redirectUrl
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const forgotPasswordUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            user = await GoogleUser.findOne({ email });
        }

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetToken = hashedToken; 
        user.resetTokenExpiry = new Date(Date.now() + 3600000); 
        await user.save();

        const resetUrl = `http://localhost:5173/account/forgot-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.ACC_EMAIL,
                pass: process.env.ACC_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.ACC_EMAIL,
            to: email,
            subject: "Reset Password",
            text: `Click this link to reset your password: ${resetUrl}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ message: "Error sending email" });
            }
            console.log("Email sent:", info.response);
            res.json({ message: "Password reset email sent" });
        });
    } catch (error) {
        next(error);
    }
};

  export const resetPasswordGetEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
          const { token } = req.params;
          const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

          let user = await User.findOne({ resetToken: hashedToken, resetTokenExpiry: { $gt: Date.now() } }).select("email");
          if (!user) {
              user = await GoogleUser.findOne({ resetToken: hashedToken, resetTokenExpiry: { $gt: Date.now() } }).select("email");
          }

          if (!user) {
              res.status(404).json({ message: "Invalid or expired token" });
              return;
          }

          res.json({ email: user.email });
      } catch (error) {
          console.error("Error in resetPasswordGetEmail:", error);
          next(error);
      }
  };

export const resetPasswordUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        let user = await User.findOne({
            resetToken: hashedToken,
            resetTokenExpiry: { $gt: Date.now() },
        });
        if (!user) {
            user = await GoogleUser.findOne({
                resetToken: hashedToken,
                resetTokenExpiry: { $gt: Date.now() },
            });
        }

        if (!user) {
            res.status(404).json({ message: "Invalid or expired token" });
            return;
        }

        user.password = await bcrypt.hash(password, 10);

        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;

        await user.save({ validateBeforeSave: false });

        res.json({ message: "Password successfully reset" });
    } catch (error) {
        next(error);
    }
};



export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
          const { id } = req.params;
          let user = await User.findById(id);
          if (user) {
            res.status(200).json({ user })
            return;
        }
          user = await GoogleUser.findById(id);
          if (user)  {
             res.status(200).json({  user }) ;
             return;
        };
          res.status(404).json({ error: 'User not found' });
          return;

        } catch (error : any) {
          res.status(500).json({ error});
}
}


export const getLGUUsers = async (req : Request, res : Response, next: NextFunction) : Promise<void> => {
    try {
      const users = await User.find({ role: 'lgu' })
        .select('-password -__v')
        .lean();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching LGU users', error });
    }
  };

  
  export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { firstName, lastName, phoneNumber, email } = req.body;
  
      const updatedUser = await User.findByIdAndUpdate(
        id, 
        { firstName, lastName, phoneNumber, email },
        { new: true, runValidators: true }
      ).select('-password -resetToken -resetTokenExpiry');
  
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
  
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };