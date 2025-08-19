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

const mongoose = require("mongoose");


const BookingSchema = new mongoose.Schema({
    email: { type: String, required: true },
    name: { type: String, required: false },
    title: { type: String, required: false },
    duration: { type: String, required: false },
    startDate: { type: String, required: false },
    endDate: { type: String, required: false },
    tripId: { type: String, required: false },
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
    requestStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
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
