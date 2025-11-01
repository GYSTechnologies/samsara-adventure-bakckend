require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const UserModel = require("../models/UserModel");
const Booking = require("../models/BookingSchema");
const FavoriteTrip = require("../models/FavoriteTripSchema");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const cloudinary = require("../cloudinary");

// --- OTP model (persistent, TTL=300s) ---
// You can move this into models/OtpModel.js and require it instead
const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otp: { type: Number, required: true },
    purpose: { type: String, enum: ["signup", "reset"], required: true },
    // For signup, we store the user payload to create the user after verification
    userPayload: {
      type: Object,
      default: null,
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

// TTL index: document will be removed 300 seconds (5 minutes) after createdAt
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

const OtpModel = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);

// --- Mail transporter setup ---
// If you plan to use a transactional provider, replace this transporter creation block
// and use their official SDK for better reliability on Vercel (recommended).
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  // optional timeouts
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verify transporter once on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("Transporter verification failed:", err);
  } else {
    console.log("Mail transporter ready");
  }
});

let OTP_LENGTH = 4; // 1000-9999

const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// -------------------- HELPERS --------------------
async function sendMail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Samsara Adventures" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    return { ok: true, info };
  } catch (err) {
    console.error("Error sending email:", err);
    return { ok: false, error: err };
  }
}

// -------------------- CONTROLLERS --------------------

const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // check if user already exists
    let user = await UserModel.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash(sub, 10);

      // create new user
      // user = await UserModel.create({
      //   name,
      //   email,
      //   profileUrl: picture,
      //   userType: "user",
      //   googleId: sub,
      // });
      user = await UserModel.create({
        name,
        email,
        profileUrl: picture,
        userType: "user",
        password: hashedPassword,
        phoneNumber: 0
      });
    }

    // generate JWT
    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: appToken,
      user,
    });
  } catch (err) {
    console.error("Google Auth Error:", err);
    return res.status(401).json({ success: false, message: "Invalid Google token" });
  }
};

const signup = async (req, res, next) => {
  try {
    const { name, email, password, userType = "user", phoneNumber } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Please provide name, email and password." });
    }

    // profile URL extraction
    let profileUrlFromReq = null;
    if (req.file) {
      profileUrlFromReq = req.file.path || req.file.filename || req.file.secure_url || null;
      if (req.file.secure_url) profileUrlFromReq = req.file.secure_url;
    } else {
      profileUrlFromReq = req.body.profileUrl;
    }

    const profileUrl =
      typeof profileUrlFromReq === "string" && profileUrlFromReq.trim() !== ""
        ? profileUrlFromReq.trim()
        : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    // Check if user already exists
    let existUser;
    try {
      existUser = await UserModel.findOne({ email });
    } catch (e) {
      console.error("Error finding user:", e);
      return res.status(500).json({ message: "Server error during signup" });
    }

    if (existUser) {
      return res.status(400).json({ message: "This email already exists!" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH - 1); // 1000-9999

    // Store OTP + user payload in DB with purpose 'signup'
    await OtpModel.create({
      email,
      otp,
      purpose: "signup",
      userPayload: {
        name,
        email,
        password: hashedPassword,
        userType,
        profileUrl,
        phoneNumber,
      },
    });

    // Send OTP email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4CAF50; text-align: center;">Email Verification</h2>
          <p>Dear ${name},</p>
          <p>Thank you for registering with <strong>Samsara Adventures</strong>. Please use the following One-Time Password (OTP) to verify your email address:</p>
          <div style="text-align: center; margin: 20px 0;">
              <span style="display: inline-block; font-size: 24px; letter-spacing: 3px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                  ${otp}
              </span>
          </div>
          <p>This OTP will expire in <strong>5 minutes</strong>. Please do not share this code with anyone for security reasons.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <br>
          <p>Best regards,<br><strong>Samsara Adventures</strong> Support Team</p>
          <hr>
          <p style="font-size: 12px; color: #888; text-align: center;">
              This is an automated message. Please do not reply to this email.
          </p>
      </div>
    `;

    const sendResult = await sendMail({
      to: email,
      subject: "🔐 Email Verification - Your OTP Code",
      html,
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    if (!sendResult.ok) {
      // Optionally remove the OTP doc since email couldn't be sent
      try {
        await OtpModel.deleteMany({ email, purpose: "signup" });
      } catch (e) {
        console.error("Error cleaning up OTP after email failure:", e);
      }
      return res.status(500).json({ message: "Error while sending OTP email", error: sendResult.error?.message || sendResult.error });
    }

    return res.status(200).json({ message: "OTP sent to your email. Verify now." });
  } catch (e) {
    console.error("Error during signup:", e);
    return res.status(500).json({ message: "Error occurred while signup" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and otp" });
    }

    // Find OTP entry in DB (signup purpose)
    const otpRecord = await OtpModel.findOne({ email, purpose: "signup", otp: Number(otp) });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
    }

    // Create user from stored payload
    const payload = otpRecord.userPayload;
    if (!payload) {
      // unexpected
      await OtpModel.deleteOne({ _id: otpRecord._id });
      return res.status(500).json({ message: "Missing user data for signup" });
    }

    // Ensure user still doesn't exist (race)
    const existing = await UserModel.findOne({ email });
    if (existing) {
      await OtpModel.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new UserModel({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      userType: payload.userType,
      profileUrl: payload.profileUrl,
      phoneNumber: payload.phoneNumber,
    });

    await newUser.save();

    // Delete used OTP
    await OtpModel.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        userId: newUser._id,
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType,
        profileUrl: newUser.profileUrl,
        phoneNumber: newUser.phoneNumber,
        token: token,
      },
    });
  } catch (error) {
    console.error("Error during email verification:", error);
    return res.status(500).json({ message: "Error during email verification" });
  }
};

const resetOtp = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email query param required" });

    const existUser = await UserModel.findOne({ email });
    if (existUser) return res.status(400).json({ message: "User already exists." });

    // find the previous signup OTP entry to get stored userPayload
    const prevOtp = await OtpModel.findOne({ email, purpose: "signup" });

    if (!prevOtp || !prevOtp.userPayload) {
      return res.status(400).json({ message: "No pending signup found for this email" });
    }

    const otp = crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH - 1);

    await OtpModel.deleteMany({ email, purpose: "signup" });
    await OtpModel.create({
      email,
      otp,
      purpose: "signup",
      userPayload: prevOtp.userPayload, // ✅ keep the same payload!
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2196F3; text-align: center;">New OTP Requested</h2>
        <p>Dear ${prevOtp.userPayload.name},</p>
        <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
        <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; font-size: 24px; letter-spacing: 3px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                ${otp}
            </span>
        </div>
        <p>This OTP will expire in <strong>5 minutes</strong>.</p>
      </div>
    `;

    const sendResult = await sendMail({
      to: email,
      subject: "🔐 New OTP - Email Verification",
      html,
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    if (!sendResult.ok) {
      await OtpModel.deleteMany({ email, purpose: "signup" });
      return res.status(500).json({ message: "Error while resending OTP" });
    }

    return res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("Error during OTP reset:", error);
    return res.status(500).json({ message: "Error while resetting OTP" });
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existUser;
  try {
    existUser = await UserModel.findOne({ email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
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
      userId: existUser._id,
      name: existUser.name,
      email: existUser.email,
      userType: existUser.userType,
      profileUrl: existUser.profileUrl,
      phoneNumber: existUser.phoneNumber,
      token: token,
    },
  });
};

// Signup (only one admin allowed)
const adminSignup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, userType } = req.body;

    if (userType !== "admin") {
      return res.status(403).json({ message: "Only admin signup allowed" });
    }

    // check if admin already exists
    const existingAdmin = await UserModel.findOne({ userType: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists. Only one admin allowed." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Cloudinary uploaded image URL
    const profileUrl = req.file ? req.file.path : null;

    const newAdmin = new UserModel({
      name,
      email,
      password: hashedPassword,
      userType: "admin",
      phoneNumber,
      profileUrl,
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        name: newAdmin.name,
        email: newAdmin.email,
        phoneNumber: newAdmin.phoneNumber,
        profileUrl: newAdmin.profileUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login (only admin)
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await UserModel.findOne({ email, userType: "admin" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // generate JWT
    const token = jwt.sign(
      { id: admin._id, email: admin.email, userType: admin.userType },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        userType: admin.userType,
        profileUrl: admin.profileUrl,
        phoneNumber: admin.phoneNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- Reset password OTP flow: send OTP (persistent) ---
const sendOtpForResetPassword = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ message: "Email param required" });

    const existUser = await UserModel.findOne({ email });
    if (!existUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    const otp = crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH - 1);

    // Delete any existing reset OTPs and create a new one
    await OtpModel.deleteMany({ email, purpose: "reset" });
    await OtpModel.create({
      email,
      otp,
      purpose: "reset",
      userPayload: null,
    });

    const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #D8327D; text-align: center;">Reset Your Password</h2>
                <p>Dear User,</p>
                <p>Please use the OTP below to reset your password:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="display: inline-block; font-size: 24px; letter-spacing: 3px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                        ${otp}
                    </span>
                </div>
                <p>This OTP will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
                <br>
                    <p>Best regards,<br><strong>Samsara Adventures</strong> Support Team</p>
                    <hr>
                        <p style="font-size: 12px; color: #888; text-align: center;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>`;

    const sendResult = await sendMail({
      to: email,
      subject: "🔐 Reset Password Verification - Your OTP Code",
      html,
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    if (!sendResult.ok) {
      await OtpModel.deleteMany({ email, purpose: "reset" });
      return res.status(500).json({ message: "Error while sending OTP", error: sendResult.error?.message || sendResult.error });
    }

    return res.status(200).json({ message: "OTP sent to your email, verify now" });
  } catch (e) {
    console.error("Error in sendOtpForResetPassword:", e);
    return res.status(500).json({ message: "Error occured while sending OTP" });
  }
};

const verifyEmailForResetPassword = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

    const record = await OtpModel.findOne({ email, purpose: "reset", otp: Number(otp) });
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP valid --> remove it and allow user to proceed to reset password
    await OtpModel.deleteOne({ _id: record._id });

    return res.status(200).json({ message: "Email Verified Successfully" });
  } catch (error) {
    console.error("Error during email verification for reset:", error);
    return res.status(500).json({ message: "Error during email verification" });
  }
};

const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  let existUser;
  try {
    existUser = await UserModel.findOne({ email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
  if (!existUser) {
    return res.status(404).json({ message: "User not found!" });
  }
  const isMatch = await bcrypt.compare(oldPassword, existUser.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Old password does not match!" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updateUser = await UserModel.findByIdAndUpdate(
      existUser._id,
      { password: hashedPassword },
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
      existUser._id,
      { password: hashedPassword },
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
  const { email, name, phoneNumber } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
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
      requestStatus: { $in: ["PENDING"] },
    });

    if (activeBooking) {
      return res.status(400).json({
        message: "User cannot be deleted because you have an active bookings.",
      });
    }

    // Check for package trips that are currently ongoing
    const today = new Date().toISOString().split("T")[0]; // format yyyy-MM-dd

    const ongoingPackage = await Booking.findOne({
      email,
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    if (ongoingPackage) {
      return res.status(400).json({
        message: "User cannot be deleted because they have an ongoing trips.",
      });
    }

    // Delete user
    const deletedUser = await UserModel.findOneAndDelete({ email });

    // Delete profile picture if exists
    try {
      const publicId = extractPublicId(deletedUser?.profileUrl || "");
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
    if (!imageUrl) return null;
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
  adminSignup,
  resetOtp,
  googleAuth,
};
