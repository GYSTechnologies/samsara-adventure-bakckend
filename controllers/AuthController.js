const bcrypt = require("bcrypt");
const UserModel = require("../models/UserModel");
const Booking = require("../models/BookingSchema");
const FavoriteTrip = require("../models/FavoriteTripSchema");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken")
const crypto = require("crypto");
const cloudinary = require("../cloudinary");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

let otpStore = {};

const JWT_SECRET = process.env.JWT_SECRET;

const signup = async (req, res, next) => {
  const { name, email, password, userType, profileUrl, phoneNumber } = req.body;
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
    // transporter.sendMail({
    //     from: process.env.EMAIL,
    //     to: email,
    //     subject: 'Verify Your Email',
    //     text: Your OTP code is ${otp}. It is valid for 5 minutes.
    // }, (err, info) => {
    //     if (err) {
    //         console.error("Error sending OTP email:", err);
    //         return res.status(500).json({ message: "Error while sending OTP" });
    //     }
    // });

    transporter.sendMail(
      {
        from: `"Samsara Adventure" <${process.env.EMAIL}>`,
        to: email,
        subject: "🔐 Email Verification - Your OTP Code",
        html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4CAF50; text-align: center;">Email Verification</h2>
                    <p>Dear User,</p>
                    <p>Thank you for registering with <strong>Samsara Adventure</strong>. Please use the following One-Time Password (OTP) to verify your email address:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="display: inline-block; font-size: 24px; letter-spacing: 3px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                            ${otp}
                        </span>
                    </div>
                    <p>This OTP will expire in <strong>5 minutes</strong>. Please do not share this code with anyone for security reasons.</p>
                    <p>If you did not request this verification, please ignore this email.</p>
                    <br>
                    <p>Best regards,<br><strong>Samsara Adventure</strong> Support Team</p>
                    <hr>
                    <p style="font-size: 12px; color: #888; text-align: center;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            `,
      },
      (err, info) => {
        if (err) {
          console.error("Error sending OTP email:", err);
          return res.status(500).json({ message: "Error while sending OTP" });
        }
      }
    );

    // Store OTP and user data temporarily (in memory)
    otpStore[email] = {
      otp,
      user: {
        name: name,
        email: email,
        password: hashedPassword,
        userType: userType,
        profileUrl:
          profileUrl && profileUrl.trim() !== ""
            ? profileUrl
            : "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        phoneNumber: phoneNumber,
      },
      createdAt: Date.now(), // Timestamp for OTP expiration
    };

    return res
      .status(200)
      .json({ message: "OTP sent on your email, verify now" });
  } catch (e) {
    console.error("Error during registration:", e);
    return res.status(500).json({ message: "Error occured while signup" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otpStore[email]) {
      return res.status(400).json({ message: "No OTP request found for this email" });
    }

    const currentTime = Date.now();
    if (currentTime - otpStore[email].createdAt > 300000) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP has expired. Please click on resend." });
    }

    if (otpStore[email].otp != otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    const newUser = new UserModel({
      ...otpStore[email].user,
    });

    await newUser.save();
    delete otpStore[email];

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType,
        profileUrl: newUser.profileUrl,
        phoneNumber: newUser.phoneNumber,
      },
    });
  } catch (error) {
    console.error("Error during email verification:", error);
    return res.status(500).json({ message: "Error during email verification" });
  }
};

// Login with JWT
const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existUser;
  try {
    existUser = await UserModel.findOne({ email });
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

  // Generate JWT token
  const token = jwt.sign(
    { id: existUser._id, email: existUser.email, userType: existUser.userType },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.status(200).json({
    token,
    user: {
      name: existUser.name,
      email: existUser.email,
      userType: existUser.userType,
      profileUrl: existUser.profileUrl,
      phoneNumber: existUser.phoneNumber,
    },
  });
};

// Signup (only one admin allowed)
const adminSignup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, userType } = req.body;

    if (userType !== 'admin') {
      return res.status(403).json({ message: 'Only admin signup allowed' });
    }

    // check if admin already exists
    const existingAdmin = await UserModel.findOne({ userType: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists. Only one admin allowed.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Cloudinary se uploaded image ka URL
    const profileUrl = req.file ? req.file.path : null;

    const newAdmin = new UserModel({
      name,
      email,
      password: hashedPassword,
      userType: 'admin',
      phoneNumber,
      profileUrl
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        name: newAdmin.name,
        email: newAdmin.email,
        phoneNumber: newAdmin.phoneNumber,
        profileUrl: newAdmin.profileUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login (only admin)
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await UserModel.findOne({ email, userType: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // generate JWT
    const token = jwt.sign(
      { id: admin._id, email: admin.email, userType: admin.userType },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        userType: admin.userType,
        profileUrl: admin.profileUrl,
        phoneNumber: admin.phoneNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


let otpForResetPassword = {};
const sendOtpForResetPassword = async (req, res) => {
  const { email } = req.params;
  let existUser;
  try {
    existUser = await UserModel.findOne({ email });
  } catch (err) {
    return console.log(err);
  }
  if (!existUser) {
    return res.status(404).json({ message: "User not found!" });
  }
  try {
    const otp = crypto.randomInt(1000, 9999);

    // Send OTP via email
    transporter.sendMail(
      {
        from: `"Samsara Adventure" <${process.env.EMAIL}>`,
        to: email,
        subject: "🔐 Reset Password Verification - Your OTP Code",
        text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #D8327D; text-align: center;">Reset Your Password</h2>
                <p>Dear User,</p>
                <p>We have received a request to reset the password for your <strong>Samsara Adventure</strong> account. Please use the OTP below to proceed with resetting your password:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="display: inline-block; font-size: 24px; letter-spacing: 3px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                        ${otp}
                    </span>
                </div>
                <p>This OTP will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email and ensure your account security.</p>
                <p>After entering this OTP, you will be able to set a new password for your account.</p>
                <br>
                    <p>Best regards,<br><strong>Samsara Adventure</strong> Support Team</p>
                    <hr>
                        <p style="font-size: 12px; color: #888; text-align: center;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>`,
      },
      (err, info) => {
        if (err) {
          console.error("Error sending OTP email:", err);
          return res.status(500).json({ message: "Error while sending OTP" });
        }
      }
    );

    // Store OTP and user data temporarily (in memory)
    otpForResetPassword[email] = {
      otp,
      createdAt: Date.now(), // Timestamp for OTP expiration
    };

    return res
      .status(200)
      .json({ message: "OTP sent on your email, verify now" });
  } catch (e) {
    console.error("Error during registration:", e);
    return res.status(500).json({ message: "Error occured while signup" });
  }
};

const verifyEmailForResetPassword = async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Check if the OTP exists for the email
    if (!otpForResetPassword[email]) {
      return res
        .status(400)
        .json({ message: "No OTP request found for this email" });
    }

    // Verify OTP and check for expiration (5 minutes = 300000 ms)
    const currentTime = Date.now();
    if (currentTime - otpForResetPassword[email].createdAt > 300000) {
      delete otpForResetPassword[email]; // Remove the expired OTP
      return res
        .status(400)
        .json({ message: "OTP has expired. Please click on resend." });
    }

    // Check if the provided OTP matches the stored one
    if (otpForResetPassword[email].otp != otp) {
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please try again." });
    }

    // If OTP is valid, save the user to the database
    delete otpForResetPassword[email];

    return res.status(201).json({
      message: "Email Verified Successfully",
    });
  } catch (error) {
    console.error("Error during email verification:", error);
    return res.status(500).json({ message: "Error during email verification" });
  }
};
const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  let existUser;
  try {
    existUser = await UserModel.findOne({ email });
  } catch (err) {
    return console.log(err);
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
};

const updateProfile = async (req, res) => {
  const { email, name } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (req.file && req.file.path) {
      updateData.profileUrl = req.file.path;
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { email },
      updateData,
      { new: true }
    ).select("-_id -__v -password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    return res.status(200).json({ updatedUser });
  } catch (err) {
    console.error("Error updating user profile:", err);
    return res.status(500).json({ message: "Error updating user profile!" });
  }
};

const deleteUser = async (req, res) => {
  const { email } = req.params;

  try {
    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    // Check if user has any current bookings
    const activeBooking = await Booking.findOne({
      email,
      requestStatus: { $in: ["PENDING"] }, // active trips
    });

    if (activeBooking) {
      return res.status(400).json({
        message: "User cannot be deleted because you have an active bookings."
      });
    }

    // Check for package trips that are currently ongoing
    const today = new Date().toISOString().split("T")[0]; // format yyyy-MM-dd

    const ongoingPackage = await Booking.findOne({
      email,
      // tripType: "PACKAGE",
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    if (ongoingPackage) {
      return res.status(400).json({
        message: "User cannot be deleted because they have an ongoing trips."
      });
    }

    // Delete user
    const deletedUser = await UserModel.findOneAndDelete({ email });

    // Delete profile picture if exists
    try {
      const publicId = extractPublicId(deletedUser.profileUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (err) {
      console.error("Failed to delete image:", err.message);
    }

    // Delete user’s past bookings (safe because no active booking exists)
    try {
      await Booking.deleteMany({ email });
    } catch (err) {
      console.error("Failed to delete bookings:", err.message);
    }

    // Delete user’s favorites
    try {
      await FavoriteTrip.deleteMany({ email });
    } catch (err) {
      console.error("Failed to delete favorites:", err.message);
    }

    return res
      .status(200)
      .json({ message: "User and related data deleted successfully." });

  } catch (error) {
    console.error("Error while deleting user:", error);
    return res.status(500).json({ message: "Error while deleting user!" });
  }
};


function extractPublicId(imageUrl) {
  try {
    const urlParts = imageUrl.split("/");
    const fileNameWithExt = urlParts[urlParts.length - 1]; // e.g., abc123.jpg
    const folder = urlParts[urlParts.length - 2]; // e.g., trip_images
    const publicId = `${folder}/${fileNameWithExt.split(".")[0]}`; // trip_images/abc123
    return publicId;
  } catch (err) {
    console.error("Error extracting publicId:", err.message);
    return null;
  }
}

module.exports = {
  signup,
  verifyEmail,
  login,
  changePassword,
  sendOtpForResetPassword,
  verifyEmailForResetPassword,
  resetPassword,
  updateProfile,
  deleteUser,
  adminLogin,
  adminSignup
};
