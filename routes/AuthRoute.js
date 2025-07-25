const express = require('express')
const router = express.Router()

const { signup, verifyEmail, login, changePassword, sendOtpForResetPassword, verifyEmailForResetPassword, resetPassword } = require('../controllers/AuthController')

router.post('/signupUser', signup);
router.post("/verifyEmail", verifyEmail);
router.post('/loginUser', login);
router.post('/changePassword', changePassword);
router.post('/sendOtpForResetPassword/:email', sendOtpForResetPassword);
router.post('/verifyEmailForResetPassword', verifyEmailForResetPassword);
router.post('/resetPassword', resetPassword);

module.exports = router;