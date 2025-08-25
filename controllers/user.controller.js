const User = require('../models/UserModel');
const Booking = require('../models/BookingSchema');
const TripItinerary = require('../models/TripItinerarySchema');
const Favorite = require('../models/FavoriteTripSchema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const PDFDocument = require('pdfkit');
const fs = require('fs');

const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Cancel booking with refund calculation

exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const bookingId = req.params.id;
    const userEmail = req.user.email;

    // 1. Find the booking (don't exclude CANCELLED yet)
    const booking = await Booking.findOne({
      _id: bookingId,
      email: userEmail
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found'
      });
    }

    // 2. Check status
    if (booking.requestStatus === 'CANCELLED') {
      return res.status(400).json({ 
        success: false,
        message: 'Booking already cancelled',
        bookingId,
        userEmail
      });
    }

    if (booking.requestStatus === 'COMPLETED') {
      return res.status(400).json({ 
        success: false,
        message: 'Completed bookings cannot be cancelled'
      });
    }

    // 3. Process refund if applicable
    let refundResponse = null;
    let refundError = null;
    const razorpayPaymentId = booking.payment?.razorpay_payment_id;
    const totalAmount = booking.payment?.grandTotal || 0;
    const { refundAmount, refundPercentage } = calculateRefund(booking.startDate, totalAmount);

    if (refundAmount > 0 && razorpayPaymentId) {
      try {
        const payment = await razorpay.payments.fetch(razorpayPaymentId);
        if (!payment) throw new Error('Payment not found');
        if (payment.status !== 'captured') throw new Error(`Payment status: ${payment.status}`);

        refundResponse = await razorpay.payments.refund({
          payment_id: razorpayPaymentId,
          amount: refundAmount * 100,
          speed: "normal",
          notes: { reason, booking_id: bookingId }
        });
      } catch (error) {
        refundError = {
          code: error.statusCode || 500,
          message: error.message,
          razorpayError: error.error
        };
        console.error('Refund failed:', refundError);
      }
    }

    // 4. Update booking with CANCELLED status
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        requestStatus: 'CANCELLED',
        cancellationReason: reason,
        cancellationDate: new Date(),
        'payment.refundAmount': refundAmount,
        'payment.refundPercentage': refundPercentage,
        'payment.refundId': refundResponse?.id,
        'payment.refundStatus': refundResponse?.id ? 'PROCESSED' : 
                               (refundAmount > 0 ? 'FAILED' : 'NOT_APPLICABLE'),
        'payment.refundProcessedAt': refundResponse?.id ? new Date() : null,
        'payment.refundError': refundError || null
      },
      { new: true, runValidators: true }
    );

    res.status(refundError ? 207 : 200).json({
      success: true,
      message: refundError ? 
        'Booking cancelled but refund failed' : 
        'Booking cancelled successfully',
      booking: updatedBooking,
      refund: {
        eligible: refundAmount > 0,
        amount: refundAmount,
        percentage: refundPercentage,
        processed: !!refundResponse?.id,
        razorpayRefundId: refundResponse?.id,
        error: refundError || null
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Booking cancellation failed',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, location, bio } = req.body;
    
    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      { 
        name: `${firstName} ${lastName}`,
        email,
        phoneNumber: phone,
        location,
        bio 
      },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const { profileUrl } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      { profileUrl },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get all bookings for a user
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ email: req.user.email });
    
    // Enhance bookings with trip details
    const enhancedBookings = await Promise.all(bookings.map(async booking => {
      const tripDetails = await TripItinerary.findOne({ tripId: booking.tripId });
      return {
        ...booking.toObject(),
        tripDetails
      };
    }));

    res.json(enhancedBookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get booking details
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      email: req.user.email 
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const tripDetails = await TripItinerary.findOne({ tripId: booking.tripId });
    
    res.json({
      booking,
      tripDetails
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// // Download itinerary
// exports.downloadItinerary = async (req, res) => {
//   try {
//     // Find booking and populate any referenced data if needed
//     const booking = await Booking.findOne({ 
//       _id: req.params.id, 
//       email: req.user.email 
//     });

//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     // Get trip itinerary details
//     const tripDetails = await TripItinerary.findOne({ tripId: booking.tripId });

//     if (!tripDetails) {
//       return res.status(404).json({ message: 'Trip details not found' });
//     }

//     // Create PDF document
//     const doc = new PDFDocument({ margin: 50 });
    
//     // Set response headers
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=${booking.name || 'customer'}-itinerary-${booking._id}.pdf`);
    
//     // Pipe PDF to response
//     doc.pipe(res);

//     // Add header with logo and title
//     await addHeader(doc, booking, tripDetails);

//     // Add booking summary section
//     await addBookingSummary(doc, booking);

//     // Add trip overview section
//     await addTripOverview(doc, tripDetails);

//     // Add detailed itinerary section
//     await addDetailedItinerary(doc, tripDetails);

//     // Add inclusions/exclusions section
//     await addInclusionsExclusions(doc, tripDetails);

//     // Add payment summary if available
//     await addPaymentSummary(doc, booking, tripDetails);

//     // Add footer
//     await addFooter(doc);

//     // Finalize the PDF
//     doc.end();

//   } catch (error) {
//     console.error('Error generating itinerary:', error);
//     res.status(500).json({ message: 'Failed to generate itinerary PDF' });
//   }
// };

// // Helper functions for each section

// async function addHeader(doc, booking, tripDetails) {
//   // Add logo (if you have one)
//   // doc.image('path/to/logo.png', 50, 45, { width: 50 });
  
//   doc.fillColor('#444444')
//      .fontSize(20)
//      .text('TRIP ITINERARY', 110, 57, { align: 'left' });
  
//   doc.fontSize(10)
//      .text(`Prepared for: ${booking.name || 'Customer'}`, 200, 50, { align: 'right' })
//      .text(`Booking ID: ${booking._id}`, 200, 65, { align: 'right' })
//      .text(`Generated on: ${new Date().toLocaleDateString()}`, 200, 80, { align: 'right' });
  
//   doc.moveDown(3);
// }

// async function addBookingSummary(doc, booking) {
//   doc.fillColor('#000000')
//      .fontSize(16)
//      .text('BOOKING SUMMARY', { underline: true });
  
//   doc.moveDown(0.5);
  
//   const bookingSummary = [
//     { label: 'Customer Name', value: booking.name || 'Not specified' },
//     { label: 'Email', value: booking.email },
//     { label: 'Phone', value: booking.phone || 'Not specified' },
//     { label: 'Booking Date', value: new Date(booking.createdAt).toLocaleDateString() },
//     { label: 'Booking Status', value: booking.requestStatus },
//     { label: 'Total Members', value: booking.total_members || 'Not specified' },
//     { label: 'Adults', value: booking.adults || 0 },
//     { label: 'Children', value: booking.childrens || 0 },
//     { label: 'Traveling with Pet', value: booking.travelWithPet ? 'Yes' : 'No' },
//     { label: 'Special Requests', value: booking.changes || 'None' }
//   ];
  
//   doc.fontSize(10);
//   let y = doc.y;
//   const columnWidth = 250;
  
//   // First column
//   bookingSummary.slice(0, 5).forEach(item => {
//     doc.text(`${item.label}:`, 50, y, { width: 120, align: 'left' })
//        .text(item.value, 170, y, { width: columnWidth - 120, align: 'left' });
//     y += 20;
//   });
  
//   // Second column
//   y = doc.y - 100; // Reset to top
//   bookingSummary.slice(5).forEach(item => {
//     doc.text(`${item.label}:`, 300, y, { width: 120, align: 'left' })
//        .text(item.value, 420, y, { width: columnWidth - 120, align: 'left' });
//     y += 20;
//   });
  
//   doc.moveDown(2);
// }

// async function addTripOverview(doc, tripDetails) {
//   doc.fillColor('#000000')
//      .fontSize(16)
//      .text('TRIP OVERVIEW', { underline: true });
  
//   doc.moveDown(0.5);
  
//   doc.fontSize(12)
//      .text(`Trip Title: ${tripDetails.title}`, { align: 'left' })
//      .text(`Destination: ${tripDetails.state}`, { align: 'left' })
//      .text(`Trip Type: ${tripDetails.tripType}`, { align: 'left' })
//      .text(`Duration: ${tripDetails.duration}`, { align: 'left' })
//      .text(`Start Date: ${tripDetails.startDate}`, { align: 'left' })
//      .text(`End Date: ${tripDetails.endDate}`, { align: 'left' })
//      .text(`Pickup/Drop Location: ${tripDetails.pickupDropLocation}`, { align: 'left' });
  
//   doc.moveDown();
  
//   // Add overview points if available
//   if (tripDetails.overview && tripDetails.overview.length > 0) {
//     doc.fontSize(12).text('Overview:', { underline: true });
//     tripDetails.overview.forEach(point => {
//       doc.text(`• ${point}`, { indent: 20, align: 'justify' });
//     });
//   }
  
//   doc.moveDown(2);
// }

// async function addDetailedItinerary(doc, tripDetails) {
//   doc.fillColor('#000000')
//      .fontSize(16)
//      .text('DETAILED ITINERARY', { underline: true });
  
//   doc.moveDown(0.5);
  
//   if (tripDetails.itinerary && tripDetails.itinerary.length > 0) {
//     tripDetails.itinerary.forEach((day, index) => {
//       doc.fontSize(14).fillColor('#0066cc').text(`Day ${day.dayNumber}: ${day.title}`);
//       doc.fillColor('#000000');
      
//       if (day.description) {
//         doc.fontSize(12).text(day.description, { indent: 20, align: 'justify' });
//       }
      
//       if (day.points && day.points.length > 0) {
//         day.points.forEach((point, pointIndex) => {
//           if (typeof point === 'string') {
//             doc.text(`• ${point}`, { indent: 20, align: 'justify' });
//           } else if (point.subpoints && point.subpoints.length > 0) {
//             doc.text(`○ Main Point ${pointIndex + 1}:`, { indent: 20 });
//             point.subpoints.forEach(subpoint => {
//               doc.text(`  - ${subpoint}`, { indent: 40 });
//             });
//           }
//         });
//       }
      
//       doc.moveDown();
//     });
//   } else {
//     doc.fontSize(12).text('No detailed itinerary available.', { align: 'center' });
//   }
  
//   doc.moveDown(2);
// }

// async function addInclusionsExclusions(doc, tripDetails) {
//   doc.fillColor('#000000')
//      .fontSize(16)
//      .text('WHAT\'S INCLUDED & EXCLUDED', { underline: true });
  
//   doc.moveDown(0.5);
  
//   // Two column layout
//   const columnWidth = 250;
//   let y = doc.y;
  
//   // Inclusions
//   doc.fontSize(14).text('Included:', 50, y);
//   y += 20;
  
//   if (tripDetails.inclusions && tripDetails.inclusions.length > 0) {
//     doc.fontSize(10);
//     tripDetails.inclusions.forEach(item => {
//       doc.text(`✓ ${item}`, 50, y, { width: columnWidth - 20 });
//       y += 15;
//     });
//   } else {
//     doc.fontSize(10).text('No inclusions specified', 50, y);
//     y += 15;
//   }
  
//   // Reset Y for second column
//   y = doc.y - (tripDetails.inclusions?.length * 15 || 15) + 20;
  
//   // Exclusions
//   doc.fontSize(14).text('Excluded:', 300, y - 20);
  
//   if (tripDetails.exclusions && tripDetails.exclusions.length > 0) {
//     doc.fontSize(10);
//     tripDetails.exclusions.forEach(item => {
//       doc.text(`✗ ${item}`, 300, y, { width: columnWidth - 20 });
//       y += 15;
//     });
//   } else {
//     doc.fontSize(10).text('No exclusions specified', 300, y);
//   }
  
//   doc.moveDown(2);
// }

// async function addPaymentSummary(doc, booking, tripDetails) {
//   doc.fillColor('#000000')
//      .fontSize(16)
//      .text('PAYMENT SUMMARY', { underline: true });
  
//   doc.moveDown(0.5);
  
//   // Use booking payment if available, otherwise fall back to trip payment
//   const payment = booking.payment?.grandTotal ? booking.payment : tripDetails.payment;
  
//   if (payment) {
//     doc.fontSize(12);
    
//     const paymentSummary = [
//       { label: 'Subtotal', value: payment.subTotal || payment.subtotal },
//       { label: 'Taxation', value: payment.taxation },
//       { label: 'Insurance', value: payment.insurance },
//       { label: 'Activities', value: payment.activities },
//       { label: 'Grand Total', value: payment.grandTotal, bold: true },
//       { label: 'Actual Price Paid', value: payment.actualPrice || payment.grandTotal, bold: true }
//     ];
    
//     paymentSummary.forEach(item => {
//       if (item.value !== undefined) {
//         doc.text(`${item.label}:`, { continued: true })
//            .fillColor(item.bold ? '#0066cc' : '#000000')
//            .text(` ₹${item.value.toLocaleString('en-IN')}`, { align: 'right' })
//            .fillColor('#000000');
//       }
//     });
    
//     if (booking.payment?.transactionId) {
//       doc.moveDown();
//       doc.text(`Transaction ID: ${booking.payment.transactionId}`);
//     }
    
//     if (booking.payment?.paymentDate) {
//       doc.text(`Payment Date: ${booking.payment.paymentDate}`);
//     }
//   } else {
//     doc.fontSize(12).text('No payment details available.', { align: 'center' });
//   }
  
//   doc.moveDown(2);
// }

// async function addFooter(doc) {
//   doc.fontSize(10)
//      .text('Thank you for choosing our services!', 50, doc.page.height - 100, {
//        align: 'center',
//        width: 500
//      })
//      .text('For any questions or changes, please contact our customer support.', 50, doc.page.height - 80, {
//        align: 'center',
//        width: 500
//      });
// }


// // Download itinerary
// exports.downloadItinerary = async (req, res) => {
//   try {
//     const booking = await Booking.findOne({
//       _id: req.params.id,
//       email: req.user.email
//     });

//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     const tripDetails = await TripItinerary.findOne({ tripId: booking.tripId });

//     if (!tripDetails) {
//       return res.status(404).json({ message: 'Trip details not found' });
//     }

//     const doc = new PDFDocument({ margin: 50 });

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=${booking.name || 'customer'}-itinerary-${booking._id}.pdf`
//     );

//     doc.pipe(res);

//     // Sections
//     await addHeader(doc, booking, tripDetails);
//     await addBookingSummary(doc, booking);
//     await addTripOverview(doc, tripDetails);
//     await addDetailedItinerary(doc, tripDetails);
//     await addInclusionsExclusions(doc, tripDetails);
//     await addPaymentSummary(doc, booking, tripDetails);
//     await addFooter(doc);

//     doc.end();
//   } catch (error) {
//     console.error('Error generating itinerary:', error);
//     res.status(500).json({ message: 'Failed to generate itinerary PDF' });
//   }
// };

// // ---------- Helper Functions ----------

// // Draw row utility for tables
// function drawRow(doc, label, value, x, y, labelWidth = 120, valueWidth = 180) {
//   doc.font('Helvetica-Bold').fillColor('#333').text(label, x, y, { width: labelWidth });
//   doc.font('Helvetica').fillColor('#000').text(value, x + labelWidth + 5, y, { width: valueWidth });
// }

// async function addHeader(doc, booking) {
//   // Background bar
//   doc.rect(50, 40, doc.page.width - 100, 40).fill('#f5f5f5').stroke();

//   doc.fillColor('#0066cc')
//     .fontSize(20)
//     .text('TRIP ITINERARY', 0, 50, { align: 'center' });

//   doc.fillColor('#000')
//     .fontSize(10)
//     .text(`Prepared for: ${booking.name || 'Customer'}`, 60, 90)
//     .text(`Booking ID: ${booking._id}`, 60, 105);

//   doc.moveDown(2);
// }

// async function addBookingSummary(doc, booking) {
//   doc.moveDown().fontSize(16).fillColor('#0066cc').text('BOOKING SUMMARY', { underline: true });
//   doc.moveDown(0.5);

//   const yStart = doc.y + 5;
//   let y = yStart;

//   // Left column
//   drawRow(doc, 'Customer Name', booking.name || 'N/A', 50, y); y += 18;
//   drawRow(doc, 'Email', booking.email, 50, y); y += 18;
//   drawRow(doc, 'Phone', booking.phone || 'N/A', 50, y); y += 18;
//   drawRow(doc, 'Booking Date', new Date(booking.createdAt).toLocaleDateString(), 50, y); y += 18;
//   drawRow(doc, 'Status', booking.requestStatus, 50, y);

//   // Right column
//   y = yStart;
//   drawRow(doc, 'Total Members', booking.total_members || 'N/A', 320, y); y += 18;
//   drawRow(doc, 'Adults', booking.adults || 0, 320, y); y += 18;
//   drawRow(doc, 'Children', booking.childrens || 0, 320, y); y += 18;
//   drawRow(doc, 'Pet', booking.travelWithPet ? 'Yes' : 'No', 320, y); y += 18;
//   drawRow(doc, 'Special Requests', booking.changes || 'None', 320, y);

//   doc.moveDown(2);
// }

// async function addTripOverview(doc, tripDetails) {
//   doc.fontSize(16).fillColor('#0066cc').text('TRIP OVERVIEW', { underline: true });
//   doc.moveDown(0.5);

//   drawRow(doc, 'Trip Title', tripDetails.title, 50, doc.y); doc.moveDown(1);
//   drawRow(doc, 'Destination', tripDetails.state, 50, doc.y); doc.moveDown(1);
//   drawRow(doc, 'Trip Type', tripDetails.tripType, 50, doc.y); doc.moveDown(1);
//   drawRow(doc, 'Duration', tripDetails.duration, 50, doc.y); doc.moveDown(1);
//   drawRow(doc, 'Start Date', tripDetails.startDate, 50, doc.y); doc.moveDown(1);
//   drawRow(doc, 'End Date', tripDetails.endDate, 50, doc.y); doc.moveDown(1);
//   drawRow(doc, 'Pickup/Drop', tripDetails.pickupDropLocation, 50, doc.y);

//   doc.moveDown();

//   if (tripDetails.overview && tripDetails.overview.length > 0) {
//     doc.fontSize(12).fillColor('#000').text('Overview:', { underline: true });
//     tripDetails.overview.forEach(point => {
//       doc.text(`• ${point}`, { indent: 20, align: 'justify' });
//     });
//   }

//   doc.moveDown(2);
// }

// async function addDetailedItinerary(doc, tripDetails) {
//   doc.fontSize(16).fillColor('#0066cc').text('DETAILED ITINERARY', { underline: true });
//   doc.moveDown(0.5);

//   if (tripDetails.itinerary && tripDetails.itinerary.length > 0) {
//     tripDetails.itinerary.forEach(day => {
//       doc.fontSize(14).fillColor('#0066cc').text(`Day ${day.dayNumber}: ${day.title}`);
//       doc.fillColor('#000').fontSize(12).text(day.description || '', { indent: 20, align: 'justify' });

//       if (day.points?.length > 0) {
//         day.points.forEach(p => doc.text(`• ${typeof p === 'string' ? p : JSON.stringify(p)}`, { indent: 20 }));
//       }
//       doc.moveDown();
//     });
//   } else {
//     doc.fontSize(12).text('No detailed itinerary available.', { align: 'center' });
//   }

//   doc.moveDown(2);
// }

// async function addInclusionsExclusions(doc, tripDetails) {
//   doc.fontSize(16).fillColor('#0066cc').text("WHAT'S INCLUDED & EXCLUDED", { underline: true });
//   doc.moveDown(0.5);

//   const columnWidth = 220;
//   let y = doc.y;

//   // Inclusions
//   doc.fontSize(14).fillColor('#28a745').text('Included:', 50, y); y += 20;
//   if (tripDetails.inclusions?.length > 0) {
//     tripDetails.inclusions.forEach(item => {
//       doc.fontSize(10).fillColor('#000').text(`✓ ${item}`, 50, y, { width: columnWidth });
//       y += 15;
//     });
//   } else {
//     doc.fontSize(10).text('No inclusions specified', 50, y);
//   }

//   // Exclusions
//   y = doc.y - (tripDetails.inclusions?.length * 15 || 15) + 20;
//   doc.fontSize(14).fillColor('#dc3545').text('Excluded:', 320, y); y += 20;

//   if (tripDetails.exclusions?.length > 0) {
//     tripDetails.exclusions.forEach(item => {
//       doc.fontSize(10).fillColor('#000').text(`✗ ${item}`, 320, y, { width: columnWidth });
//       y += 15;
//     });
//   } else {
//     doc.fontSize(10).text('No exclusions specified', 320, y);
//   }

//   doc.moveDown(2);
// }

// async function addPaymentSummary(doc, booking, tripDetails) {
//   doc.fontSize(16).fillColor('#0066cc').text('PAYMENT SUMMARY', { underline: true });
//   doc.moveDown(0.5);

//   const payment = booking.payment?.grandTotal ? booking.payment : tripDetails.payment;

//   if (payment) {
//     const paymentSummary = [
//       { label: 'Subtotal', value: payment.subTotal || payment.subtotal },
//       { label: 'Taxation', value: payment.taxation },
//       { label: 'Insurance', value: payment.insurance },
//       { label: 'Activities', value: payment.activities },
//       { label: 'Grand Total', value: payment.grandTotal, bold: true },
//       { label: 'Paid', value: payment.actualPrice || payment.grandTotal, bold: true }
//     ];

//     paymentSummary.forEach(item => {
//       if (item.value !== undefined) {
//         doc.font('Helvetica-Bold').fillColor('#000').text(`${item.label}:`, { continued: true });
//         doc.font('Helvetica').fillColor(item.bold ? '#0066cc' : '#000')
//           .text(` ₹${item.value.toLocaleString('en-IN')}`, { align: 'right' });
//       }
//     });

//     if (booking.payment?.transactionId) {
//       doc.moveDown().text(`Transaction ID: ${booking.payment.transactionId}`);
//     }
//     if (booking.payment?.paymentDate) {
//       doc.text(`Payment Date: ${booking.payment.paymentDate}`);
//     }
//   } else {
//     doc.fontSize(12).text('No payment details available.', { align: 'center' });
//   }

//   doc.moveDown(2);
// }

// async function addFooter(doc) {
//   doc.fontSize(10).fillColor('#666')
//     .text('Thank you for choosing our services!', 50, doc.page.height - 100, {
//       align: 'center',
//       width: 500
//     })
//     .text('For any questions or changes, please contact our support.', 50, doc.page.height - 80, {
//       align: 'center',
//       width: 500
//     });
// }

// Download itinerary
exports.downloadItinerary = async (req, res) => {
  try {
    // Find booking and populate any referenced data if needed
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      email: req.user.email 
    }).lean();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Get trip itinerary details
    const tripDetails = await TripItinerary.findOne({ tripId: booking.tripId }).lean();

    if (!tripDetails) {
      return res.status(404).json({ message: 'Trip details not found' });
    }

    // Create PDF document with better defaults
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true,
      info: {
        Title: `${booking.name || 'Customer'} Itinerary`,
        Author: 'Your Company Name',
        Subject: 'Trip Itinerary',
        Keywords: 'travel, itinerary, booking',
        Creator: 'Your Company Name',
        CreationDate: new Date()
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${sanitizeFilename(booking.name || 'customer')}-itinerary-${booking._id}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Add header with logo and title
    await addHeader(doc, booking, tripDetails);

    // Add booking summary section
    await addBookingSummary(doc, booking);

    // Add trip overview section
    await addTripOverview(doc, tripDetails);

    // Add detailed itinerary section
    await addDetailedItinerary(doc, tripDetails);

    // Add inclusions/exclusions section
    await addInclusionsExclusions(doc, tripDetails);

    // Add payment summary if available
    await addPaymentSummary(doc, booking, tripDetails);

    // Add terms and conditions
    await addTermsAndConditions(doc);

    // Add footer
    await addFooter(doc);

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({ message: 'Failed to generate itinerary PDF' });
  }
};

// Helper function to sanitize filenames
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Helper functions for each section
async function addHeader(doc, booking, tripDetails) {
  // Add company logo if available
  try {
    // doc.image('path/to/logo.png', 50, 45, { width: 50 });
    // Or use a placeholder
    doc.rect(50, 45, 50, 50).fill('#0066cc');
    doc.fillColor('#ffffff')
       .fontSize(8)
       .text('LOGO', 50, 65, { width: 50, align: 'center' });
  } catch (err) {
    console.log('Could not add logo:', err);
  }
  
  // Main title
  doc.fillColor('#0066cc')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('TRIP ITINERARY', 110, 57, { align: 'left' });
  
  // Customer info
  doc.fillColor('#444444')
     .fontSize(10)
     .font('Helvetica')
     .text(`Prepared for: ${booking.name || 'Customer'}`, 200, 50, { align: 'right' })
     .text(`Booking ID: ${booking._id.toString().slice(-8)}`, 200, 65, { align: 'right' })
     .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 200, 80, { align: 'right' });
  
  // Add decorative line
  doc.moveTo(50, 100)
     .lineTo(550, 100)
     .strokeColor('#0066cc')
     .lineWidth(1)
     .stroke();
  
  doc.moveDown(2);
}

async function addBookingSummary(doc, booking) {
  doc.fillColor('#0066cc')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('BOOKING SUMMARY', { underline: true });
  
  doc.moveDown(0.5);
  
  const bookingSummary = [
    { label: 'Customer Name', value: booking.name || 'Not specified' },
    { label: 'Email', value: booking.email },
    { label: 'Phone', value: booking.phone || 'Not specified' },
    { label: 'Booking Date', value: new Date(booking.createdAt).toLocaleDateString('en-IN') },
    { label: 'Booking Status', value: booking.requestStatus },
    { label: 'Total Members', value: booking.total_members || 'Not specified' },
    { label: 'Adults', value: booking.adults || 0 },
    { label: 'Children', value: booking.childrens || 0 },
    { label: 'Traveling with Pet', value: booking.travelWithPet ? 'Yes' : 'No' },
    { label: 'Special Requests', value: booking.changes || 'None' }
  ];
  
  doc.fontSize(10)
     .font('Helvetica');
  
  let y = doc.y;
  const columnWidth = 250;
  const rowHeight = 20;
  
  // First column
  bookingSummary.slice(0, 5).forEach(item => {
    doc.fillColor('#444444')
       .text(`${item.label}:`, 50, y, { width: 120, align: 'left' })
       .fillColor('#000000')
       .text(item.value, 170, y, { width: columnWidth - 120, align: 'left' });
    y += rowHeight;
  });
  
  // Second column
  y = doc.y - (5 * rowHeight); // Reset to top
  bookingSummary.slice(5).forEach(item => {
    doc.fillColor('#444444')
       .text(`${item.label}:`, 300, y, { width: 120, align: 'left' })
       .fillColor('#000000')
       .text(item.value, 420, y, { width: columnWidth - 120, align: 'left' });
    y += rowHeight;
  });
  
  // Add light background for better readability
  doc.rect(45, doc.y - (5 * rowHeight) - 10, 510, (5 * rowHeight) + 20)
     .fillOpacity(0.1)
     .fill('#0066cc')
     .fillOpacity(1);
  
  doc.moveDown(2);
}

async function addTripOverview(doc, tripDetails) {
  doc.fillColor('#0066cc')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('TRIP OVERVIEW', { underline: true });
  
  doc.moveDown(0.5);
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor('#000000');
  
  // Create a table-like structure for trip details
  const tripInfo = [
    { label: 'Trip Title', value: tripDetails.title },
    { label: 'Destination', value: tripDetails.state },
    { label: 'Trip Type', value: tripDetails.tripType },
    { label: 'Duration', value: tripDetails.duration },
    { label: 'Start Date', value: tripDetails.startDate },
    { label: 'End Date', value: tripDetails.endDate },
    { label: 'Pickup/Drop Location', value: tripDetails.pickupDropLocation }
  ];
  
  let y = doc.y;
  tripInfo.forEach(item => {
    doc.fillColor('#666666')
       .text(`${item.label}:`, 50, y, { width: 150, align: 'left' })
       .fillColor('#000000')
       .text(item.value || 'Not specified', 200, y, { width: 350, align: 'left' });
    y += 20;
  });
  
  doc.moveDown();
  
  // Add overview points if available
  if (tripDetails.overview && tripDetails.overview.length > 0) {
    doc.fontSize(12)
       .fillColor('#0066cc')
       .text('Trip Highlights:', { underline: true });
    
    doc.fillColor('#000000');
    tripDetails.overview.forEach(point => {
      doc.moveDown(0.3)
         .text('•', { continued: true })
         .text(` ${point}`, { indent: 15, align: 'justify' });
    });
  }
  
  doc.moveDown(2);
}

async function addDetailedItinerary(doc, tripDetails) {
  doc.fillColor('#0066cc')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('DETAILED ITINERARY', { underline: true });
  
  doc.moveDown(0.5);
  
  if (tripDetails.itinerary && tripDetails.itinerary.length > 0) {
    tripDetails.itinerary.forEach((day, index) => {
      // Day header with colored background
      doc.fillColor('#0066cc')
         .rect(50, doc.y, 500, 20)
         .fill();
      
      doc.fillColor('#ffffff')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(`Day ${day.dayNumber}: ${day.title}`, 55, doc.y + 4);
      
      doc.fillColor('#000000')
         .moveDown(1.5);
      
      if (day.description) {
        doc.fontSize(12)
           .font('Helvetica')
           .text(day.description, { 
             indent: 20, 
             align: 'justify',
             lineGap: 5
           });
      }
      
      if (day.points && day.points.length > 0) {
        day.points.forEach((point, pointIndex) => {
          if (typeof point === 'string') {
            doc.moveDown(0.3)
               .text('•', { continued: true })
               .text(` ${point}`, { indent: 15, align: 'justify' });
          } else if (point.subpoints && point.subpoints.length > 0) {
            doc.moveDown(0.5)
               .text(`○ ${point.main || `Point ${pointIndex + 1}`}:`, { indent: 15 });
            point.subpoints.forEach(subpoint => {
              doc.moveDown(0.2)
                 .text(`  - ${subpoint}`, { indent: 30 });
            });
          }
        });
      }
      
      // Add separator between days
      if (index < tripDetails.itinerary.length - 1) {
        doc.moveDown(0.5)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .strokeColor('#cccccc')
           .lineWidth(0.5)
           .stroke()
           .moveDown(1);
      } else {
        doc.moveDown(1);
      }
    });
  } else {
    doc.fontSize(12)
       .text('No detailed itinerary available.', { align: 'center' });
  }
  
  doc.moveDown(2);
}

async function addInclusionsExclusions(doc, tripDetails) {
  doc.fillColor('#0066cc')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('WHAT\'S INCLUDED & EXCLUDED', { underline: true });
  
  doc.moveDown(0.5);
  
  // Two column layout with borders
  const columnWidth = 250;
  const startY = doc.y;
  
  // Inclusions box
  doc.rect(50, startY, columnWidth, 150)
     .strokeColor('#0066cc')
     .lineWidth(0.5)
     .stroke()
     .fillColor('#0066cc')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('Included:', 60, startY + 15);
  
  if (tripDetails.inclusions && tripDetails.inclusions.length > 0) {
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');
    
    let y = startY + 40;
    tripDetails.inclusions.forEach(item => {
      doc.text(`✓ ${item}`, 60, y, { width: columnWidth - 20 });
      y += 15;
    });
  } else {
    doc.fontSize(10)
       .text('No inclusions specified', 60, startY + 40);
  }
  
  // Exclusions box
  doc.rect(300, startY, columnWidth, 150)
     .strokeColor('#cc0000')
     .lineWidth(0.5)
     .stroke()
     .fillColor('#cc0000')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('Excluded:', 310, startY + 15);
  
  if (tripDetails.exclusions && tripDetails.exclusions.length > 0) {
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');
    
    let y = startY + 40;
    tripDetails.exclusions.forEach(item => {
      doc.text(`✗ ${item}`, 310, y, { width: columnWidth - 20 });
      y += 15;
    });
  } else {
    doc.fontSize(10)
       .text('No exclusions specified', 310, startY + 40);
  }
  
  doc.moveDown(8);
}

async function addPaymentSummary(doc, booking, tripDetails) {
  doc.fillColor('#0066cc')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('PAYMENT SUMMARY', { underline: true });
  
  doc.moveDown(0.5);
  
  // Use booking payment if available, otherwise fall back to trip payment
  const payment = booking.payment?.grandTotal ? booking.payment : tripDetails.payment;
  
  if (payment) {
    doc.fontSize(12)
       .font('Helvetica');
    
    const paymentSummary = [
      { label: 'Subtotal', value: payment.subTotal || payment.subtotal },
      { label: 'Taxation', value: payment.taxation || 0 },
      { label: 'Insurance', value: payment.insurance || 0 },
      { label: 'Activities', value: payment.activities || 0 },
      { label: 'Discount', value: payment.discount || 0 },
      { label: 'Grand Total', value: payment.grandTotal, bold: true },
      { label: 'Amount Paid', value: payment.actualPrice || payment.grandTotal, bold: true }
    ];
    
    // Calculate positions
    const startY = doc.y;
    const rowHeight = 20;
    
    // Add table headers
    doc.fillColor('#0066cc')
       .text('Item', 50, startY)
       .text('Amount (₹)', 450, startY, { width: 100, align: 'right' });
    
    // Add divider
    doc.moveTo(50, startY + 15)
       .lineTo(550, startY + 15)
       .strokeColor('#0066cc')
       .lineWidth(0.5)
       .stroke();
    
    // Add payment items
    paymentSummary.forEach((item, index) => {
      const y = startY + 20 + (index * rowHeight);
      
      doc.fillColor('#666666')
         .text(item.label, 50, y);
      
      doc.fillColor(item.bold ? '#0066cc' : '#000000')
         .font(item.bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(item.value.toLocaleString('en-IN'), 450, y, { width: 100, align: 'right' });
    });
    
    // Add total divider
    const totalY = startY + 20 + (paymentSummary.length * rowHeight);
    doc.moveTo(50, totalY)
       .lineTo(550, totalY)
       .strokeColor('#0066cc')
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(1);
    
    if (booking.payment?.transactionId) {
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Transaction ID: ${booking.payment.transactionId}`);
    }
    
    if (booking.payment?.paymentDate) {
      doc.text(`Payment Date: ${new Date(booking.payment.paymentDate).toLocaleDateString('en-IN')}`);
    }
    
    if (booking.payment?.paymentMethod) {
      doc.text(`Payment Method: ${booking.payment.paymentMethod}`);
    }
  } else {
    doc.fontSize(12)
       .text('No payment details available.', { align: 'center' });
  }
  
  doc.moveDown(2);
}

async function addTermsAndConditions(doc) {
  doc.addPage()
     .fillColor('#0066cc')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('TERMS & CONDITIONS', { underline: true });
  
  doc.moveDown(0.5);
  
  const terms = [
    "Cancellation policy applies as per company terms.",
    "Prices are subject to change without prior notice.",
    "The company is not responsible for any delays or cancellations due to unforeseen circumstances.",
    "All participants must carry valid ID proof during the trip.",
    "The itinerary is subject to change based on weather conditions or other factors.",
    "Any damage to property will be charged to the guest.",
    "The company reserves the right to terminate services for any misconduct."
  ];
  
  doc.fontSize(10)
     .fillColor('#000000')
     .font('Helvetica');
  
  terms.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, { indent: 20, align: 'justify' });
    doc.moveDown(0.3);
  });
  
  doc.moveDown(2);
}

async function addFooter(doc) {
  const footerY = doc.page.height - 100;
  
  // Add company contact info
  doc.fontSize(10)
     .fillColor('#0066cc')
     .font('Helvetica-Bold')
     .text('CONTACT INFORMATION', 50, footerY, { align: 'center', width: 500 });
  
  doc.fontSize(9)
     .fillColor('#444444')
     .text('Your Company Name', 50, footerY + 20, { align: 'center', width: 500 })
     .text('123 Travel Street, City, State - 123456', 50, footerY + 35, { align: 'center', width: 500 })
     .text('Phone: +91 9876543210 | Email: contact@yourcompany.com', 50, footerY + 50, { align: 'center', width: 500 })
     .text('Website: www.yourcompany.com', 50, footerY + 65, { align: 'center', width: 500 });
  
  // Add page numbers if multi-page
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .fillColor('#888888')
       .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 30, { align: 'center', width: 500 });
  }
}


// Get all trips
exports.getAllTrips = async (req, res) => {
  try {
    const { category, state, isSessional } = req.query;
    let query = { isActive: true };

    if (category) query.category = { $in: [category] };
    if (state) query.state = state;
    if (isSessional) query.isSessional = isSessional === 'true';

    const trips = await TripItinerary.find(query);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get trip details
exports.getTripDetails = async (req, res) => {
  try {
    const trip = await TripItinerary.findOne({ 
      tripId: req.params.tripId,
      isActive: true 
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
