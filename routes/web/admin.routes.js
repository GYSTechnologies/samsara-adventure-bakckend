const express = require('express')
const router = express.Router()
const parser = require('../../middlewares/upload');

const {adminLogin,adminSignup} = require('../../controllers/AuthController')

router.post('/signup', parser.single('profileImage'), adminSignup);
router.post('/login', adminLogin);







module.exports = router;