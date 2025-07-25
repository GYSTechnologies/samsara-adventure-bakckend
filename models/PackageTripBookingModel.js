const mongoose = require('mongoose');
const TravelersSchema = require('../models/TravelersSchema')

const PackageTripBooking = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
    },
    phoneNo: {
        type: String,
        required: true,
    },
    currentLocation: {
        type: String,
        required: true,
        trim: true
    },

    // Trip Info
    tripId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    destination: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },

    // Cost Info
    paymentStatus: {
        type: Boolean,
        required: true
    },
    subTotal: {
        type: String,
        required: true
    },
    taxation: {
        type: String,
        required: true
    },
    insurance: {
        type: String,
        required: true
    },
    grandTotal: {
        type: String,
        required: true
    },

    // Travelers Info
    travelers: {
        type: TravelersSchema,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('package_trip_booking', PackageTripBooking);
