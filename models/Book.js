const mongoose = require('mongoose');

// Create a function to generate a simple book ID
function generateBookId() {
    // Generate a random 6-character alphanumeric string using only simpler characters
    // Using only uppercase letters and numbers, excluding similar-looking characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'BK-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const bookSchema = new mongoose.Schema({
    // Reordering fields to show bookId above title
    bookId: {
        type: String,
        default: generateBookId,
        unique: true,
        index: true,
        required: true
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
        trim: true
    },
    user: { // Owner
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    borrower: { // Current borrower (can be null, the owner, or another user)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['available', 'lent'],
        default: 'available'
    },
    isSelected: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Create index for faster lookups
bookSchema.index({ bookId: 1 });

// Pre-save hook to check for duplicate bookIds and retry if needed
bookSchema.pre('save', async function(next) {
    const book = this;
    
    // Only check for duplicates if this is a new book or if bookId was modified
    if (book.isNew || book.isModified('bookId')) {
        let attempts = 0;
        const maxAttempts = 5; // Maximum number of attempts to generate a unique ID
        
        // Check if bookId exists and retry with a new one if it does
        const checkAndGenerateUniqueId = async () => {
            attempts++;
            
            const existingBook = await Book.findOne({ bookId: book.bookId });
            
            // If bookId already exists and we haven't exceeded max attempts, try again
            if (existingBook && attempts < maxAttempts) {
                book.bookId = generateBookId();
                return await checkAndGenerateUniqueId();
            }
            
            // If we've exceeded max attempts, throw an error
            if (existingBook && attempts >= maxAttempts) {
                throw new Error(`Failed to generate unique bookId after ${maxAttempts} attempts`);
            }
            
            // If no duplicate was found, we're good to go
            return;
        };
        
        try {
            await checkAndGenerateUniqueId();
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Static method to create a book with guaranteed unique bookId
bookSchema.statics.createWithUniqueId = async function(bookData) {
    let isUnique = false;
    let newBook;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
        attempts++;
        try {
            // Generate a new bookId if not provided
            if (!bookData.bookId) {
                bookData.bookId = generateBookId();
            }
            
            newBook = new Book(bookData);
            await newBook.save();
            
            // If save succeeds, the ID is unique
            isUnique = true;
        } catch (error) {
            // If error is a duplicate key error for bookId, try again with a new ID
            if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern && error.keyPattern.bookId) {
                bookData.bookId = generateBookId();
                console.log(`Duplicate bookId detected, retrying with new ID: ${bookData.bookId}`);
            } else {
                // For other errors, re-throw
                throw error;
            }
        }
    }
    
    if (!isUnique) {
        throw new Error(`Failed to create book with unique ID after ${maxAttempts} attempts`);
    }
    
    return newBook;
};

// Add a validation method to check ID uniqueness
bookSchema.methods.checkIdUniqueness = async function() {
    const existingBook = await Book.findOne({ 
        bookId: this.bookId,
        _id: { $ne: this._id } // Exclude this document from the search
    });
    
    return !existingBook;
};

const Book = mongoose.model('Book', bookSchema);

module.exports = Book; 