const express = require('express')
const router = express.Router()

const { getDashboardTopStatics, getDashBoardTrips, } = require('../../controllers/web/DashboardController');

router.get('/getDashboardTopStatics', getDashboardTopStatics);
router.get('/getDashBoardTrips', getDashBoardTrips);

module.exports = router;