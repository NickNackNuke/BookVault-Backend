const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    bookId: {
        type: String,
        required: true,
        ref: 'Book'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews from same user for same book
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 