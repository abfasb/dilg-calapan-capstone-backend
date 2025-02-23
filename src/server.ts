import AuthRoutes from './routes/AuthRoutes';
import UserRoutes from './routes/UserRoutes';
import PendingLguRoutes from './routes/PendingLguRoutes';
import passport from './config/auth';
import { Request, Response } from 'express';
import session from 'express-session';
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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
app.use('/admin', UserRoutes)
app.use('/lgu', PendingLguRoutes)

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/google/callback', passport.authenticate("google", { session: false }), (req : Request, res : Response) => {
  try{
      const user : any= req.user;

      const token = jwt.sign({ id: user._id}, "asdasdasda", { expiresIn: '7d'});

      res.json({ message: 'Login Successful', token, user});
  }catch(error){
    res.status(500).json({message: 'Internal Server Error'});
  }
 })


app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req : Request, res : Response ) => {
    res.send("Login Successful");
  }
)



app.listen(port, () => {
  console.log('Server is running at port ' + port);
});


