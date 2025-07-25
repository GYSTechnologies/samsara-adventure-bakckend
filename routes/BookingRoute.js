const express = require('express')
const router = express.Router()

const { createPackageBooking,createPlanOwnTripBooking } = require('../controllers/BookingController')

router.post('/createPackageBooking', createPackageBooking);
router.post('/createPlanOwnTripBooking',createPlanOwnTripBooking)

module.exports = router;