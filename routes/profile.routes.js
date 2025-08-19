// const express = require("express");
// const router = express.Router();
// const parser = require('../middlewares/upload');

// const { protect } = require("../middleware/authMiddleware");

// const {
//   getProfile,
//   updateProfile,
//   changePassword,
//   getUserBookings,
//   cancelBooking,
//   getTripDetails,
//   toggleFavorite,
// } = require("../controllers/user.controller");

// // User Profile
// router.get("/profile", protect, getProfile);
// router.put("/profile", protect,parser.single('profileUrl'), updateProfile);
// router.put("/change-password", protect, changePassword);

// // Bookings
// router.get("/bookings", protect, getUserBookings);
// router.put("/bookings/cancel/:id", protect, cancelBooking);

// // Trip Details & Favorites
// router.get("/trip/:tripId", protect, getTripDetails);
// router.post("/trip/:tripId/favorite", protect, toggleFavorite);

// module.exports = router;



const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/authMiddleware"); // your JWT protect middleware

// -------------------- USER PROFILE --------------------
router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);
router.put("/profile/password", protect, userController.changePassword);
router.put("/profile/picture", protect, userController.updateProfilePicture);

// -------------------- BOOKINGS --------------------
router.get("/bookings", protect, userController.getUserBookings);
router.get("/bookings/:id", protect, userController.getBookingDetails);
router.put("/bookings/:id/cancel", protect, userController.cancelBooking);
router.get("/bookings/:id/itinerary", protect, userController.downloadItinerary);

// -------------------- TRIPS --------------------
router.get("/trips", userController.getAllTrips);
router.get("/trips/:tripId", userController.getTripDetails);

module.exports = router;
