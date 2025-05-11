console.log('[bookController.js] Starting to load...');

const Book = require('../models/Book'); // Restored
const mongoose = require('mongoose'); // Restored
const { formatUserResponse } = require('./authController');

// Helper function to format book response (Restored)
const formatBookResponse = (book) => {
    if (!book) return null;
    
    // Ensure we are working with a plain object
    const bookObj = book.toObject ? book.toObject() : { ...book };
    
    let user = null;
    if (bookObj.user) {
        // Assuming formatUserResponse handles .toObject() internally if needed
        user = formatUserResponse(bookObj.user);
    }

    let borrower = null;
    if (bookObj.borrower) {
        borrower = formatUserResponse(bookObj.borrower);
    }

    let pendingBorrowRequestsFormatted = [];
    if (bookObj.pendingBorrowRequests && Array.isArray(bookObj.pendingBorrowRequests)) {
        pendingBorrowRequestsFormatted = bookObj.pendingBorrowRequests.map(userObj => 
            formatUserResponse(userObj)
        );
    }

    return {
        _id: bookObj._id ? bookObj._id.toString() : undefined, // Changed from 'id' to '_id'
        bookId: bookObj.bookId,
        title: bookObj.title,
        author: bookObj.author,
        genre: bookObj.genre,
        imageUrl: bookObj.imageUrl,
        user: user, // Populated and formatted user object
        borrower: borrower, // Populated and formatted user object
        status: bookObj.status,
        // isSelected: bookObj.isSelected, // Keep commented if not consistently used/needed by Android
        pendingBorrowRequests: pendingBorrowRequestsFormatted,
        
        // Standardized Dates as ISO strings or null
        borrowDate: bookObj.borrowDate instanceof Date ? bookObj.borrowDate.toISOString() : null,
        returnDate: bookObj.returnDate instanceof Date ? bookObj.returnDate.toISOString() : null,
        createdAt: bookObj.createdAt instanceof Date ? bookObj.createdAt.toISOString() : null,
        updatedAt: bookObj.updatedAt instanceof Date ? bookObj.updatedAt.toISOString() : null,
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

// Get all books for the authenticated user (Restored & Enhanced for pending requests)
exports.getBooks = async (req, res) => {
    console.log('[bookController.js] getBooks called for user:', req.user._id);
    try {
        const books = await Book.find({ user: req.user._id })
            // Populate owner details for all owned books
            .populate('user', 'username email _id userId') 
            // Populate borrower details if the book is lent
            .populate({
                path: 'borrower',
                select: 'username email _id userId'
            })
            // Populate pendingBorrowRequests with specified user details
            .populate({
                path: 'pendingBorrowRequests',
                select: 'username email _id userId' // Ensure all necessary fields are selected
            });
        
        console.log(`[bookController.js] Found ${books.length} books for user ${req.user._id}. Pending requests will be populated if present.`);
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        console.error('[bookController.js] Error in getBooks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all available books (not owned by the user and not lent) (Restored)
exports.getAvailableBooks = async (req, res) => {
    console.log(`[bookController.js] getAvailableBooks called by user: ${req.user._id}`);
    try {
        const books = await Book.find({
            user: { $ne: req.user._id }, // Not owned by the current user
            status: 'available'          // And status is 'available'
        }).populate('user', 'username email'); // Populate the owner's details
        
        console.log(`[bookController.js] Found ${books.length} available books for user ${req.user._id} to borrow.`);
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        console.error('[bookController.js] Error in getAvailableBooks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get books borrowed by the current user (New Implementation for existing placeholder)
exports.getBorrowedBooksByCurrentUser = async (req, res) => {
    console.log('[bookController.js] getBorrowedBooksByCurrentUser called');
    try {
        const userId = req.user._id;
        // Find books where the borrower field matches the current user's ID
        const books = await Book.find({ borrower: userId })
                                .populate('user') // Populate the owner's details
                                .populate('borrower') // Populate the borrower's details (current user)
                                .populate('pendingBorrowRequests'); // Although likely not relevant for this view
        console.log(`[bookController.js] Found ${books.length} books borrowed by user ${userId}`);
        res.status(200).json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        console.error(`[bookController.js] Error fetching borrowed books for user ${req.user._id}:`, error);
        res.status(500).json({ message: 'Error fetching borrowed books', error: error.message });
    }
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
    const allowedUpdates = ['title', 'author', 'genre', 'imageUrl']; 
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        console.log('[bookController.js] updateBook: Invalid updates attempted:', updates.filter(u => !allowedUpdates.includes(u)));
        return res.status(400).json({ success: false, error: 'Invalid updates requested' });
    }

    try {
        const idParam = req.params.id;
        // Explicitly create the user ObjectId for the query
        const userObjectId = new mongoose.Types.ObjectId(req.user._id);
        let query = { user: userObjectId };

        if (mongoose.Types.ObjectId.isValid(idParam)) {
            console.log(`[bookController.js] updateBook: Querying by MongoDB _id: ${idParam}`);
            query._id = idParam;
        } else {
            console.log(`[bookController.js] updateBook: Querying by custom bookId: ${idParam}`);
            query.bookId = idParam; // Use custom bookId for query
        }

        const book = await Book.findOne(query);

        if (!book) {
            console.log(`[bookController.js] updateBook: Book not found or not owned by user. Query: ${JSON.stringify(query)}`);
            return res.status(404).json({ success: false, error: 'Book not found or you do not own this book' });
        }

        updates.forEach(update => book[update] = req.body[update]);
        await book.save();
        
        const populatedBook = await Book.findById(book._id)
                                    .populate('user', 'username email _id userId')
                                    .populate('borrower', 'username email _id userId')
                                    .populate('pendingBorrowRequests', 'username email _id userId');

        console.log('[bookController.js] Book updated successfully:', formatBookResponse(populatedBook));
        res.json({ success: true, book: formatBookResponse(populatedBook) });
    } catch (error) {
        console.error('[bookController.js] Error in updateBook:', error);
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
        const bookIdParam = req.params.id;
        // Explicitly create the user ObjectId for the query
        const userObjectId = new mongoose.Types.ObjectId(req.user._id);
        let query = { user: userObjectId }; 

        if (mongoose.Types.ObjectId.isValid(bookIdParam)) {
            console.log(`[bookController.js] Attempting to delete by MongoDB _id: ${bookIdParam}`);
            query._id = bookIdParam;
        } else {
            console.log(`[bookController.js] Attempting to delete by custom bookId: ${bookIdParam}`);
            query.bookId = bookIdParam; 
        }
        
        console.log(`[bookController.js] Executing Book.findOneAndDelete with query: ${JSON.stringify(query)}`);
        const book = await Book.findOneAndDelete(query);

        if (!book) {
            console.log(`[bookController.js] Book not found or not owned by user for deletion. Query used: ${JSON.stringify(query)}`);
            return res.status(404).json({ success: false, error: 'Book not found or you do not own this book' });
        }
        
        console.log(`[bookController.js] Book deleted successfully. Book ID: ${book._id}, Custom BookId: ${book.bookId}`);
        res.json({ success: true, message: 'Book deleted successfully', book: formatBookResponse(book) });
    } catch (error) {
        console.error('[bookController.js] Error in deleteBook:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleBookSelection = async (req, res) => {
    console.log('[bookController.js] toggleBookSelection called (placeholder)');
    res.status(501).json({ message: 'toggleBookSelection placeholder' });
};

// Request to borrow a book (Restored from previous step, assuming it was meant to be kept)
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

// Borrow a book (Restored - direct borrow action)
exports.borrowBook = async (req, res) => {
    console.log(`[bookController.js] borrowBook (direct) called for book ID: ${req.params.id} by user: ${req.user._id}`);
    try {
        const book = await findBookById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        
        if (book.user.equals(req.user._id)) {
            return res.status(400).json({ success: false, error: 'You cannot borrow your own book' });
        }
        
        if (book.status !== 'available') {
            // If a direct borrow is attempted on a book that's already lent or pending, it should fail.
            return res.status(400).json({ success: false, error: `Book is not available for direct borrowing (status: ${book.status})` });
        }
        
        book.borrower = req.user._id;
        book.status = 'lent';
        // If there was a pending request from this user, it might be good to clear it, but direct borrow bypasses request list.
        // book.pendingBorrowRequests.pull(req.user._id); // Optional: remove from pending if they direct borrow
        await book.save();
        
        const populatedBook = await Book.findById(book._id)
            .populate('user', 'username email')
            .populate('borrower', 'username email');

        console.log('[bookController.js] Book directly borrowed successfully:', populatedBook);
        res.json({ success: true, message: 'Book borrowed successfully', book: formatBookResponse(populatedBook) });
    } catch (error) {
        console.error('[bookController.js] Error in direct borrowBook:', error);
        res.status(500).json({ success: false, error: 'Server error borrowing book' });
    }
};

// Get books owned by the user that have pending borrow requests (New Function)
exports.getBooksWithPendingRequests = async (req, res) => {
    console.log(`[bookController.js] getBooksWithPendingRequests called for owner: ${req.user._id}`);
    try {
        const books = await Book.find({
            user: req.user._id, // Books owned by the current user
            status: 'pending_approval',
            pendingBorrowRequests: { $exists: true, $not: { $size: 0 } } // Ensure there are pending requests
        })
        .populate('user', 'username email') // Owner details
        .populate('pendingBorrowRequests', 'username email _id userId'); // Populate details of users who made requests
        
        console.log(`[bookController.js] Found ${books.length} books with pending requests for owner ${req.user._id}`);
        res.json({ success: true, books: books.map(formatBookResponse) });
    } catch (error) {
        console.error('[bookController.js] Error in getBooksWithPendingRequests:', error);
        res.status(500).json({ success: false, error: 'Server error fetching books with pending requests' });
    }
};

// Approve a borrow request (New Function)
exports.approveBorrowRequest = async (req, res) => {
    const { bookId, requestingUserId } = req.params;
    console.log(`[bookController.js] approveBorrowRequest called for book ID: ${bookId}, by owner: ${req.user._id}, for requesting user: ${requestingUserId}`);

    try {
        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        // Ensure the authenticated user is the owner of the book
        if (!book.user.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: 'You are not authorized to approve requests for this book' });
        }

        // Ensure the book is actually pending approval and the requester is in the pending list
        if (book.status !== 'pending_approval' || !book.pendingBorrowRequests.map(id => id.toString()).includes(requestingUserId)) {
            return res.status(400).json({ success: false, error: 'Book is not pending approval by this user or request not found' });
        }

        book.borrower = requestingUserId;
        book.status = 'lent';
        book.pendingBorrowRequests = []; // Clear all pending requests as the book is now lent
        
        await book.save();
        
        const populatedBook = await Book.findById(book._id)
            .populate('user', 'username email')
            .populate('borrower', 'username email'); // Populate new borrower details

        console.log('[bookController.js] Borrow request approved:', populatedBook);
        res.json({ success: true, message: 'Borrow request approved successfully', book: formatBookResponse(populatedBook) });

    } catch (error) {
        console.error('[bookController.js] Error in approveBorrowRequest:', error);
        res.status(500).json({ success: false, error: 'Server error approving borrow request' });
    }
};

// Reject a borrow request (New Function)
exports.rejectBorrowRequest = async (req, res) => {
    const { bookId, requestingUserId } = req.params;
    console.log(`[bookController.js] rejectBorrowRequest called for book ID: ${bookId}, by owner: ${req.user._id}, for requesting user: ${requestingUserId}`);

    try {
        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        if (!book.user.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: 'You are not authorized to reject requests for this book' });
        }

        if (book.status !== 'pending_approval') {
            return res.status(400).json({ success: false, error: 'Book is not pending approval' });
        }

        const initialRequestCount = book.pendingBorrowRequests.length;
        book.pendingBorrowRequests = book.pendingBorrowRequests.filter(id => id.toString() !== requestingUserId);

        if (book.pendingBorrowRequests.length === initialRequestCount) {
            // The requestingUserId was not found in the pending requests list
            return res.status(404).json({ success: false, error: 'Request from this user not found in pending list' });
        }

        if (book.pendingBorrowRequests.length === 0) {
            book.status = 'available'; // No more pending requests, set back to available
        }
        
        await book.save();
        
        const populatedBook = await Book.findById(book._id)
            .populate('user', 'username email')
            .populate('pendingBorrowRequests', 'username email');

        console.log('[bookController.js] Borrow request rejected:', populatedBook);
        res.json({ success: true, message: 'Borrow request rejected successfully', book: formatBookResponse(populatedBook) });

    } catch (error) {
        console.error('[bookController.js] Error in rejectBorrowRequest:', error);
        res.status(500).json({ success: false, error: 'Server error rejecting borrow request' });
    }
};

// Controller Function: Return a book by the borrower
exports.returnBookByBorrower = async (req, res) => {
    const { bookId } = req.params;
    console.log(`[bookController.js] returnBookByBorrower called for book ID: ${bookId} by borrower: ${req.user._id}`);
    try {
        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        // Verify the current user is the borrower and the book is actually lent to them
        if (!book.borrower || !book.borrower.equals(req.user._id) || book.status !== 'lent') {
            return res.status(403).json({ success: false, error: 'You are not the current borrower of this book or book is not lent' });
        }

        book.borrower = null;
        book.status = 'available';
        // Optional: Clear pending requests if any existed, though unlikely for a lent book.
        // book.pendingBorrowRequests = []; 
        
        await book.save();
        
        const populatedBook = await Book.findById(book._id)
            .populate('user', 'username email'); // Populate owner

        console.log('[bookController.js] Book returned successfully by borrower:', populatedBook);
        res.json({ success: true, message: 'Book returned successfully', book: formatBookResponse(populatedBook) });

    } catch (error) {
        console.error('[bookController.js] Error in returnBookByBorrower:', error);
        res.status(500).json({ success: false, error: 'Server error returning book' });
    }
};

// --- Other functions remain placeholders or are restored --- 
// exports.lendBook = async (req, res) => { // Commented out - replaced by request/approve flow
//     console.log('[bookController.js] lendBook called (placeholder)');
//     res.status(501).json({ message: 'lendBook placeholder' });
// };

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

exports.updateBookDetails = async (req, res) => {
    console.log('[bookController.js] updateBookDetails called');
    try {
        const bookId = req.params.id;
        const { title, author, genre } = req.body;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            return res.status(400).json({ message: 'Invalid book ID format' });
        }

        const book = await Book.findById(bookId);

        if (!book) {
            console.log(`[bookController.js] Book not found for ID: ${bookId}`);
            return res.status(404).json({ message: 'Book not found' });
        }

        // Ensure book.user is not null before calling toString()
        if (!book.user) {
            console.error(`[bookController.js] Book ${bookId} has no owner.`);
            return res.status(500).json({ message: 'Book has no owner, cannot update.' });
        }
        
        if (book.user.toString() !== userId) {
            console.log(`[bookController.js] User ${userId} not authorized to update book ${bookId} owned by ${book.user.toString()}`);
            return res.status(403).json({ message: 'User not authorized to update this book' });
        }

        if (title) book.title = title;
        if (author) book.author = author;
        if (genre) book.genre = genre;

        const updatedBook = await book.save();
        // Populate necessary fields for the response
        const populatedBook = await Book.findById(updatedBook._id)
                                      .populate('user')
                                      .populate('borrower')
                                      .populate('pendingBorrowRequests');
                                      
        console.log(`[bookController.js] Book ${bookId} updated successfully by user ${userId}`);
        res.status(200).json(formatBookResponse(populatedBook));
    } catch (error) {
        console.error(`[bookController.js] Error updating book details for book ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error updating book details', error: error.message });
    }
};

console.log('[bookController.js] Finished loading (getBorrowedBooksByCurrentUser, returnBookByBorrower added). Type of exports.getBook:', typeof exports.getBook, 'Type of exports.createBook:', typeof exports.createBook, 'Type of exports.getLentBooks:', typeof exports.getLentBooks, 'Type of exports.getBooks:', typeof exports.getBooks, 'Type of exports.deleteBook:', typeof exports.deleteBook, 'Type of exports.updateBook:', typeof exports.updateBook, 'Type of exports.getAvailableBooks:', typeof exports.getAvailableBooks, 'Type of exports.borrowBook:', typeof exports.borrowBook, 'Type of exports.getBooksWithPendingRequests:', typeof exports.getBooksWithPendingRequests, 'Type of exports.approveBorrowRequest:', typeof exports.approveBorrowRequest); 