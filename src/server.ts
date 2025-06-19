import { Server } from 'socket.io';
import { createServer } from 'http';


import AuthRoutes from './routes/AuthRoutes';
import UserRoutes from './routes/UserRoutes';
import ReportRoutes from './routes/ReportRoutes';
import PendingLguRoutes from './routes/PendingLguRoutes';
import FAQRoutes from './routes/FAQRoutes';
import BlogsRoutes from './routes/BlogsRoutes';
import AnalyticsRoutes from './routes/AnalyticsRoutes';
import ComplaintRoutes from './routes/ComplainRoutes';
import passport from './config/auth';
import AppointmentRoutes from './routes/AppointmentRoutes';
import EventRoutes from './routes/EventRoutes';
import FormRoutes from './routes/lgu/FormRoutes'
import NotificationRoutes from './routes/NotificationRoutes';
import AnalyticsAdminRoutes from './routes/AnalyticsAdminRoutes';
import AuditLogsRoutes from './routes/AuditLogsRoutes';
import StaffRoutes from './routes/lgu/StaffRoutes';
import performanceRoutes from './routes/MetricsRoutes';
import AIRoutes from './routes/AIRoutes';
import CitizenNotificationRoutes from './routes/CitizenNotificationRoutes';
import ReportOverSightRoutes from './routes/ReportOverSightRoutes'
import ResponseRoutes from './routes/lgu/ResponseRoutes'


import { Request, Response } from 'express';
import session from 'express-session';
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST",]
  }
});

const corsOptions = {
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SESSION_SECRET as string || 'blasdbsad',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

dotenv.config();

const port = process.env.PORT || 3000;


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Mongodb is Working hehehe'))
  .catch((err : any) => console.log('Something went wrong', err));
  
app.use(express.json());
app.use('/account', AuthRoutes);
app.use('/admin', UserRoutes);
app.use('/lgu', PendingLguRoutes);
app.use('/form', ReportRoutes);
app.use('/analytics', AnalyticsRoutes);
app.use('/api/analytics/admin/', AnalyticsAdminRoutes);
app.use('/api/faqs', FAQRoutes);
app.use('/api/blogs', BlogsRoutes);
app.use('/complaints', ComplaintRoutes)
app.use('/appointments', AppointmentRoutes)
app.use('/events', EventRoutes);
app.use('/api/form', FormRoutes);
app.use('/api/response', ResponseRoutes);
app.use('/api/notify', NotificationRoutes);
app.use('/api/audit-logs', AuditLogsRoutes);
app.use('/api/staff', StaffRoutes)
app.use('/api/search', AIRoutes)
app.use('/api/citizen/notification', CitizenNotificationRoutes)
app.use('/api/report-oversight', ReportOverSightRoutes)


  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get(
    '/google/callback',
    passport.authenticate("google", { session: false }),
    (req: Request, res: Response) => {
      try {
        const user: any = req.user;

        const token = jwt.sign({ id: user._id }, "asdasdasda", { expiresIn: '7d' });

        res.redirect(`${process.env.CLIENT_URL}/account/citizen/${user._id}?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
        
      } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  );


  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/account/login' }),
    (req: Request, res: Response) => {
      try {
        const user: any = req.user;

        const token = jwt.sign({ id: user._id }, "asdasdasda", { expiresIn: '7d' });

        res.redirect(`${process.env.CLIENT_URL}/account/citizen/${user._id}?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
        
      } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  );


  //Socket ito
interface ChatMessage {
  userId: string;
  message: string;
  sender: 'user' | 'admin';
  timestamp: Date;
}

const activeAdmins = new Set<string>();
const humanRequests = new Map<string, ChatMessage[]>();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('ping', (cb) => cb());

  socket.on('register_user', (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} registered in room ${userId}`);
  });

  socket.on('admin_connect', () => {
    activeAdmins.add(socket.id);
    console.log('Admin connected:', socket.id);
    socket.emit('pending_requests', Array.from(humanRequests.keys()));
  });

  socket.on('request_human', (userId: string) => {
    console.log('Human support requested by:', userId);
    if (!humanRequests.has(userId)) {
      humanRequests.set(userId, []);
      for (const adminId of activeAdmins) {
        io.to(adminId).emit('new_request', userId);
      }
    }
  });

  socket.on('admin_join', (userId: string) => {
    console.log(`Admin ${socket.id} joining chat with user: ${userId}`);
    socket.join(userId);
    const history = humanRequests.get(userId) || [];
    socket.emit('chat_history', history);
  });

  socket.on('send_message', (msg: ChatMessage) => {
    console.log('Message received:', msg, 'from', socket.id);
    
    const history = humanRequests.get(msg.userId) || [];
    history.push(msg);
    humanRequests.set(msg.userId, history);

    console.log(`Broadcasting message to room ${msg.userId}`);
    io.in(msg.userId).emit(msg.sender === 'admin' ? 'receive_message' : 'user_message', msg);
  });

   socket.on('join_user', (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined notifications`);
  });

  socket.on('mark_read', (userId: string) => {
    io.to(userId).emit('read_notifications');
  });

  socket.on('disconnect', () => {
    activeAdmins.delete(socket.id);
    console.log('Disconnected:', socket.id);
  });
});

io.engine.on("initial_headers", (headers) => {
  headers["Access-Control-Allow-Origin"] = "http://localhost:5173";
  headers["Access-Control-Allow-Credentials"] = "true";
});

io.engine.on("headers", (headers) => {
  headers["Access-Control-Allow-Origin"] = "http://localhost:5173";
  headers["Access-Control-Allow-Credentials"] = "true";
});

export const sendNotification = (
  io: Server,
  userId: string,
  message: string,
  type: string,
  link: string
) => {
  const notification = { userId, message, type, link };
  io.to(userId).emit('new_notification', notification);
};


mongoose.connection.on('connected', () => {
  console.log('📊 MongoDB connected');
});

mongoose.connection.on('error', (error : any) => {
  console.error('📊 MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('📊 MongoDB disconnected');
});

app.use('/api/performance', performanceRoutes);

app.get('/api/health', (req : Request, res : Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


server.listen(port, () => {
  console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('Server is running at port ' + port);
});


