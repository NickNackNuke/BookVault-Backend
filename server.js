const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);

// Import routes
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Set mongoose debug mode
mongoose.set('debug', true);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Log the database name
    console.log('Database name:', mongoose.connection.db.databaseName);
    // Log all collections
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      if (err) {
        console.error('Error listing collections:', err);
        return;
      }
      console.log('Collections:', collections.map(c => c.name));
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    console.error('Connection string used:', process.env.MONGODB_URI);
  });

// Routes
app.use('/api/auth', authRoutes);

// Test endpoint to list all users
app.get('/api/user', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password field
    console.log('All users:', users);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.send('Book App Backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 