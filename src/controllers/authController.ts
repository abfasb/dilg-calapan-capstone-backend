import { Request, Response, NextFunction, raw, response } from 'express';
import User, { IUser } from '../models/User'; 
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import GoogleUser from '../models/GoogleUser';


const jwtSecret = process.env.JWT_SECRET_KEY || 'asdsajbdjba';

export const createUser = async(req: Request, res: Response, next:NextFunction): Promise<void> => {

    try{
        const {email, password, role = "citzen", lastName, firstName, phoneNumber} = req.body;

        const findUser = await User.findOne({email});

        if(findUser) {
            res.status(400).json({message: 'User already exist'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user : IUser = new User({ email, password: hashedPassword, role, lastName, firstName, phoneNumber})
        
        await user.save();

        res.status(201).json({message: 'Account created successfully!'});

    } catch(error) {
        next(error);
    }
}

export const loginUser = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;

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

        const token = jwt.sign(
            { id: findUser._id, role: findUser.role, email: findUser.email },
            jwtSecret,
            { expiresIn: '5d' }
        );


        if (findUser.role === "Admin") {
            res.status(200).json({
              message: "Login Successfully",
              token,
              redirectUrl: `/account/admin/${findUser._id}`,
              user: {
                id: findUser._id,
                email: findUser.email,
                role: findUser.role,
              },
            });
            return;
          }

           res.status(200).json({
            message: 'Login Successfully',
            token,
            user: {
              id: findUser._id,
              username: findUser.username,
              email: findUser.email,
              role: findUser.role,
              firstName: findUser.firstName,
              lastName: findUser.lastName,
            },
            redirectUrl: `/dashboard/${findUser._id}`
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



