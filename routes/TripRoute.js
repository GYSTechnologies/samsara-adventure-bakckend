const express = require('express')
const router = express.Router();
const parser = require('../middlewares/upload');

const { createTrip, getAllTrips, getTripsByFilter, getHomeTripDetails, getStateTrips, getTripsByState, getPlanYourOwnTrips, getUpcommingTrips, getTripDetailsById, deleteTripById,searchDestinations } = require('../controllers/TripController')
router.post('/createTrip', parser.fields([
    { name: 'images', maxCount: 5 }
]), createTrip);
router.get('/search', searchDestinations);
router.get('/getAllTrips/:email', getAllTrips);
router.get('/getTripsByFilter', getTripsByFilter);
router.get('/getHomeTripDetails', getHomeTripDetails);
router.get('/getStateTrips', getStateTrips);
router.get('/getTripsByState', getTripsByState);
router.get('/getPlanYourOwnTrips', getPlanYourOwnTrips);
router.get('/getUpcomingTrips', getUpcommingTrips);
router.get('/getTripDetailsById', getTripDetailsById);
router.delete('/deleteTripById/:tripId',deleteTripById);
module.exports = router;