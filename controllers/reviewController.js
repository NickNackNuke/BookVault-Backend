const Review = require('../models/Review');
const Book = require('../models/Book');
const mongoose = require('mongoose');

// Create or update a review
exports.createReview = async (req, res) => {
    console.log('[reviewController.js] Creating/updating review with data:', {
        body: req.body,
        params: req.params,
        user: req.user._id
    });

    try {
        const { rating, comment } = req.body;
        const idParam = req.params.id;
        const userId = req.user._id;

        // Validate rating
        const numericRating = Number(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            console.log('[reviewController.js] Invalid rating:', rating);
            return res.status(400).json({
                success: false,
                error: 'Rating must be a number between 1 and 5'
            });
        }

        // Find the book first to get its bookId
        let book;
        if (mongoose.Types.ObjectId.isValid(idParam)) {
            console.log('[reviewController.js] Looking up book by MongoDB _id');
            book = await Book.findById(idParam);
        } else {
            console.log('[reviewController.js] Looking up book by custom bookId');
            book = await Book.findOne({ bookId: idParam });
        }

        if (!book) {
            console.log('[reviewController.js] Book not found');
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Check if user has already reviewed this book using the book's bookId
        let review = await Review.findOne({ bookId: book.bookId, userId });
        
        if (review) {
            // Update existing review
            console.log('[reviewController.js] Updating existing review:', review);
            review.rating = numericRating;
            review.comment = comment || '';
            await review.save();
        } else {
            // Create new review
            review = await Review.create({
                bookId: book.bookId,
                userId,
                rating: numericRating,
                comment: comment || ''
            });
        }

        // Populate the user information in the review
        await review.populate('userId', 'username email userId');

        console.log('[reviewController.js] Review saved:', review);

        // Update book's average rating
        const allReviews = await Review.find({ bookId: book.bookId });
        const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        book.averageRating = totalRating / allReviews.length;
        book.totalReviews = allReviews.length;
        await book.save();
        
        console.log('[reviewController.js] Updated book ratings:', {
            bookId: book.bookId,
            averageRating: book.averageRating,
            totalReviews: book.totalReviews
        });

        // Format the review response
        const formattedReview = {
            _id: review._id,
            bookId: review.bookId,
            rating: review.rating,
            comment: review.comment,
            user: {
                id: review.userId._id,
                userId: review.userId.userId,
                username: review.userId.username,
                email: review.userId.email
            },
            createdAt: review.createdAt,
            updatedAt: review.updatedAt
        };

        res.status(200).json({
            success: true,
            message: review.isNew ? 'Review submitted successfully' : 'Review updated successfully',
            review: formattedReview,
            averageRating: book.averageRating,
            totalReviews: book.totalReviews
        });
    } catch (error) {
        console.error('[reviewController.js] Error saving review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all reviews for a book
exports.getBookReviews = async (req, res) => {
    console.log('[reviewController.js] Getting reviews for book:', req.params.id);
    try {
        const idParam = req.params.id;
        
        // First, find the book to get its bookId
        let book;
        if (mongoose.Types.ObjectId.isValid(idParam)) {
            console.log('[reviewController.js] Looking up book by MongoDB _id');
            book = await Book.findById(idParam);
        } else {
            console.log('[reviewController.js] Looking up book by custom bookId');
            book = await Book.findOne({ bookId: idParam });
        }

        if (!book) {
            console.log('[reviewController.js] Book not found');
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Use the book's bookId to find reviews
        const reviews = await Review.find({ bookId: book.bookId })
            .populate('userId', 'username email userId')  // Added userId to population
            .sort('-createdAt');

        console.log(`[reviewController.js] Found ${reviews.length} reviews for book ${book.bookId}`);
        
        // Format the reviews response
        const formattedReviews = reviews.map(review => ({
            _id: review._id,
            bookId: review.bookId,
            rating: review.rating,
            comment: review.comment,
            user: {
                id: review.userId._id,
                userId: review.userId.userId,
                username: review.userId.username,
                email: review.userId.email
            },
            createdAt: review.createdAt,
            updatedAt: review.updatedAt
        }));

        res.json({
            success: true,
            reviews: formattedReviews,
            averageRating: book.averageRating,
            totalReviews: book.totalReviews
        });
    } catch (error) {
        console.error('[reviewController.js] Error getting reviews:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update a review
exports.updateReview = async (req, res) => {
    console.log('[reviewController.js] Updating review:', {
        bookId: req.params.id,
        reviewId: req.params.reviewId,
        userId: req.user._id
    });
    try {
        const { rating, comment } = req.body;
        const idParam = req.params.id;
        const { reviewId } = req.params;
        const userId = req.user._id;

        // Find the book first
        let book;
        if (mongoose.Types.ObjectId.isValid(idParam)) {
            console.log('[reviewController.js] Looking up book by MongoDB _id');
            book = await Book.findById(idParam);
        } else {
            console.log('[reviewController.js] Looking up book by custom bookId');
            book = await Book.findOne({ bookId: idParam });
        }

        if (!book) {
            console.log('[reviewController.js] Book not found');
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        const review = await Review.findOne({
            _id: reviewId,
            bookId: book.bookId,
            userId
        });

        if (!review) {
            console.log('[reviewController.js] Review not found or not authorized');
            return res.status(404).json({
                success: false,
                error: 'Review not found or not authorized'
            });
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;
        await review.save();

        // Update book's average rating
        const allReviews = await Review.find({ bookId: book.bookId });
        const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        book.averageRating = totalRating / allReviews.length;
        book.totalReviews = allReviews.length;
        await book.save();
        
        console.log('[reviewController.js] Updated book ratings:', {
            bookId: book.bookId,
            averageRating: book.averageRating,
            totalReviews: book.totalReviews
        });

        res.json({
            success: true,
            review
        });
    } catch (error) {
        console.error('[reviewController.js] Error updating review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete a review
exports.deleteReview = async (req, res) => {
    console.log('[reviewController.js] Deleting review:', {
        bookId: req.params.id,
        reviewId: req.params.reviewId,
        userId: req.user._id
    });
    try {
        const idParam = req.params.id;
        const { reviewId } = req.params;
        const userId = req.user._id;

        // Find the book first
        let book;
        if (mongoose.Types.ObjectId.isValid(idParam)) {
            console.log('[reviewController.js] Looking up book by MongoDB _id');
            book = await Book.findById(idParam);
        } else {
            console.log('[reviewController.js] Looking up book by custom bookId');
            book = await Book.findOne({ bookId: idParam });
        }

        if (!book) {
            console.log('[reviewController.js] Book not found');
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        const review = await Review.findOneAndDelete({
            _id: reviewId,
            bookId: book.bookId,
            userId
        });

        if (!review) {
            console.log('[reviewController.js] Review not found or not authorized');
            return res.status(404).json({
                success: false,
                error: 'Review not found or not authorized'
            });
        }

        // Update book's average rating
        const allReviews = await Review.find({ bookId: book.bookId });
        const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        book.averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
        book.totalReviews = allReviews.length;
        await book.save();
        
        console.log('[reviewController.js] Updated book ratings:', {
            bookId: book.bookId,
            averageRating: book.averageRating,
            totalReviews: book.totalReviews
        });

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('[reviewController.js] Error deleting review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 