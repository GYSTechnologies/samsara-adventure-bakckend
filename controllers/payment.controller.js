// controllers/paymentController.js
const dotenv = require("dotenv");
dotenv.config();

const Booking = require("../models/BookingSchema");
const Trip = require("../models/TripItinerarySchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const {
  sendCancellationRequestUserEmail,
  sendCancellationRequestAdminEmail,
  sendCancellationApprovalEmail,
} = require("../config/email"); // ✅ yaha se import

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
        <li><strong>Transaction ID:</strong> ${booking.payment.transactionId
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

    let booking;

    if (bookingData.enquiryId) {
      // -------- Custom trip booking --------
      const existingBooking = await Booking.findById(bookingData.enquiryId);
      if (!existingBooking) throw new Error("Existing booking not found for custom trip");

      booking = await Booking.findByIdAndUpdate(
        bookingData.enquiryId,
        {
          isPaymentPending: false,
          isPaymentUpdated: true,
          requestStatus: "PAID",
          payment: {
            subtotal:
              bookingData.tripDetails?.payment?.subTotal ||
              bookingData.payment?.subtotal ||
              0,
            taxation:
              bookingData.tripDetails?.payment?.taxation ||
              bookingData.payment?.taxation ||
              0,
            insurance:
              bookingData.tripDetails?.payment?.insurance ||
              bookingData.payment?.insurance ||
              0,
            activities:
              bookingData.tripDetails?.payment?.activities ||
              bookingData.payment?.activities ||
              0,
            grandTotal:
              bookingData.totalAmount || bookingData?.payment?.grandTotal || 0,
            transactionId: razorpay_payment_id,
            paymentDate: new Date().toISOString(),
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
          },
          name:
            bookingData.fullName ||
            bookingData.name ||
            existingBooking.name ||
            "Not specified",
          phone: bookingData.phone || existingBooking.phone || "",
          adults:
            bookingData.adults != null ? bookingData.adults : existingBooking.adults,
          childrens:
            bookingData.children != null
              ? bookingData.children
              : bookingData.childrens != null
                ? bookingData.childrens
                : existingBooking.childrens,
          total_members:
            bookingData.adults != null || bookingData.children != null
              ? (bookingData.adults || existingBooking.adults || 0) +
              (bookingData.children ||
                bookingData.childrens ||
                existingBooking.childrens ||
                0)
              : existingBooking.total_members,
        },
        { new: true }
      );
    } else {
      // -------- Regular trip booking --------
      const totalMembers =
        bookingData.total_members ||
        (bookingData.adults || 0) + (bookingData.children || 0);

      //  Check seat availability atomically
      const trip = await Trip.findOneAndUpdate(
        { tripId: bookingData.tripId, availableSeats: { $gte: totalMembers } },
        { $inc: { availableSeats: -totalMembers } },
        { new: true }
      );

      if (!trip) {
        return res.status(400).json({
          success: false,
          message: "Not enough seats available",
        });
      }
      // Create booking
      const bookingDoc = {
        email: bookingData.email,
        persons: bookingData.persons || [],
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
        current_location:
          bookingData.pickupLocation || bookingData.current_location || "",
        pickupLocation: bookingData.pickupAndDrop || "",
        total_members: totalMembers,
        adults: bookingData.adults || 0,
        childrens: bookingData.children || bookingData.childrens || 0,
        tripType: bookingData.tripDetails?.tripType || "PACKAGE",
        isPaymentPending: false,
        isPaymentUpdated: true,
        requestStatus: "PAID",
        payment: {
          subtotal:
            bookingData.tripDetails?.payment?.subTotal ||
            bookingData.payment?.subtotal ||
            0,
          taxation:
            bookingData.tripDetails?.payment?.taxation ||
            bookingData.payment?.taxation ||
            0,
          insurance:
            bookingData.tripDetails?.payment?.insurance ||
            bookingData.payment?.insurance ||
            0,
          activities:
            bookingData.tripDetails?.payment?.activities ||
            bookingData.payment?.activities ||
            0,
          grandTotal:
            bookingData.totalAmount || bookingData?.payment?.grandTotal || 0,
          transactionId: razorpay_payment_id,
          paymentDate: new Date().toISOString(),
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
        },
      };

      booking = await Booking.create(bookingDoc);
    }

    // Send confirmation email
    await transporter.sendMail({
      from: `"Samsara Adventures" <${process.env.EMAIL}>`,
      to: booking.email,
      subject: "Your Trip Booking Confirmation",
      html: bookingConfirmationTemplate(booking),
    });

    res.json({
      success: true,
      bookingId: booking._id,
      paymentId: razorpay_payment_id,
      isCustomTrip: !!bookingData.enquiryId,
    });
  } catch (error) {
    console.error("Booking save/update error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process booking",
    });
  }
};

// Helper function to calculate refund
function calculateRefund(startDateString, totalAmount) {
  if (!startDateString || !totalAmount) {
    return { refundAmount: 0, refundPercentage: 0 };
  }

  const tripStartDate = new Date(startDateString);
  const today = new Date();
  const timeDiff = tripStartDate - today;
  const daysUntilTrip = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  let refundPercentage = 0;

  if (daysUntilTrip > 7) {
    refundPercentage = 100;
  } else if (daysUntilTrip > 6) {
    refundPercentage = 75;
  } else if (daysUntilTrip > 5) {
    refundPercentage = 50;
  } else if (daysUntilTrip > 4) {
    refundPercentage = 25;
  }

  const refundAmount = Math.round((totalAmount * refundPercentage) / 100);

  return { refundAmount, refundPercentage };
}

// Cancel booking - only mark as cancellation requested
exports.requestCancellation = async (req, res) => {
  try {
    const { reason } = req.body.reason;
    const bookingId = req.params.id;
    const userEmail = req.body.email || req.user.email;

    // Find the booking
    const booking = await Booking.findOne({
      _id: bookingId,
      email: userEmail,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check status
    if (booking.requestStatus === 'CANCELLATION_REQUESTED') {
      return res.status(400).json({
        success: false,
        message: "Cancellation already requested",
      });
    }

    if (booking.requestStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: "Booking already cancelled",
      });
    }

    if (booking.requestStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be cancelled",
      });
    }

    // Calculate potential refund
    const totalAmount = booking.payment?.grandTotal || 0;
    const { refundAmount, refundPercentage } = calculateRefund(
      booking.startDate,
      totalAmount
    );

    // Update booking to CANCELLATION_REQUESTED status (not cancelled yet)
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        requestStatus: "CANCELLATION_REQUESTED",
        cancellationReason: reason,
        cancellationRequestDate: new Date(),
        "payment.potentialRefundAmount": refundAmount,
        "payment.potentialRefundPercentage": refundPercentage,
      },
      { new: true, runValidators: true }
    );

    //  Send emails after update
    try {
      await sendCancellationRequestUserEmail(userEmail, updatedBooking, reason);
      await sendCancellationRequestAdminEmail(updatedBooking, reason);
    } catch (mailErr) {
      console.error("Email sending error:", mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Cancellation requested. Waiting for admin approval.",
      potentialRefund: {
        eligible: refundAmount > 0,
        amount: refundAmount,
        percentage: refundPercentage,
      },
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Cancellation request failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

//ADMIN-SIDE

// Get all cancellation requests
exports.getCancellationRequests = async (req, res) => {
  try {
    const cancellationRequests = await Booking.find({
      requestStatus: "CANCELLATION_REQUESTED",
    })
      .select(
        "name email phone tripId title startDate endDate payment.grandTotal payment.potentialRefundAmount payment.potentialRefundPercentage cancellationReason cancellationRequestDate"
      )
      .sort({ cancellationRequestDate: -1 });

    res.status(200).json({
      success: true,
      requests: cancellationRequests,
    });
  } catch (error) {
    console.error("Error fetching cancellation requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cancellation requests",
    });
  }
};

// exports.approveCancellation = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const booking = await Booking.findOne({
//       _id: id,
//       requestStatus: "CANCELLATION_REQUESTED",
//     });

//     if (!booking) {
//       return res.status(404).json({
//         success: false,
//         message: "Cancellation request not found or already processed",
//       });
//     }

//     // Process refund through Razorpay
//     let refundResponse = null;
//     let refundError = null;
//     const razorpayPaymentId = booking.payment?.razorpay_payment_id;
//     const refundAmount = booking.payment?.potentialRefundAmount || 0;

//     if (refundAmount > 0 && razorpayPaymentId) {
//       try {
//         const payment = await razorpay.payments.fetch(razorpayPaymentId);
//         if (!payment) throw new Error("Payment not found");
//         if (payment.status !== "captured")
//           throw new Error(`Payment status: ${payment.status}`);

//         refundResponse = await razorpay.payments.refund(razorpayPaymentId, {
//           amount: refundAmount * 100, // amount in paise
//           speed: "normal",
//           notes: {
//             reason: booking.cancellationReason,
//             booking_id: booking._id.toString(),
//             approved_by: req.user.email,
//           },
//         });
//       } catch (error) {
//         refundError = {
//           code: error.statusCode || 500,
//           message: error.message,
//           razorpayError: error.error,
//         };
//         console.error("Refund failed:", refundError);
//       }
//     }

//     const updatedBooking = await Booking.findByIdAndUpdate(
//       id,
//       {
//         requestStatus: "CANCELLED",
//         cancellationApprovalDate: new Date(),
//         cancelledBy: req.user.email,
//         "payment.refundAmount": refundAmount,
//         "payment.refundPercentage":
//           booking.payment?.potentialRefundPercentage || 0,
//         "payment.refundId": refundResponse?.id,
//         "payment.refundStatus": refundResponse?.id
//           ? "PROCESSED"
//           : refundAmount > 0
//           ? "FAILED"
//           : "NOT_APPLICABLE",
//         "payment.refundProcessedAt": refundResponse?.id ? new Date() : null,
//         "payment.refundError": refundError || null,
//       },
//       { new: true }
//     );

//     res.status(refundError ? 207 : 200).json({
//       success: true,
//       message: refundError
//         ? "Cancellation approved but refund failed"
//         : "Cancellation approved and refund processed",
//       booking: updatedBooking,
//       refund: {
//         eligible: refundAmount > 0,
//         amount: refundAmount,
//         percentage: booking.payment?.potentialRefundPercentage || 0,
//         processed: !!refundResponse?.id,
//         razorpayRefundId: refundResponse?.id,
//         error: refundError || null,
//       },
//     });
//   } catch (error) {
//     console.error("Approve cancellation error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message || "Cancellation approval failed",
//     });
//   }
// };



// Approve cancellation (this will process the refund)
exports.approveCancellation = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      _id: id,
      requestStatus: "CANCELLATION_REQUESTED",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found or already processed",
      });
    }

    // --- Refund logic ---
    let refundResponse = null;
    let refundError = null;
    const razorpayPaymentId = booking.payment?.razorpay_payment_id;
    const refundAmount = booking.payment?.potentialRefundAmount || 0;

    if (refundAmount > 0 && razorpayPaymentId) {
      try {
        const payment = await razorpay.payments.fetch(razorpayPaymentId);
        if (!payment) throw new Error("Payment not found");
        if (payment.status !== "captured")
          throw new Error(`Payment status: ${payment.status}`);

        refundResponse = await razorpay.payments.refund(razorpayPaymentId, {
          amount: refundAmount * 100,
          speed: "normal",
          notes: {
            reason: booking.cancellationReason,
            booking_id: booking._id.toString(),
            approved_by: req.user.email,
          },
        });
      } catch (error) {
        refundError = {
          code: error.statusCode || 500,
          message: error.message,
          razorpayError: error.error,
        };
        console.error("Refund failed:", refundError);
      }
    }

    // Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        requestStatus: "CANCELLED",
        cancellationApprovalDate: new Date(),
        cancelledBy: req.user.email,
        "payment.refundAmount": refundAmount,
        "payment.refundPercentage": booking.payment?.potentialRefundPercentage || 0,
        "payment.refundId": refundResponse?.id,
        "payment.refundStatus": refundResponse?.id
          ? "PROCESSED"
          : refundAmount > 0
            ? "FAILED"
            : "NOT_APPLICABLE",
        "payment.refundProcessedAt": refundResponse?.id ? new Date() : null,
        "payment.refundError": refundError || null,
      },
      { new: true }
    );


    // --- Free the seats ---
    if (updatedBooking && updatedBooking.tripId && updatedBooking.total_members) {
      await Trip.findOneAndUpdate(
        { tripId: updatedBooking.tripId },
        { $inc: { availableSeats: updatedBooking.total_members } }
      );
    }
    await sendCancellationApprovalEmail(updatedBooking.email, updatedBooking);


    res.status(refundError ? 207 : 200).json({
      success: true,
      message: refundError
        ? "Cancellation approved but refund failed"
        : "Cancellation approved and refund processed",
      booking: updatedBooking,
      refund: {
        eligible: refundAmount > 0,
        amount: refundAmount,
        percentage: booking.payment?.potentialRefundPercentage || 0,
        processed: !!refundResponse?.id,
        razorpayRefundId: refundResponse?.id,
        error: refundError || null,
      },
    });
  } catch (error) {
    console.error("Approve cancellation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Cancellation approval failed",
    });
  }
};


// Reject cancellation request
exports.rejectCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        requestStatus: "CANCELLATION_REQUESTED",
      },
      {
        requestStatus: "APPROVED", // Change back to approved
        cancellationRejectionReason: rejectionReason,
        cancellationRejectionDate: new Date(),
        rejectedBy: req.user.email,
        "payment.potentialRefundAmount": 0,
        "payment.potentialRefundPercentage": 0,
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Cancellation request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cancellation request rejected",
      booking,
    });
  } catch (error) {
    console.error("Reject cancellation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject cancellation request",
    });
  }
};
