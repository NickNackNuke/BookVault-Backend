const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); // No longer needed

const userSchema = new mongoose.Schema({
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

// REMOVE password hashing middleware
// userSchema.pre('save', async function(next) {
//   try {
//     if (!this.isModified('password')) return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Plain text password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return candidatePassword === this.password;
};

userSchema.post('save', function(doc) {
  console.log('User saved:', {
    id: doc._id,
    username: doc.username,
    email: doc.email,
  });
});

userSchema.post('findOne', function(doc) {
  if (doc) {
    console.log('User found:', {
      id: doc._id,
      username: doc.username,
      email: doc.email,
    });
  } else {
    console.log('No user found');
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 