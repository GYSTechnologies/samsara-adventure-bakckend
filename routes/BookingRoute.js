const express = require('express')
const router = express.Router()

const { createBooking, getMyPlans, deleteByEmailAndTripId, getMyPlans2 } = require('../controllers/BookingController')

router.post('/createBooking', createBooking);
router.get('/getMyPlans', getMyPlans);
router.get('/getMyPlans2', getMyPlans2);
router.delete('/deleteByEmailAndTripId', deleteByEmailAndTripId);

module.exports = router;