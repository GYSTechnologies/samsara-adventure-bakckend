const express = require('express');
const router = express.Router();
const {
    toggleFavoriteTrip,
    getFavoriteTripsByUser
} = require('../controllers/UserTripsControlller');

router.post('/toggleFavorite', toggleFavoriteTrip);
router.get('/getFavoriteTrips/:email', getFavoriteTripsByUser);

module.exports = router;
