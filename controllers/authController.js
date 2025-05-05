const User = require('../models/User');
const crypto = require('crypto');

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Signup Controller
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Signup attempt:', { username, email });

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('User already exists:', { email, username });
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password
    });

    // Generate session ID
    const sessionId = generateSessionId();
    user.sessionId = sessionId;
    user.lastActive = new Date();
    await user.save();

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    console.log('User created successfully:', { id: user._id, username: user.username, email: user.email });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Login Controller
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log('Login attempt for:', email || username);

    // Use whichever is provided
    const user = await User.findOne({
      $or: [
        { email: email || "" },
        { username: username || "" }
      ]
    });

    if (!user) {
      console.log('No user found with email or username:', email, username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', email || username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate and save session ID
    const sessionId = generateSessionId();
    user.sessionId = sessionId;
    user.lastActive = new Date();
    await user.save();

    // Set session ID in cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Logout Controller
exports.logout = async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    console.log('Logout attempt for session:', sessionId);
    
    if (sessionId) {
      const user = await User.findOneAndUpdate(
        { sessionId },
        { $set: { sessionId: null, lastActive: null } }
      );
      console.log('User logged out:', user?.email);
    }
    res.clearCookie('sessionId');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 