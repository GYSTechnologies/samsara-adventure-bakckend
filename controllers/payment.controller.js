// controllers/paymentController.js
const dotenv = require("dotenv");
dotenv.config();

const Booking = require("../models/BookingSchema");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function bookingConfirmationTemplate(booking) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color:#2E86C1;">Booking Confirmed! 🎉</h2>
      <p>Dear ${booking.name},</p>
      <p>Thank you for booking your trip with <strong>Samsara Adventures</strong>.</p>

      <h3>Trip Details</h3>
      <ul>
        <li><strong>Trip:</strong> ${booking.title}</li>
        <li><strong>Duration:</strong> ${booking.duration}</li>
        <li><strong>Start Date:</strong> ${new Date(
          booking.startDate
        ).toDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(
          booking.endDate
        ).toDateString()}</li>
        <li><strong>Adults:</strong> ${booking.adults}</li>
        <li><strong>Children:</strong> ${booking.childrens}</li>
        <li><strong>Total Members:</strong> ${booking.total_members}</li>
      </ul>

      <h3>Payment Summary</h3>
      <ul>
        <li><strong>Grand Total:</strong> ₹${booking.payment.grandTotal}</li>
        <li><strong>Transaction ID:</strong> ${
          booking.payment.transactionId
        }</li>
        <li><strong>Payment Date:</strong> ${new Date(
          booking.payment.paymentDate
        ).toLocaleString()}</li>
      </ul>

      <p>We look forward to seeing you on this adventure! 🌍</p>
      <p>— The Samsara Adventures Team</p>
    </div>
  `;
}

// Create Order
exports.createOrder = async (req, res) => {
  const { amount } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
    });

    res.json({ order_id: order.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to create order" });
  }
};

// Verify Payment
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    bookingData,
  } = req.body;

  try {
    // 1. Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // 2. Prepare booking document according to your schema
    const bookingDoc = {
      // email: bookingData.email,
      // name: bookingData.fullName || "Not specified",
      // title: bookingData.tripDetails?.title || "Trip Booking",
      // duration: bookingData.tripDetails?.duration || "Not specified",
      // startDate: bookingData.tripDetails?.startDate || new Date().toISOString(),
      // endDate: bookingData.tripDetails?.endDate || new Date().toISOString(),
      // image: bookingData.tripDetails?.images?.[0] || "default_image_url.jpg",
      email: bookingData.email,
      name: bookingData.fullName || bookingData.name || "Not specified",
      title:
        bookingData.tripDetails?.title || bookingData.title || "Trip Booking",
      duration:
        bookingData.tripDetails?.duration ||
        bookingData.duration ||
        "Not specified",
      startDate:
        bookingData.tripDetails?.startDate ||
        bookingData.startDate ||
        new Date().toISOString(),
      endDate:
        bookingData.tripDetails?.endDate ||
        bookingData.endDate ||
        new Date().toISOString(),
      image:
        bookingData.tripDetails?.images?.[0] ||
        bookingData.image ||
        "default_image_url.jpg",
      tripId: bookingData.tripId,
      phone: bookingData.phone || "",
      current_location: bookingData.pickupLocation || bookingData.current_location || "",
      pickupLocation: bookingData.pickupAndDrop || "",
      total_members: bookingData.total_members || (bookingData.adults || 0) + (bookingData.children || 0),
      adults: bookingData.adults || 0,
      childrens: bookingData.children || bookingData.childrens || 0,
      tripType: bookingData.tripDetails?.tripType || "PACKAGE",
      isPaymentPending: false,
      isPaymentUpdated: true,
      payment: {
        subtotal: bookingData.tripDetails?.payment?.subTotal || bookingData.payment?.subtotal || 0,
        taxation: bookingData.tripDetails?.payment?.taxation || bookingData.payment?.taxation || 0,
        insurance: bookingData.tripDetails?.payment?.insurance || bookingData.payment?.insurance || 0,
        activities: bookingData.tripDetails?.payment?.activities || bookingData.payment?.activities || 0,
        grandTotal: bookingData.totalAmount || bookingData?.payment?.grandTotal || 0,
        transactionId: razorpay_payment_id,
        paymentDate: new Date().toISOString(),
      },
    };

    // 3. Save to database
    const booking = await Booking.create(bookingDoc);

    // Send booking confirmation email
    await transporter.sendMail({
      from: `"Samsara Adventures" <${process.env.EMAIL}>`,
      to: booking.email,
      subject: "Your Trip Booking Confirmation",
      html: bookingConfirmationTemplate(booking),
    });

    // 4. Send success response
    res.json({
      success: true,
      bookingId: booking._id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Booking save error:", error);

    // Specific error messages for validation failures
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: `Validation error: ${messages.join(", ")}`,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to save booking to database",
    });
  }
};
