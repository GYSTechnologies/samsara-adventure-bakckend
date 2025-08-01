const express = require('express')
const router = express.Router()

const { createBooking } = require('../controllers/BookingController')

router.post('/createBooking', createBooking);

module.exports = router;