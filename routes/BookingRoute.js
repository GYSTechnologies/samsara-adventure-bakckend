const express = require('express')
const router = express.Router()

const { createBooking, getMyPlans, deleteByEmailAndTripId, getMyTrips, getPastTrips, getMyTripDetails, getTripHistoryDetails, getUserTripStatics,getApprovedBookingIds } = require('../controllers/BookingController')

router.post('/createBooking', createBooking);
router.get('/getMyPlans', getMyPlans);
router.get('/getMyTrips', getMyTrips);
router.delete('/deleteByEmailAndTripId', deleteByEmailAndTripId);
router.get('/getPastTrips', getPastTrips);
router.get('/getMyTripDetails', getMyTripDetails);
router.get('/getTripHistoryDetails', getTripHistoryDetails);
router.get('/getUserTripStatics', getUserTripStatics);
router.get('/getApprovedBookingIds',getApprovedBookingIds);
module.exports = router;