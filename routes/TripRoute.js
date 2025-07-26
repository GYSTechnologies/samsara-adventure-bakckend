const express = require('express')
const router = express.Router();

const { createTrip } = require('../controllers/TripController')
router.post('/createTrip', createTrip);
module.exports = router;