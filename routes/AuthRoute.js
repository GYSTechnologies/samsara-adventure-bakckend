const express = require('express')
const router = express.Router()

const { signup, verifyEmail,authenticateToken,login } = require('../controllers/AuthController')

router.post('/signupUser', signup);
router.post("/verifyEmail", verifyEmail);
router.post('/loginUser',login);

module.exports = router;