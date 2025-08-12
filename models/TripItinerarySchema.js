const mongoose = require('mongoose');

const itineraryPointSchema = new mongoose.Schema({
  subpoints: [String]
}, { _id: false });

const itinerarySchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  points: [
    {
      type: mongoose.Schema.Types.Mixed  // Can be String or { subpoints: [...] }
    }
  ]
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  subTotal: {
    type: Number,
    required: true
  },
  taxation: {
    type: Number,
    required: true
  },
  insurance: {
    type: Number,
    required: true
  },
  activities: {
    type: Number,
    required: true
  },
  grandTotal: {
    type: Number,
    required: true
  },
  actualPrice: {
    type: Number,
    required: true
  }
}, { _id: false });

const TripItinerarySchema = new mongoose.Schema({
  tripId: {
    type: String,
    unique: true
  },
  tripType: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  isSessional: {
    type: Boolean,
    required: true
  },
  pickupDropLocation: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: false
  },
  description: String,
  images: [String],
  overview: [String],
  inclusions: [String],
  exclusions: [String],
  activities: [String],
  tags: [String],
  payment: {
    type: paymentSchema,
    required: true
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  itinerary: [itinerarySchema]
}, {
  timestamps: true
});


// Ensure unique tripId is set before saving
TripItinerarySchema.pre('validate', function (next) {
  if (!this.tripId) {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.tripId = `TRIP-${timestamp}-${randomPart}`;
  }
  next();
});

module.exports = mongoose.model('trip_itinerary', TripItinerarySchema);
