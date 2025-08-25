// const mongoose = require("mongoose");

// const BookingSchema = new mongoose.Schema({
//   email: { type: String, required: true },
//   name: { type: String, required: true },
//   title: { type: String, required: true },
//   duration: { type: String, required: true },
//   startDate: { type: String, required: true },
//   endDate: { type: String, required: true },
//   tripId: { type: String, required: true },
//   phone: { type: String, required: true },
//   current_location: { type: String, required: true },
//   total_members: { type: Number, required: true },
//   adults: { type: Number, required: true },
//   childrens: { type: Number, required: true },
//   travelWithPet: { type: Boolean, default: false },
//   decoration: { type: Boolean, default: false },
//   photograper: { type: Boolean, default: false },
//   translator: { type: String, default: "" },
//   image: { type: String, required: true },
//   tripType: { type: String, required: true },
//   isPaymentPending: { type: Boolean, default: false },
//   isPaymentUpdated: { type: Boolean, default: false },
//   changes: { type: String, default: "" },
//   iteneraryChanges: { type: String, default: "" },
//   meetDate: { type: String, default: "" },
//   pickupAndDrop: {
//     type: String, default: ""
//   },
//   bookedDate: { type: String },
//     requestStatus: {
//     type: String,
//     enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
//     default: "PENDING"
//   },
//   payment: {
//     subtotal: { type: Number, required: true },
//     taxation: { type: Number, required: true },
//     insurance: { type: Number, required: true },
//     activities: { type: Number, required: true },
//     grandTotal: { type: Number, required: true },
//     transactionId: { type: String, default: "" },
//     paymentDate: { type: String, default: "" }
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model("trip_bookings", BookingSchema);

// const mongoose = require("mongoose");

// const BookingSchema = new mongoose.Schema(
//   {
//     email: { type: String, required: true },
//     name: { type: String, required: false },
//     title: { type: String, required: false },

//     duration: { type: String, required: false },
//     startDate: { type: String, required: false },
//     endDate: { type: String, required: false },
//     tripId: { type: String, required: false },
//     customTripId: { type: String, required: false }, // ADD THIS FIELD

//     phone: { type: String, required: false },
//     current_location: { type: String, required: false },
//     total_members: { type: Number, required: false },
//     adults: { type: Number, required: false },
//     childrens: { type: Number, required: false },
//     travelWithPet: { type: Boolean, default: false },
//     decoration: { type: Boolean, default: false },
//     photographer: { type: Boolean, default: false },
//     translator: { type: String, default: "" },
//     image: { type: String, required: false },
//     tripType: { type: String, required: false },
//     isPaymentPending: { type: Boolean, default: false },
//     isPaymentUpdated: { type: Boolean, default: false },
//     changes: { type: String, default: "" },
//     iteneraryChanges: { type: String, default: "" },
//     meetDate: { type: String, default: "" },
//     pickupAndDrop: { type: String, default: "" },
//     bookedDate: { type: String },
//     requestStatus: {
//       type: String,
//       enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"],
//       default: "PENDING",
//     },
//     payment: {
//       subtotal: { type: Number, required: false },
//       taxation: { type: Number, required: false },
//       insurance: { type: Number, required: false },
//       activities: { type: Number, required: false },
//       grandTotal: { type: Number, required: false },
//       transactionId: { type: String, default: "" },
//       paymentDate: { type: String, default: "" },

//       // 🔽 Razorpay fields
//       razorpay_payment_id: { type: String, default: "" },
//       razorpay_order_id: { type: String, default: "" },
//       razorpay_signature: { type: String, default: "" },

//       refundAmount: { type: Number, default: 0 },
//       refundPercentage: { type: Number, default: 0 },
//       refundId: { type: String, default: null },
//       refundStatus: {
//         type: String,
//         enum: ["NOT_APPLICABLE", "PROCESSED", "FAILED", "PENDING"],
//         default: "NOT_APPLICABLE",
//       },
//       refundProcessedAt: { type: String, default: null },
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("trip_bookings", BookingSchema);

const mongoose = require("mongoose");

// Add this schema for custom itinerary
const customItinerarySchema = new mongoose.Schema(
  {
    title: String,
    state: String,
    description: String,
    overview: [String],
    inclusions: [String],
    exclusions: [String],
    activities: [String],
    tags: [String],
    itinerary: [
      {
        dayNumber: String,
        title: String,
        description: String,
        points: [String],
      },
    ],
    payment: {
      actualPrice: Number,
      grandTotal: Number,
      activities: Number,
      insurance: Number,
      taxation: Number,
      subTotal: Number,
    },
    duration: String,
    startDate: String,
    endDate: String,
    totalSeats: Number,
    pickupDropLocation: String,
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    name: { type: String, required: false },
    title: { type: String, required: false },
    duration: { type: String, required: false },
    startDate: { type: String, required: false },
    endDate: { type: String, required: false },
    tripId: { type: String, required: false },

    hasCustomItinerary: { type: Boolean, default: false },
    customItinerary: { type: customItinerarySchema },

    phone: { type: String, required: false },
    current_location: { type: String, required: false },
    total_members: { type: Number, required: false },
    adults: { type: Number, required: false },
    childrens: { type: Number, required: false },
    travelWithPet: { type: Boolean, default: false },
    decoration: { type: Boolean, default: false },
    photographer: { type: Boolean, default: false },
    translator: { type: Boolean, default: false },
    image: { type: String, required: false },
    tripType: { type: String, required: false },
    isPaymentPending: { type: Boolean, default: false },
    isPaymentUpdated: { type: Boolean, default: false },
    changes: { type: String, default: "" },
    iteneraryChanges: { type: String, default: "" },
    meetDate: { type: String, default: "" },
    pickupAndDrop: { type: String, default: "" },
    bookedDate: { type: String },
    // requestStatus: {
    //   type: String,
    //   enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED", "PAID"],
    //   default: "PENDING",
    // },
    requestStatus: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "CANCELLED",
        "PAID",
        "CANCELLATION_REQUESTED",
      ],
      default: "PENDING",
    },
    cancellationReason: { type: String, default: "" },
    cancellationRequestDate: { type: Date, default: null },
    cancellationApprovalDate: { type: Date, default: null },
    cancelledBy: { type: String, default: "" },

    payment: {
      subtotal: { type: Number, required: false },
      taxation: { type: Number, required: false },
      insurance: { type: Number, required: false },
      activities: { type: Number, required: false },
      grandTotal: { type: Number, required: false },
      transactionId: { type: String, default: "" },
      paymentDate: { type: String, default: "" },

      // 🔽 Razorpay fields
      razorpay_payment_id: { type: String, default: "" },
      razorpay_order_id: { type: String, default: "" },
      razorpay_signature: { type: String, default: "" },

      // 🔽 Potential refund fields (for requested cancellations)
      potentialRefundAmount: { type: Number, default: 0 },
      potentialRefundPercentage: { type: Number, default: 0 },

      // 🔽 Actual refund fields (after admin approval)
      refundAmount: { type: Number, default: 0 },
      refundPercentage: { type: Number, default: 0 },
      refundId: { type: String, default: null },
      refundStatus: {
        type: String,
        enum: ["NOT_APPLICABLE", "PROCESSED", "FAILED", "PENDING"],
        default: "NOT_APPLICABLE",
      },
      refundProcessedAt: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("trip_bookings", BookingSchema);
