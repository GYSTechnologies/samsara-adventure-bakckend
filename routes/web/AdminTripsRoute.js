const express = require('express')
const router = express.Router()

const { getPackagesTrips, getPlanOwnTrips, getPayments, getPassengers, getEnquiries } = require('../../controllers/web/AdminTripsController');

router.get('/getPackagesTrips', getPackagesTrips);
router.get('/getPlanOwnTrips', getPlanOwnTrips);
router.get('/getPayments', getPayments);
router.get('/getPassengers', getPassengers);
router.get('/getEnquiries', getEnquiries);

module.exports = router;