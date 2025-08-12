const express = require('express')
const router = express.Router()

const { createBooking, getMyPlans, deleteByEmailAndTripId, getMyTrips, getPastTrips } = require('../controllers/BookingController')

router.post('/createBooking', createBooking);
router.get('/getMyPlans', getMyPlans);
router.get('/getMyTrips', getMyTrips);
router.delete('/deleteByEmailAndTripId', deleteByEmailAndTripId);
router.get('/getPastTrips', getPastTrips);
module.exports = router;