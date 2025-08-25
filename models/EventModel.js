const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  location: {
    type: String,
    required: true
  },
  venue: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  bookedSeats: {
    type: Number,
    default: 0
  },
  // Main cover image
  coverImage: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Adventure', 'Cultural', 'Food', 'Festival', 'Music', 'Wellness', 'Other']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  organizer: {
    type: String,
    required: true
  },
  highlights: [{
    type: String
  }],
  scheduleItems: [{
    time: String,
    activity: String,
    image: String
  }],
  // included items with image and description
  includedItems: [{
    image: String,
    description: String
  }],
  inclusions: [{
    type: String
  }],
  exclusions: [{
    type: String
  }],
  termsConditions: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

eventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', eventSchema);