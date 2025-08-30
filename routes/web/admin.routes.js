const express = require("express");
const router = express.Router();
const parser = require("../../middlewares/upload");
const authMiddleware = require("../../middlewares/authAdminMiddleware.js");

const { adminLogin, adminSignup } = require("../../controllers/AuthController");
const {
  getDashboardTopStatics,
  getDashBoardTrips,
} = require("../../controllers/web/DashboardController");
const {
  // getPackagesTrips,
  // getPlanOwnTrips,
  getPayments,
  getPassengers,
  getEnquiries,
  getPaymentStats,
  getPaymentDetails,
  getRefundData,
  getRevenueAnalytics,
  getFailedPayments,
  getRefundAnalytics,
} = require("../../controllers/web/AdminTripsController");

const {
  createTrip,
  getPackagesTrips,
  getPlanOwnTrips,
  updateTripStatus,
  getTripById,
  updateTrip,
  getCustomizedTrips,
  getEnrolledUsers,
  getTripPassengers,
  searchPassengers,
  // checkState
} = require("../../controllers/TripController");
const { createEvent } = require("../../controllers/EventController");

const {
  getCustomEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  createCustomItinerary,
  getTripDetailsById,
  getCustomItineraryForPayment,
} = require("../../controllers/web/enquiry.controller");
const { protect } = require("../../middleware/authMiddleware");

const {
  getCancellationRequests,
  approveCancellation,
  rejectCancellation,
} = require("../../controllers/payment.controller.js");

// --------------------ADMIN AUTH --------------------
router.post("/signup", parser.single("profileImage"), adminSignup);
router.post("/login", adminLogin);

// --------------------DASHBOARD APIs (Protected) --------------------
router.get("/getDashboardTopStatics", authMiddleware, getDashboardTopStatics);
router.get("/getDashBoardTrips", authMiddleware, getDashBoardTrips);

// --------------------OTHER PAGES APIs (Protected) --------------------

router.get("/getPassengers", authMiddleware, getPassengers);
router.get("/getEnquiries", authMiddleware, getEnquiries);

// --------------------Payment routes  --------------------

router.get("/getPayments", authMiddleware, getPayments);
router.get("/payment-stats", authMiddleware, getPaymentStats);
router.get("/payment-details/:tripId", authMiddleware, getPaymentDetails);
router.get("/refunds", authMiddleware, getRefundData);
router.get("/revenue-analytics", authMiddleware, getRevenueAnalytics);
router.get("/failed-payments", authMiddleware, getFailedPayments);
router.get("/refund-analytics", authMiddleware, getRefundAnalytics);

// --------------------Payment Refund --------------------

router.get("/cancellation-requests", authMiddleware, getCancellationRequests);
router.put(
  "/cancellation-requests/:id/approve",
  authMiddleware,
  approveCancellation
);
router.put(
  "/cancellation-requests/:id/reject",
  authMiddleware,
  rejectCancellation
);

// --------------------Enquiries Routes --------------------
// User gets their custom itinerary
router.get(
  "/payment/custom-itinerary/:enquiryId/:email",
  getCustomItineraryForPayment
);

router.get("/enquiries", authMiddleware, getCustomEnquiries);
// router.get("/enquiries/stats", authMiddleware, getEnquiryStats);
router.get("/enquiries/:id", authMiddleware, getEnquiryById);
router.patch("/enquiries/:id/status", authMiddleware, updateEnquiryStatus);
router.post(
  "/enquiries/:id/create-itinerary",
  authMiddleware,
  createCustomItinerary
);
router.get("/trip-detail/:tripId", authMiddleware, getTripDetailsById);

// Add this route to your enquiryRoutes.js
// router.post(
//   "/enquiries/create-itinerary",
//   authMiddleware,
//   createCustomItinerary
// );

// --------------------CREATE TRIP (Protected) --------------------
router.post(
  "/createTrip",
  authMiddleware,
  parser.fields([{ name: "images", maxCount: 3 }]),
  createTrip
);
// router.post(
//   "/createTrip",
//   authMiddleware,
//   parser.fields([
//     { name: "images", maxCount: 3 },
//     { name: "stateImage", maxCount: 1 } // Add state image field
//   ]),
//   createTrip
// );


// Check if state already exists
// router.get("/check-state/:state", authMiddleware, checkState);


// // Check if state already exists
// router.get("/check-state/:state", authMiddleware, async (req, res) => {
//   try {
//     const state = req.params.state;
//     const existingTrip = await TripItineraryModel.findOne({ 
//       state: state,
//       stateImage: { $exists: true, $ne: "" } 
//     });
    
//     return res.json({ exists: !!existingTrip });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });
router.get("/search-passengers", authMiddleware, searchPassengers);

router.get("/trip-passengers/:tripId", authMiddleware, getTripPassengers);
router.get("/getPackagesTrips", authMiddleware, getPackagesTrips);
router.get("/getPlanOwnTrips", authMiddleware, getCustomizedTrips);

router.patch("/trips/:tripId/status", authMiddleware, updateTripStatus);
router.get("/trips/:id", authMiddleware, getTripById);
// router.get("/trips/:identifier", authMiddleware, getTripById);

router.get("/trips/:tripId/enrollments", getEnrolledUsers);

router.put(
  "/updateTrip/:id",
  authMiddleware,
  parser.any(), // Allow any field including images
  updateTrip
);

// --------------------CREATE EVENT (Protected) --------------------
router.post(
  "/createEvent",
  authMiddleware,
  parser.single("image"),
  createEvent
);

module.exports = router;
