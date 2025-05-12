const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication
router.use(requireAuth);

// Get current user profile
router.get('/profile', (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Update user profile
router.put('/profile', userController.updateProfile);

// Delete account
router.delete('/account', userController.deleteAccount);

module.exports = router; 