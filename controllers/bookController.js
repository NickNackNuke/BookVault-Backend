const Book = require('../models/Book');
const mongoose = require('mongoose');

// Helper function to format book response with desired field order
const formatBookResponse = (book) => {
    if (!book) return null;
    
    const bookObj = book.toObject ? book.toObject() : book;
    
    // Create a new object with the fields in the desired order
    return {
        _id: bookObj._id,
        bookId: bookObj.bookId,
        title: bookObj.title,
        author: bookObj.author,
        genre: bookObj.genre,
        user: bookObj.user,
        borrower: bookObj.borrower,
        status: bookObj.status,
        isSelected: bookObj.isSelected,
        createdAt: bookObj.createdAt,
        updatedAt: bookObj.updatedAt
    };
};

// Helper function to find a book by ID (either MongoDB _id or our custom bookId)
const findBookById = async (id) => {
    // Check if id is a valid MongoDB ObjectId format
    if (mongoose.Types.ObjectId.isValid(id)) {
        return await Book.findById(id);
    }
    // Otherwise, look up by bookId
    return await Book.findOne({ bookId: id });
};

// Helper function to find a user by ID (either MongoDB _id or our custom userId)
const findUserById = async (id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
        return await mongoose.model('User').findById(id);
    }
    // Otherwise, look up by userId
    return await mongoose.model('User').findOne({ userId: id });
};

// Create a new book
exports.createBook = async (req, res) => {
    try {
        // Use the static method that guarantees a unique bookId
        const bookData = {
            ...req.body,
            user: req.user._id
        };
        
        const book = await Book.createWithUniqueId(bookData);
        res.status(201).json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        console.error('Error creating book:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// Get all books for a user
exports.getBooks = async (req, res) => {
    try {
        const books = await Book.find({ user: req.user._id });
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all available books (not owned by the user and not lent)
exports.getAvailableBooks = async (req, res) => {
    try {
        const books = await Book.find({
            user: { $ne: req.user._id },
            status: 'available'
        }).populate('user', 'username');
        
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get books borrowed by the user
exports.getBorrowedBooks = async (req, res) => {
    try {
        const books = await Book.find({
            borrower: req.user._id
        }).populate('user', 'username');
        
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get books lent by the user
exports.getLentBooks = async (req, res) => {
    try {
        const books = await Book.find({
            user: req.user._id,
            status: 'lent'
        }).populate('borrower', 'username');
        
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get a single book
exports.getBook = async (req, res) => {
    try {
        const book = await findBookById(req.params.id)
            .populate('user', 'username')
            .populate('borrower', 'username');
            
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update a book
exports.updateBook = async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'author', 'genre', 'isSelected'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ success: false, error: 'Invalid updates' });
    }

    try {
        let query = { user: req.user._id };
        
        // Handle both ObjectId and bookId searches
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            query.bookId = req.params.id;
        }
        
        const book = await Book.findOne(query);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        updates.forEach(update => book[update] = req.body[update]);
        await book.save();
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Delete a book
exports.deleteBook = async (req, res) => {
    try {
        let query = { user: req.user._id };
        
        // Handle both ObjectId and bookId searches
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            query.bookId = req.params.id;
        }
        
        const book = await Book.findOneAndDelete(query);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Toggle book selection
exports.toggleBookSelection = async (req, res) => {
    try {
        let query = { user: req.user._id };
        
        // Handle both ObjectId and bookId searches
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            query.bookId = req.params.id;
        }
        
        const book = await Book.findOne(query);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        book.isSelected = !book.isSelected;
        await book.save();
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Lend a book to another user
exports.lendBook = async (req, res) => {
    const { borrowerId } = req.body;
    
    if (!borrowerId) {
        return res.status(400).json({ success: false, error: 'Borrower ID is required' });
    }
    
    try {
        let query = { user: req.user._id };
        
        // Handle both ObjectId and bookId searches
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            query.bookId = req.params.id;
        }
        
        const book = await Book.findOne(query);
        
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        
        if (book.status === 'lent') {
            return res.status(400).json({ success: false, error: 'Book is already lent' });
        }
        
        // Find the borrower using either ObjectId or userId
        const borrower = await findUserById(borrowerId);
        
        if (!borrower) {
            return res.status(404).json({ success: false, error: 'Borrower not found' });
        }
        
        book.borrower = borrower._id;
        book.status = 'lent';
        await book.save();
        
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Borrow a book
exports.borrowBook = async (req, res) => {
    try {
        const book = await findBookById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        
        if (book.user.equals(req.user._id)) {
            return res.status(400).json({ success: false, error: 'You cannot borrow your own book' });
        }
        
        if (book.status === 'lent') {
            return res.status(400).json({ success: false, error: 'Book is already lent' });
        }
        
        book.borrower = req.user._id;
        book.status = 'lent';
        await book.save();
        
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Return a book
exports.returnBook = async (req, res) => {
    try {
        const book = await findBookById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        
        if (!book.borrower || !book.borrower.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: 'You are not the borrower of this book' });
        }
        
        book.borrower = null;
        book.status = 'available';
        await book.save();
        
        res.json({ success: true, book: formatBookResponse(book) });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}; 