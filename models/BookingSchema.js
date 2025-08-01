const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  tripId: { type: String, required: true },
  phone: { type: String, required: true },
  current_location: { type: String, required: true },
  total_members: { type: Number, required: true },
  adults: { type: Number, required: true },
  childrens: { type: Number, required: true },
  travelWithPet: { type: Boolean, default: false },
  decoration: { type: Boolean, default: false },
  photograper: { type: Boolean, default: false },
  translator: { type: String, default: "" },
  image: { type: String, required: true },
  tripType: { type: String, required: true },
  isPaymentUpdated: { type: Boolean, default: false },
  changes: { type: String },
  iteneraryChanges: [{ type: String }],
  meetDate: { type: String },
  meetTime: { type: String },
  payment: {
    subtotal: { type: Number, required: true },
    taxation: { type: Number, required: true },
    insurance: { type: Number, required: true },
    activities: { type: Number, required: true },
    grandTotal: { type: Number, required: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("trip_bookings", BookingSchema);
