const express = require('express')
const router = express.Router()
const parser = require('../../middlewares/upload');

const { adminLogin, adminSignup } = require('../../controllers/AuthController')
const { getDashboardTopStatics, getDashBoardTrips, } = require('../../controllers/web/DashboardController');
const { getPackagesTrips, getPlanOwnTrips, getPayments, getPassengers, getEnquiries } = require('../../controllers/web/AdminTripsController');
const { createTrip } = require('../../controllers/TripController')
const { createEvent } = require('../../controllers/EventController')

// --------------------ADMIN AUTH --------------------
router.post('/signup', parser.single('profileImage'), adminSignup);
router.post('/login', adminLogin);


// --------------------DASHBOARD APIs --------------------
router.get('/getDashboardTopStatics', getDashboardTopStatics);
router.get('/getDashBoardTrips', getDashBoardTrips);


// --------------------OTHER PAGES APIs --------------------
router.get('/getPackagesTrips', getPackagesTrips);
router.get('/getPlanOwnTrips', getPlanOwnTrips);
router.get('/getPayments', getPayments);
router.get('/getPassengers', getPassengers);
router.get('/getEnquiries', getEnquiries);


// --------------------CREATE EVENT --------------------
router.post('/createEvent', parser.single("image"), createEvent);


// --------------------CREATE TRIP --------------------
router.post('/createTrip', parser.fields([
    { name: 'images', maxCount: 5 }
]), createTrip);


module.exports = router;