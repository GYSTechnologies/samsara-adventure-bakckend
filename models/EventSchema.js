const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Ensure unique tripId is set before saving
EventSchema.pre('validate', function (next) {
    if (!this.eventId) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        this.eventId = `EVENT-${timestamp}-${randomPart}`;
    }
    next();
});

module.exports = mongoose.model('events', EventSchema);