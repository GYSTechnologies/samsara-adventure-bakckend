const express = require('express')
const router = express.Router()

const { createBooking,getMyPlans } = require('../controllers/BookingController')

router.post('/createBooking', createBooking);
router.get('/getMyPlans', getMyPlans);

module.exports = router;