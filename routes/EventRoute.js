const express = require('express')
const router = express.Router();
const parser = require('../middlewares/upload');

const { createEvent, getAllEvents, getEventByEventId,getAllEventPageEvents } = require('../controllers/EventController')

router.post('/createEvent', parser.single("image"), createEvent);
router.get('/getAllEvents', getAllEvents);
router.get('/getEventByEventId', getEventByEventId);
router.get('/getAllEventPageEvents',getAllEventPageEvents);
module.exports = router;
