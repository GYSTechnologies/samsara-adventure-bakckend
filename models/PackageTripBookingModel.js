const mongoose = require('mongoose');
const TravelersSchema = require('../models/TravelersSchema')

const PackageTripBooking = new mongoose.Schema({
    bookId: {
        type: String,
        unique: true
    },
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

PackageTripBooking.pre('save', async function (next) {
    if (!this.bookId) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-letter random
        const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
        this.bookId = `BOOK-${timestamp}-${randomPart}`; // e.g., BOOK-982371-AZ9FHD
    }
    next();
});


module.exports = mongoose.model('package_trip_booking', PackageTripBooking);
