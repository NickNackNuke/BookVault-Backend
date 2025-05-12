const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication
router.use(requireAuth);

// Book routes
router.get('/', bookController.getBooks);
router.post('/', bookController.createBook);
router.get('/available', bookController.getAvailableBooks);
router.get('/borrowed', bookController.getBorrowedBooksByCurrentUser);
router.get('/lent', bookController.getLentBooks);

// Review routes - Support both MongoDB _id and custom bookId
router.post('/:id/reviews', reviewController.createReview);  // Changed from review to reviews for consistency
router.get('/:id/reviews', reviewController.getBookReviews);
router.put('/:id/reviews/:reviewId', reviewController.updateReview);
router.delete('/:id/reviews/:reviewId', reviewController.deleteReview);

// Other book routes
router.get('/:id', bookController.getBook);
router.patch('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);
router.post('/:id/borrow', bookController.borrowBook);
router.post('/:id/return', bookController.returnBook);

// TEST ENDPOINT: Always returns a test borrowed book for debugging
router.get('/test-borrowed', (req, res) => {
  const testBook = {
    _id: "test123456789",
    bookId: "BK-TEST123",
    title: "Test Borrowed Book",
    author: "Test Author",
    genre: "Fiction",
    imageUrl: "",
    status: "borrowed", // Try with "borrowed" instead of "lent"
    user: {
      id: "owner123",
      userId: "USR-TEST123",
      username: "testowner",
      email: "owner@test.com"
    }
  };
  
  console.log("Returning test borrowed book:", testBook);
  
  return res.status(200).json({
    success: true,
    books: [testBook]
  });
});

// Get all unique genres
router.get('/genres', bookController.getGenres);

// Get books by genre
router.get('/genre/:genre', bookController.getBooksByGenre);

// Search books with filters
// router.get('/search', bookController.searchBooks); // Commented out due to missing controller function

// Toggle book selection
router.patch('/:id/toggle', bookController.toggleBookSelection);

// Lend a book to another user - Replaced by request/approve flow
// router.post('/:id/lend', bookController.lendBook);

// Request to borrow a book (New Route)
router.post('/:id/request-borrow', bookController.requestToBorrowBook);

// Get books owned by the current user that have pending approval (New Route)
router.get('/owned/pending-approval', bookController.getBooksWithPendingRequests);

// Approve a borrow request (New Route)
router.post('/:bookId/approve/:requestingUserId', bookController.approveBorrowRequest);

// Reject a borrow request (New Route)
router.post('/:bookId/reject/:requestingUserId', bookController.rejectBorrowRequest);

// Route for a book owner to update book details (title, author, genre)
router.put('/:id/details', bookController.updateBookDetails);

module.exports = router; 