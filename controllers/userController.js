const User = require('../models/User');
const { formatUserResponse } = require('./authController');

// Update user profile
exports.updateProfile = async (req, res) => {
    console.log('[userController.js] Updating profile for user:', req.user._id);
    console.log('[userController.js] Update data:', req.body);

    try {
        const { username, email, password } = req.body;
        const userId = req.user._id;

        // Find user and validate they exist
        const user = await User.findById(userId);
        if (!user) {
            console.log('[userController.js] User not found:', userId);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if username is already taken by another user
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                console.log('[userController.js] Username already taken:', username);
                return res.status(400).json({
                    success: false,
                    error: 'Username already taken'
                });
            }
        }

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                console.log('[userController.js] Email already taken:', email);
                return res.status(400).json({
                    success: false,
                    error: 'Email already taken'
                });
            }
        }

        // Update fields if provided
        if (username) user.username = username;
        if (email) user.email = email;
        if (password) user.password = password;

        await user.save();
        console.log('[userController.js] Profile updated successfully for user:', userId);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: formatUserResponse(user)
        });
    } catch (error) {
        console.error('[userController.js] Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
    console.log('[userController.js] Deleting account for user:', req.user._id);
    try {
        const userId = req.user._id;

        // Delete the user
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            console.log('[userController.js] User not found for deletion:', userId);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Clear session
        res.clearCookie('sessionId');
        console.log('[userController.js] Account deleted successfully for user:', userId);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('[userController.js] Error deleting account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 