const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth } = require('../middleware/auth');

// All book routes require authentication
router.use(requireAuth);

// Create a new book
router.post('/', bookController.createBook);

// Get all books for the authenticated user
router.get('/', bookController.getBooks);

// Get all available books to borrow
router.get('/available', bookController.getAvailableBooks);

// Get all books borrowed by the authenticated user
router.get('/borrowed', bookController.getBorrowedBooks);

// Get all books lent by the authenticated user
router.get('/lent', bookController.getLentBooks);

// Get all unique genres
router.get('/genres', bookController.getGenres);

// Get books by genre
router.get('/genre/:genre', bookController.getBooksByGenre);

// Search books with filters
// router.get('/search', bookController.searchBooks); // Commented out due to missing controller function

// Get a single book
router.get('/:id', bookController.getBook);

// Update a book
router.patch('/:id', bookController.updateBook);

// Delete a book
router.delete('/:id', bookController.deleteBook);

// Toggle book selection
router.patch('/:id/toggle', bookController.toggleBookSelection);

// Lend a book to another user - Replaced by request/approve flow
// router.post('/:id/lend', bookController.lendBook);

// Request to borrow a book (New Route)
router.post('/:id/request-borrow', bookController.requestToBorrowBook);

// Borrow a book
router.post('/:id/borrow', bookController.borrowBook);

// Return a book
router.post('/:id/return', bookController.returnBook);

module.exports = router; 