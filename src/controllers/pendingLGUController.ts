import Express, { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import LGU, {ILGU} from "../models/LGUPendingUser";
import nodemailer from "nodemailer";

export const createPendingLgu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, email, password, position, phoneNumber } = req.body;

    const [existingPending, existingUser] = await Promise.all([
      LGU.findOne({ email }),
      User.findOne({ email })
    ]);

    if (existingPending) {
       res.status(409).json({ 
        message: 'Email already has a pending registration',
        field: 'email'
      });
      return;
    }

    if (existingUser) {
      res.status(409).json({ 
        message: 'Email already registered in the system',
        field: 'email'
      });
      return;
    }

    const newLGU: ILGU = new LGU({ firstName, lastName, email, password, position, phoneNumber });
    await newLGU.save();

    res.status(201).json({ message: 'LGU registration submitted', lgu: newLGU });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
}

export const getAllPendingLgu = async (req : Request, res : Response, next: NextFunction) => {
    try {
      const pendingLGUs = await LGU.find({ status: 'pending' });
      res.json(pendingLGUs);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }

  export const approveOrRejectLgu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status } = req.body;
        const lguId = req.params.id;

        if (!['approved', 'rejected'].includes(status)) {
             res.status(400).json({ message: 'Invalid status' });
             return;
        }

        const lgu = await LGU.findById(lguId);
        if (!lgu) {
           res.status(404).json({ message: 'LGU not found' });
           return;
        }

        lgu.status = status;
        const updatedLGU = await lgu.save();

        if (status === 'approved') {
            const existingUser = await User.findOne({ email: lgu.email });
            if (existingUser) {
                res.status(400).json({ message: 'User already exists' });
                return;
            }

            const hashedPassword = await bcrypt.hash(lgu.password, 10);
            const newUser = new User({
                firstName: lgu.firstName,
                lastName: lgu.lastName,
                email: lgu.email,
                password: hashedPassword,
                phoneNumber: lgu.phoneNumber,
                role: 'lgu',
                status: 'active',
                position: lgu.position,
            });

            await newUser.save();

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.ACC_EMAIL,
                    pass: process.env.ACC_PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.ACC_EMAIL,
                to: lgu.email,
                subject: "LGU Account Approved",
                html: `<p>Hi ${lgu.firstName},</p>
                     <p>Your LGU account request has been approved!</p>
                     <p>You can now log in using your registered email.</p>`
            };

            transporter.sendMail(mailOptions)
                .then(info => console.log('Email sent:', info.response))
                .catch(error => console.error('Email error:', error));
        }

        res.json({
            message: `LGU request ${status} successfully`,
            data: updatedLGU
        });

    } catch (error) {
        console.error('Error in approveOrRejectLgu:', error);
        next(error);
    }
};