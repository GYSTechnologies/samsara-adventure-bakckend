const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const authMiddleware = require('../middlewares/authAdminMiddleware');
const { protect } = require('../middleware/authMiddleware');
const parser = require('../middlewares/upload');
const dynamicUpload = require('../middlewares/dynamicUpload');

router.get('/short', eventController.getCartEvent);

// Public routes

router.get('/short', eventController.getCartEvent);

router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEvent);

// User routes (protected)
router.post('/create-order', protect, eventController.createEventBookingOrder);
router.post('/verify-payment', protect, eventController.verifyPayment);

router.post('/request-cancellation', protect, eventController.requestCancellation);
router.get('/user/bookings', protect, eventController.getUserBookings);

// Admin routes with dynamic image upload handling
router.post('/', authMiddleware, dynamicUpload, eventController.createEvent);
router.put('/:id', authMiddleware, dynamicUpload, eventController.updateEvent);



router.delete('/:id', authMiddleware, eventController.deleteEvent);
router.get('/admin/events', authMiddleware, eventController.getAdminEvents);
router.get('/admin/bookings', authMiddleware, eventController.getAllBookings);
router.post('/admin/approve-cancellation', authMiddleware, eventController.approveCancellation);

// New Apis
router.get('/user/getBookedEventById',eventController.getBookedEventById);

module.exports = router;