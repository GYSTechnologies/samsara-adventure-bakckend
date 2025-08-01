const mongoose = require('mongoose');

const favoriteTripSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true, // improves query performance for userEmail
  },
  tripId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true
});

// Prevent duplicate favorites
favoriteTripSchema.index({ email: 1, tripId: 1 }, { unique: true });

module.exports = mongoose.model('favorite_trip', favoriteTripSchema);