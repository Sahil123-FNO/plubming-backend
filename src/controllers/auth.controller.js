const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/user.model');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const authController = {
  signup: async (req, res) => {
    try {
      const { email, password, phone, name } = req.body;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      const user = new User({
        email,
        name,
        password,
        phone,
        verificationToken
      });
      
      await user.save();

      // Send verification email
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
    try{
      await transporter.sendMail({
        to: email,
        subject: 'Please verify your email',
        html: `Click <a href="${verificationUrl}">here</a> to verify your email.`
      });
    }catch(err) { 
      console.log('error', err)
    }
      res.status(201).json({ message: 'User created. Please verify your email.' });
    } catch (error) {
      console.log('error herere', error);
      res.status(500).json({ message: error.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email, } = req.body;
      

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(400).json({ message: 'Email not registered' });
      }

      const forgotPasswordToken = crypto.randomBytes(32).toString('hex');
      
      await User.updateOne({ _id: existingUser._id}, { forgotPasswordToken});
      // Send verification email
      try{
      await transporter.sendMail({
        to: email,
        subject: 'Please verify your email',
        html: `Reset password OTP: ${forgotPasswordToken}`
      });
    }catch(err){
      console.log('error', err)
    }

      res.status(201).json({ message: 'User created. Please verify your email.' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, newPasword, token} = req.body;
      
  
      
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(400).json({ message: 'Email not registered' });
      }

      const forgotPasswordToken = crypto.randomBytes(32).toString('hex');
      
      await User.updateOne({ _id: existingUser._id}, { forgotPasswordToken});
      // Send verification email
      
      await transporter.sendMail({
        to: email,
        subject: 'Please verify your email',
        html: `Reset password OTP: ${forgotPasswordToken}`
      });


      res.status(201).json({ message: 'User created. Please verify your email.' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  resendSendOtp: async (req, res) => {
    try {
      const { email } = req.body;
      
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(400).json({ message: 'Email not registered' });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      await User.updateOne({ _id: existingUser._id}, { verificationToken});
      // Send verification email
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
      try{
      await transporter.sendMail({
        to: email,
        subject: 'Please verify your email',
        html: `Click <a href="${verificationUrl}">here</a> to verify your email.`
      });
    }catch(err){
      console.log('error', err)
    }
      res.status(201).json({ message: 'User created. Please verify your email.' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  verifyEmail: async (req, res) => {
    try {
      const { token } = req.params;
      const user = await User.findOne({ verificationToken: token });
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  login: async (req, res) => {
    try {
  
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await user.comparePassword(password))) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (!user.isVerified) {
        return res.status(400).json({ message: 'Please verify your email first' });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = authController; 