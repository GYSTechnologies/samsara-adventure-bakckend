const express = require('express')
const router = express.Router()
const parser = require('../middlewares/upload');
const { signup, verifyEmail, login, changePassword, sendOtpForResetPassword, verifyEmailForResetPassword, resetPassword, updateProfile, deleteUser } = require('../controllers/AuthController')

router.post('/signupUser', signup);
router.post("/verifyEmail", verifyEmail);
router.post('/loginUser', login);
router.put('/changePassword', changePassword);
router.post('/sendOtpForResetPassword/:email', sendOtpForResetPassword);
router.post('/verifyEmailForResetPassword', verifyEmailForResetPassword);
router.put('/resetPassword', resetPassword);
router.put('/updateProfile', parser.single('profileUrl'), updateProfile);
router.delete('/deleteUser/:email', deleteUser);
module.exports = router;