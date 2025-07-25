const mongoose = require('mongoose');

const TravelersSchema = new mongoose.Schema({
    totalPeople: {
        type: Number,
        required: true,
        min: 1
    },
    adults: {
        type: Number,
        required: true,
        min: 1
    },
    children: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

module.exports = TravelersSchema;