const express = require('express')
const router = express.Router();
const parser = require('../middlewares/upload');

const { createTrip,getAllTrips,getTripsByFilter } = require('../controllers/TripController')
router.post('/createTrip', parser.fields([
    { name: 'images', maxCount: 5 },
    { name: 'itinerary[0][image]', maxCount: 1 },
    { name: 'itinerary[1][image]', maxCount: 1 },
    { name: 'itinerary[2][image]', maxCount: 1 },
    { name: 'itinerary[3][image]', maxCount: 1 },
    { name: 'itinerary[4][image]', maxCount: 1 },
    { name: 'itinerary[5][image]', maxCount: 1 },
]), createTrip);
router.get('/getAllTrips/:email',getAllTrips);
router.get('/getTripsByFilter',getTripsByFilter);
module.exports = router;