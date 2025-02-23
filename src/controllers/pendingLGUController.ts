import Express, { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import LGU, {ILGU} from "../models/LGUPendingUser";

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

        if (!['approved', 'rejected'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        const updatedLGU = await LGU.findByIdAndUpdate(req.params.id, { status }, { new: true });

        if (!updatedLGU) {
            res.status(404).json({ message: 'LGU not found' });
            return;
        }

        if (status === 'approved') {
            const { email, password, firstName, lastName, phoneNumber } = updatedLGU;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                res.status(400).json({ message: 'User already exists' });
                return
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser : IUser = new User({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phoneNumber,
                role: "lgu"
            });

            await newUser.save();
        }

        res.json({ message: `LGU has been ${status}`, updatedLGU });

    } catch (error) {
        next(error);
    }
};