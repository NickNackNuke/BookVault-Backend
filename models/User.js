const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); // No longer needed

// Create a function to generate a user ID
function generateUserId() {
  // Generate a random 6-character alphanumeric string using only simpler characters
  // Using only uppercase letters and numbers, excluding similar-looking characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'USR-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: generateUserId,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3
  },
  sessionId: {
    type: String,
    default: null
  },
  lastActive: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'user'
});

// Create index for faster lookups
userSchema.index({ userId: 1 });

// Simpler pre-save hook to ensure userId is set
userSchema.pre('save', function(next) {
  const user = this;
  
  // Generate a userId if it doesn't exist
  if (!user.userId) {
    user.userId = generateUserId();
    console.log('Generated userId:', user.userId);
  }
  
  next();
});

// Static method to create a user with guaranteed unique userId
userSchema.statics.createWithUniqueId = async function(userData) {
  let isUnique = false;
  let newUser;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    try {
      // Generate a new userId if not provided
      if (!userData.userId) {
        userData.userId = generateUserId();
      }
      
      newUser = new User(userData);
      await newUser.save();
      
      // If save succeeds, the ID is unique
      isUnique = true;
    } catch (error) {
      // If error is a duplicate key error for userId, try again with a new ID
      if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern && error.keyPattern.userId) {
        userData.userId = generateUserId();
        console.log(`Duplicate userId detected, retrying with new ID: ${userData.userId}`);
      } else {
        // For other errors, re-throw
        throw error;
      }
    }
  }
  
  if (!isUnique) {
    throw new Error(`Failed to create user with unique ID after ${maxAttempts} attempts`);
  }
  
  return newUser;
};

// Plain text password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return candidatePassword === this.password;
};

// Helper method to format user response with userId prominently displayed
userSchema.methods.toPublic = function() {
  return {
    _id: this._id,
    userId: this.userId,
    username: this.username,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

userSchema.post('save', function(doc) {
  console.log('User saved:', {
    id: doc._id,
    userId: doc.userId,
    username: doc.username,
    email: doc.email,
  });
});

userSchema.post('findOne', function(doc) {
  if (doc) {
    console.log('User found:', {
      id: doc._id,
      userId: doc.userId,
      username: doc.username,
      email: doc.email,
    });
  } else {
    console.log('No user found');
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 