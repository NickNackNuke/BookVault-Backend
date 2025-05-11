console.log('[bookController.js] Starting to load...');

const Book = require('../models/Book'); // Restored
const mongoose = require('mongoose'); // Restored

// Helper function to format book response (Restored)
const formatBookResponse = (book) => {
    if (!book) return null;
    
    const bookObj = book.toObject ? book.toObject() : book;
    
    return {
        _id: bookObj._id,
        bookId: bookObj.bookId,
        title: bookObj.title,
        author: bookObj.author,
        genre: bookObj.genre,
        imageUrl: bookObj.imageUrl,
        user: bookObj.user,
        borrower: bookObj.borrower,
        status: bookObj.status,
        isSelected: bookObj.isSelected,
        createdAt: bookObj.createdAt,
        updatedAt: bookObj.updatedAt
    };
};

// Helper function to find a book by ID (either MongoDB _id or our custom bookId)
// This might be needed by other restored functions later, so keeping it for now.
const findBookById = async (id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
        return await Book.findById(id);
    }
    return await Book.findOne({ bookId: id });
};

// Helper function to find a user by ID (simplified)
const findUserById = async (id) => ({ id: id, message: 'findUserById placeholder' });

// Create a new book (Restored and ensured user population)
exports.createBook = async (req, res) => {
    console.log('[bookController.js] createBook called with body:', req.body);
    try {
        const bookData = {
            ...req.body,
            user: req.user._id // user._id comes from requireAuth middleware
        };
        
        let newBook = await Book.createWithUniqueId(bookData);
        const populatedBook = await Book.findById(newBook._id).populate('user');
        
        console.log('[bookController.js] Book created and user populated:', populatedBook);
        res.status(201).json({ success: true, book: formatBookResponse(populatedBook) });

    } catch (error) {
        console.error('[bookController.js] Error in createBook:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// Get all books for the authenticated user (Restored)
exports.getBooks = async (req, res) => {
    console.log('[bookController.js] getBooks called for user:', req.user._id);
    try {
        // Find all books owned by the currently authenticated user
        const books = await Book.find({ user: req.user._id })
            .populate('user', 'username email') // Optionally populate owner details
            .populate('borrower', 'username email'); // Optionally populate borrower details if any
        
        console.log(`[bookController.js] Found ${books.length} books for user ${req.user._id}`);
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        console.error('[bookController.js] Error in getBooks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAvailableBooks = async (req, res) => {
    console.log('[bookController.js] getAvailableBooks called (placeholder)');
    res.status(501).json({ message: 'getAvailableBooks placeholder' });
};

exports.getBorrowedBooks = async (req, res) => {
    console.log('[bookController.js] getBorrowedBooks called (placeholder)');
    res.status(501).json({ message: 'getBorrowedBooks placeholder' });
};

// Get books lent by the user (Restored)
exports.getLentBooks = async (req, res) => {
    console.log('[bookController.js] getLentBooks called for user:', req.user._id);
    try {
        const books = await Book.find({
            user: req.user._id, // Books owned by the current user
            status: 'lent'    // that are currently lent out
        }).populate('borrower', 'username email'); // Populate borrower with username and email
        
        console.log(`[bookController.js] Found ${books.length} lent books for user ${req.user._id}`);
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        console.error('[bookController.js] Error in getLentBooks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBook = async (req, res) => {
    console.log('[bookController.js] getBook called (placeholder)');
    res.status(501).json({ message: 'getBook placeholder', id: req.params.id });
};

// Update a book (Restored)
exports.updateBook = async (req, res) => {
    console.log(`[bookController.js] updateBook called for book ID: ${req.params.id} by user: ${req.user._id} with body:`, req.body);
    const updates = Object.keys(req.body);
    // Define which fields are allowed to be updated by the user
    const allowedUpdates = ['title', 'author', 'genre', 'imageUrl']; 
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        console.log('[bookController.js] updateBook: Invalid updates attempted:', updates.filter(u => !allowedUpdates.includes(u)));
        return res.status(400).json({ success: false, error: 'Invalid updates requested' });
    }

    try {
        let query = { user: req.user._id }; // Ensure book belongs to the user
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            // If you expect to update by custom bookId via this route, this logic needs adjustment.
            // For now, consistent with delete, assuming _id is used in the route param.
            console.log('[bookController.js] updateBook: Invalid book ID format.');
            return res.status(400).json({ success: false, error: 'Invalid book ID format' });
        }

        const book = await Book.findOne(query);

        if (!book) {
            console.log(`[bookController.js] updateBook: Book not found or not owned by user. Book ID: ${req.params.id}, User: ${req.user._id}`);
            return res.status(404).json({ success: false, error: 'Book not found or you do not own this book' });
        }

        updates.forEach(update => book[update] = req.body[update]);
        await book.save(); // This will also trigger Mongoose pre-save hooks if any
        
        // Populate user and borrower for the response, similar to getBooks
        const populatedBook = await Book.findById(book._id)
                                    .populate('user', 'username email')
                                    .populate('borrower', 'username email');

        console.log('[bookController.js] Book updated successfully:', populatedBook);
        res.json({ success: true, book: formatBookResponse(populatedBook) });
    } catch (error) {
        console.error('[bookController.js] Error in updateBook:', error);
        // Check for Mongoose validation errors (e.g., if a required field is set to empty)
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Server error updating book' });
    }
};

// Delete a book (Restored)
exports.deleteBook = async (req, res) => {
    console.log(`[bookController.js] deleteBook called for book ID: ${req.params.id} by user: ${req.user._id}`);
    try {
        let query = { user: req.user._id }; // Ensure the book belongs to the user
        
        // Handle both ObjectId and bookId for deletion if your findBookById supports it for deletion scenarios
        // For simplicity here, assuming req.params.id is the MongoDB _id
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            // If you expect bookId (e.g., 'BK-XXXXX') in params, you might need to adjust
            // For now, this will only work if req.params.id is a valid MongoDB ObjectId
            // or if findOneAndDelete is adapted to also search by a custom bookId field AND user.
            // To be safe and simple for now, let's assume it's _id.
            return res.status(400).json({ success: false, error: 'Invalid book ID format for deletion via _id' });
        }
        
        const book = await Book.findOneAndDelete(query);

        if (!book) {
            console.log(`[bookController.js] Book not found or not owned by user for deletion. Book ID: ${req.params.id}, User: ${req.user._id}`);
            return res.status(404).json({ success: false, error: 'Book not found or you do not own this book' });
        }
        
        console.log(`[bookController.js] Book deleted successfully. Book ID: ${book._id}`);
        res.json({ success: true, message: 'Book deleted successfully', book: formatBookResponse(book) }); // Return the deleted book
    } catch (error) {
        console.error('[bookController.js] Error in deleteBook:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleBookSelection = async (req, res) => {
    console.log('[bookController.js] toggleBookSelection called (placeholder)');
    res.status(501).json({ message: 'toggleBookSelection placeholder' });
};

// Request to borrow a book (New Function)
exports.requestToBorrowBook = async (req, res) => {
    console.log(`[bookController.js] requestToBorrowBook called for book ID: ${req.params.id} by user: ${req.user._id}`);
    try {
        const book = await findBookById(req.params.id);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        if (book.user.equals(req.user._id)) {
            return res.status(400).json({ success: false, error: 'You cannot request to borrow your own book' });
        }

        if (book.status !== 'available' && book.status !== 'pending_approval') {
            return res.status(400).json({ success: false, error: `Book is not available for request (status: ${book.status})` });
        }

        // Add user to pending requests if not already there
        if (!book.pendingBorrowRequests.includes(req.user._id)) {
            book.pendingBorrowRequests.push(req.user._id);
        }
        
        book.status = 'pending_approval';
        await book.save();

        const populatedBook = await Book.findById(book._id)
            .populate('user', 'username email')
            .populate('pendingBorrowRequests', 'username email');

        console.log('[bookController.js] Borrow request added and book status updated:', populatedBook);
        res.json({ success: true, message: 'Borrow request submitted successfully', book: formatBookResponse(populatedBook) });

    } catch (error) {
        console.error('[bookController.js] Error in requestToBorrowBook:', error);
        res.status(500).json({ success: false, error: 'Server error processing borrow request' });
    }
};

// --- Other functions remain placeholders or are restored --- 
// exports.lendBook = async (req, res) => { // Commented out - replaced by request/approve flow
//     console.log('[bookController.js] lendBook called (placeholder)');
//     res.status(501).json({ message: 'lendBook placeholder' });
// };

exports.borrowBook = async (req, res) => {
    console.log('[bookController.js] borrowBook called (placeholder)');
    res.status(501).json({ message: 'borrowBook placeholder' });
};

exports.returnBook = async (req, res) => {
    console.log('[bookController.js] returnBook called (placeholder)');
    res.status(501).json({ message: 'returnBook placeholder' });
};

exports.getGenres = async (req, res) => {
    console.log('[bookController.js] getGenres called (placeholder)');
    res.status(501).json({ message: 'getGenres placeholder' });
};

exports.getBooksByGenre = async (req, res) => {
    console.log('[bookController.js] getBooksByGenre called (placeholder)');
    res.status(501).json({ message: 'getBooksByGenre placeholder' });
};

console.log('[bookController.js] Finished loading (requestToBorrow added, lendBook commented). Type of exports.getBook:', typeof exports.getBook, 'Type of exports.createBook:', typeof exports.createBook, 'Type of exports.getLentBooks:', typeof exports.getLentBooks, 'Type of exports.getBooks:', typeof exports.getBooks, 'Type of exports.deleteBook:', typeof exports.deleteBook, 'Type of exports.updateBook:', typeof exports.updateBook); 