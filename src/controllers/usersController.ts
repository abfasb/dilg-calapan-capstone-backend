import { Request, Response } from 'express';
import User from '../models/User';
import GoogleUser from '../models/GoogleUser';
import ReportForms from '../models/ReportForm';
import LGU from '../models/LGUPendingUser';
import ResponseCitizen from '../models/ResponseCitizen';
import Complaint from '../models/Complaint';
import Event from '../models/Event';


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
        position: user.position,
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

  export const getSystemHealth = async (req: Request, res: Response) : Promise<void> => {
  try {
    const [
      userCount,
      pendingLGUCount,
      formCount,
      submissions,
      complaints,
      events,
      activeUsers,
      latestActivity
    ] = await Promise.all([
      User.countDocuments(),
      LGU.countDocuments({ status: 'pending' }),
      ReportForms.countDocuments(),
      ResponseCitizen.aggregate([
        { $group: { _id: '$status', count: { $sum: 1  } } } 
      ]),
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      User.countDocuments({ lastActivity: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.find().sort({ lastActivity: -1 }).limit(5).select('firstName lastName lastActivity role')
    ]);

    const transformAgg = (data: any[]) => 
      data.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

    res.json({
      metrics: {
        users: userCount,
        activeUsers,
        pendingLGUs: pendingLGUCount,
        forms: formCount,
        submissions: transformAgg(submissions),
        complaints: transformAgg(complaints),
        events: transformAgg(events)
      },
      latestActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


export const freezeAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { freezeDuration } = req.body;
    const days = parseInt(freezeDuration);

    let freezeUntil: Date = new Date();
    if (days > 0) {
      freezeUntil.setDate(freezeUntil.getDate() + days);
    } else {
      freezeUntil = new Date(0); 
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'admin') {
      res.status(403).json({ message: 'Cannot freeze admin accounts' });
      return;
    }

    user.isActive = false;
    user.freezeUntil = freezeUntil;
    await user.save();

    res.status(200).json({ message: 'Account frozen successfully' });
  } catch (error) {
    console.error('Freeze account error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'admin') {
      res.status(403).json({ message: 'Cannot delete admin accounts' });
      return;
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};