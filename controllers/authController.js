const User = require('../models/User');
const crypto = require('crypto');

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Format user response to include userId
const formatUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : user;

  // Log the raw user object received by this function
  console.log('formatUserResponse: Received user object:', JSON.stringify(userObj, null, 2));

  let responseId = null;
  if (userObj && userObj._id) { // Check if userObj and userObj._id exist
    responseId = userObj._id.toString(); // Ensure it's a string
  } else {
    console.error('CRITICAL: _id is missing or userObj is null/undefined in formatUserResponse. User Object:', JSON.stringify(userObj, null, 2));
  }

  let responseUserId = 'No userId generated';
  if (userObj && userObj.userId) {
      responseUserId = userObj.userId;
  } else if (userObj) { // userObj exists but userId doesn't
      console.warn('Warning: userId is missing from user object in formatUserResponse. User Object:', JSON.stringify(userObj, null, 2));
  }

  return {
    id: responseId, // This is the MongoDB _id as a string
    userId: responseUserId, // This is the custom USR-XXXX ID
    username: userObj ? userObj.username : undefined,
    email: userObj ? userObj.email : undefined
  };
};

// Export the function
exports.formatUserResponse = formatUserResponse;

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

    // Create new user with unique ID - use regular create for now to debug
    const user = new User({
      username,
      email,
      password
    });
    
    // Generate userId explicitly if needed
    if (!user.userId) {
      user.userId = `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    
    // Save the user
    await user.save();
    
    console.log('User after save:', JSON.stringify(user, null, 2));

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

    console.log('User created successfully:', { 
      id: user._id, 
      userId: user.userId, 
      username: user.username, 
      email: user.email 
    });

    res.status(201).json({
      success: true,
      user: formatUserResponse(user),
      token: sessionId // Include token in response for mobile apps
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
    console.log('Login attempt with body:', JSON.stringify(req.body));

    // Use whichever is provided
    const user = await User.findOne({
      $or: [
        { email: email || "" },
        { username: username || "" }
      ]
    });

    if (!user) {
      console.log('Login attempt: No user found with email or username:', email, username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Log the raw user document fetched from DB *before* any modification or formatting
    console.log('Login attempt: User found in DB (raw Mongoose object):', JSON.stringify(user, null, 2));
    console.log('Login attempt: User found in DB (_id):', user._id ? user._id.toString() : 'MISSING_ID', 'Type:', user._id ? typeof user._id : 'N/A');

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login attempt: Password mismatch for user:', user.username || user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password mismatch.'
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

    const formattedUser = formatUserResponse(user);
    console.log('Login successful. Formatted user response:', JSON.stringify(formattedUser, null, 2));

    res.status(200).json({
      success: true,
      user: formattedUser,
      token: sessionId // Include token in response for mobile apps
    });
  } catch (error) {
    console.error('Login error:', error.message, error.stack); // Log full error stack
    res.status(500).json({
      success: false,
      message: 'Server error during login.' // More generic message to client
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