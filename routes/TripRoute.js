const express = require('express')
const router = express.Router();
const parser = require('../middlewares/upload');

const { createTrip, getAllTrips, getTripsByFilter, getHomeTripDetails, getStateTrips, getTripsByState, getPlanYourOwnTrips, getUpcommingTrips, getTripDetailsById } = require('../controllers/TripController')
router.post('/createTrip', parser.fields([
    { name: 'images', maxCount: 5 },
    { name: 'itinerary[0][image]', maxCount: 1 },
    { name: 'itinerary[1][image]', maxCount: 1 },
    { name: 'itinerary[2][image]', maxCount: 1 },
    { name: 'itinerary[3][image]', maxCount: 1 },
    { name: 'itinerary[4][image]', maxCount: 1 },
    { name: 'itinerary[5][image]', maxCount: 1 },
]), createTrip);
router.get('/getAllTrips/:email', getAllTrips);
router.get('/getTripsByFilter', getTripsByFilter);
router.get('/getHomeTripDetails', getHomeTripDetails);
router.get('/getStateTrips', getStateTrips);
router.get('/getTripsByState', getTripsByState);
router.get('/getPlanYourOwnTrips', getPlanYourOwnTrips);
router.get('/getUpcomingTrips', getUpcommingTrips);
router.get('/getTripDetailsById',getTripDetailsById);
module.exports = router;