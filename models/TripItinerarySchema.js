const mongoose = require('mongoose');

const TripItinerarySchema = new mongoose.Schema({
    tripId: { type: String, unique: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    duration: { type: String, required: true },
    tripType: { type: String, enum: ['PACKAGE', 'CUSTOM'], required: true },
    tripCategory: { type: String },
    images: [{ type: String }],
    rating: { type: Number, min: 0, max: 5 },
    difficulty: { type: String, enum: ['Easy', 'Moderate', 'Hard'] },
    transportation: { type: String },
    hotelCategory: { type: String },
    activities: [{ type: String }],
    showMoreActivities: { type: Boolean, default: false },
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    pricing: {
        originalPrice: { type: Number, required: true },
        discountedPrice: { type: Number, required: true },
        tax: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        currency: { type: String, default: 'INR' }
    },
    itinerary: [
        {
            day: { type: Number, required: true },
            title: { type: String, required: true },
            points: [
                {
                    text: { type: String },
                    subPoints: [{ type: String }]
                }
            ]
        }
    ],
    customPlanOptions: {
        suggestedPlaces: [{ type: String }],
        minDays: { type: Number },
        maxDays: { type: Number },
        guideAvailable: { type: Boolean },
        note: { type: String }
    }
}, { timestamps: true });

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
