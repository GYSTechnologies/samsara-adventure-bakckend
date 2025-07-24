const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

let otpStore = {};

const { JWT_SECRET } = process.env; // Make sure JWT_SECRET is set in your environment variables

// Middleware to check for token
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ message: "Authorization token is required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        req.user = user; // Attach decoded user to the request object
        next(); // Proceed to the next middleware or route handler
    });
};

const signup = async (req, res, next) => {
    const { name, email, password, userType, profileUrl } = req.body
    let existUser;
    try {
        existUser = await UserModel.findOne({ email });
    } catch (e) {
        return console.log(e);
    }
    if (existUser) {
        return res.status(400).json({ message: "This email already exist!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const otp = crypto.randomInt(1000, 9999);

        // Send OTP via email
        transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify Your Email',
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`
        }, (err, info) => {
            if (err) {
                console.error("Error sending OTP email:", err);
                return res.status(500).json({ message: "Error while sending OTP" });
            }
        });

        // Store OTP and user data temporarily (in memory)
        otpStore[email] = {
            otp,
            user: { name: name, email: email, password: hashedPassword, userType: userType, profileUrl: profileUrl },
            createdAt: Date.now() // Timestamp for OTP expiration
        };

        return res.status(200).json({ message: "OTP sent on your email, verify now" });
    } catch (e) {
        console.error("Error during registration:", e);
        return res.status(500).json({ message: "Error occured while signup" });
    }
}


const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Check if the OTP exists for the email
        if (!otpStore[email]) {
            return res.status(400).json({ message: "No OTP request found for this email" });
        }

        // Verify OTP and check for expiration (5 minutes = 300000 ms)
        const currentTime = Date.now();
        if (currentTime - otpStore[email].createdAt > 300000) {
            delete otpStore[email]; // Remove the expired OTP
            return res.status(400).json({ message: "OTP has expired. Please click on resend." });
        }

        // Check if the provided OTP matches the stored one
        if (otpStore[email].otp != otp) {
            return res.status(400).json({ message: "Invalid OTP. Please try again." });
        }

        // If OTP is valid, save the user to the database
        const newUser = new UserModel({
            ...otpStore[email].user
        });

        await newUser.save();

        delete otpStore[email];

        return res.status(201).json({
            name: newUser.name,
            email: newUser.email,
            userType: newUser.userType,
            profileUrl: newUser.profileUrl
        });
    } catch (error) {
        console.error("Error during email verification:", error);
        return res.status(500).json({ message: "Error during email verification" });
    }
}

const login = async (req, res, next) => {
    const { email, password } = req.body

    let existUser;
    try {
        existUser = await UserModel.findOne({ email })
    } catch (err) {
        return console.log(err);
    }
    if (!existUser) {
        return res.status(404).json({ message: "User not found!" });
    }
    const isMatch = await bcrypt.compare(password, existUser.password);
    if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
    }
    return res.status(200).json({
        name: existUser.name,
        email: existUser.email,
        userType: existUser.userType,
        profileUrl: existUser.profileUrl
    });
}

const changePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    let existUser;
    try {
        existUser = await UserModel.findOne({ email });
    } catch (err) {
        console.error("Error finding user:", err);
        return res.status(500).json({ message: "Error finding user!" });
    }

    if (!existUser) {
        return res.status(404).json({ message: "User not found!" });
    }

    const isMatch = await bcrypt.compare(oldPassword, existUser.password);
    if (!isMatch) {
        return res.status(500).json({ message: "Old password does not match!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const updateUser = await UserModel.findByIdAndUpdate(
            existUser._id, // Use the ID of the existing user found by email
            { password: hashedPassword }, // Update the password field
            { new: true }
        );

        if (!updateUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        return res.status(200).json({ message: "Password updated successfully!" });

    } catch (err) {
        console.error("Error updating password:", err);
        return res.status(500).json({ message: "Error while updating password!" });
    }
};

let otpForResetPassword = {};
const sendOtpForResetPassword = async (req, res) => {
    const { email } = req.params;
    try {
        const otp = crypto.randomInt(1000, 9999);

        // Send OTP via email
        transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify Your Email',
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`
        }, (err, info) => {
            if (err) {
                console.error("Error sending OTP email:", err);
                return res.status(500).json({ message: "Error while sending OTP" });
            }
        });

        // Store OTP and user data temporarily (in memory)
        otpForResetPassword[email] = {
            otp,
            createdAt: Date.now() // Timestamp for OTP expiration
        };

        return res.status(200).json({ message: "OTP sent on your email, verify now" });
    } catch (e) {
        console.error("Error during registration:", e);
        return res.status(500).json({ message: "Error occured while signup" });
    }
}

const verifyEmailForResetPassword = async (req, res) => {
    const { email, otp } = req.body;
    try {
        // Check if the OTP exists for the email
        if (!otpForResetPassword[email]) {
            return res.status(400).json({ message: "No OTP request found for this email" });
        }

        // Verify OTP and check for expiration (5 minutes = 300000 ms)
        const currentTime = Date.now();
        if (currentTime - otpForResetPassword[email].createdAt > 300000) {
            delete otpForResetPassword[email]; // Remove the expired OTP
            return res.status(400).json({ message: "OTP has expired. Please click on resend." });
        }

        // Check if the provided OTP matches the stored one
        if (otpForResetPassword[email].otp != otp) {
            return res.status(400).json({ message: "Invalid OTP. Please try again." });
        }

        // If OTP is valid, save the user to the database
        delete otpForResetPassword[email];

        return res.status(201).json({
            message: "Email Verified Successfully"
        });
    } catch (error) {
        console.error("Error during email verification:", error);
        return res.status(500).json({ message: "Error during email verification" });
    }
}

const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    let existUser;
    try {
        existUser = await UserModel.findOne({ email });
    } catch (err) {
        console.error("Error finding user:", err);
        return res.status(500).json({ message: "Error finding user!" });
    }

    if (!existUser) {
        return res.status(404).json({ message: "User not found!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const updateUser = await UserModel.findByIdAndUpdate(
            existUser._id, // Use the ID of the existing user found by email
            { password: hashedPassword }, // Update the password field
            { new: true }
        );

        if (!updateUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        return res.status(200).json({ message: "Password updated successfully!" });

    } catch (err) {
        console.error("Error updating password:", err);
        return res.status(500).json({ message: "Error while updating password!" });
    }
}

module.exports = { signup, verifyEmail, authenticateToken, login, changePassword, sendOtpForResetPassword, verifyEmailForResetPassword, resetPassword };