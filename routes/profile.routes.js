const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const {requestCancellation} = require("../controllers/payment.controller")
const { protect } = require("../middleware/authMiddleware"); // your JWT protect middleware

// -------------------- USER PROFILE --------------------
router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);
router.put("/profile/password", protect, userController.changePassword);
router.put("/profile/picture", protect, userController.updateProfilePicture);

// -------------------- BOOKINGS --------------------
router.get("/bookings", protect, userController.getUserBookings);
// router.get("/bookings/:id", protect, userController.getBookingDetails);
router.get("/bookings/:id", userController.getBookingDetails);
// router.put("/bookings/:id/cancel", protect, userController.cancelBooking);

router.get("/bookings/:id/itinerary", protect, userController.downloadItinerary);

// -------------------- TRIPS --------------------
router.get("/trips", userController.getAllTrips);
router.get("/trips/:tripId", userController.getTripDetails);

// -------------------- REFUND --------------------
// router.put('/bookings/:id/request-cancellation', protect, requestCancellation);
router.put('/bookings/:id/request-cancellation', requestCancellation);


module.exports = router;
