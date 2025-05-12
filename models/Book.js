const mongoose = require('mongoose');

// Define common book genres
const commonGenres = [
    'Fiction', 
    'Non-Fiction', 
    'Mystery', 
    'Thriller', 
    'Romance', 
    'Science Fiction', 
    'Fantasy', 
    'Horror', 
    'Biography', 
    'History', 
    'Self-Help', 
    'Business', 
    'Children', 
    'Young Adult', 
    'Poetry', 
    'Comics', 
    'Art', 
    'Cooking', 
    'Travel', 
    'Religion', 
    'Science', 
    'Technology'
];

const bookSchema = new mongoose.Schema({
    bookId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    genre: {
        type: String,
        required: true,
        trim: true,
        // Not using enum validation to allow for custom genres,
        // but providing common genres in the schema for reference
        // and to support frontend dropdown lists
    },
    imageUrl: {
        type: String,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    borrower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['available', 'borrowed', 'lent', 'pending_approval'],
        default: 'available'
    },
    isSelected: {
        type: Boolean,
        default: false
    },
    pendingBorrowRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Static method to create a book with unique bookId
bookSchema.statics.createWithUniqueId = async function(bookData) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let bookId;
    let exists;

    do {
        bookId = 'BK-' + Array.from({length: 6}, () =>
            chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        exists = await this.findOne({ bookId });
    } while (exists);

    return this.create({ ...bookData, bookId });
};

// Static method to get common genres
bookSchema.statics.getCommonGenres = function() {
    return commonGenres;
};

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;