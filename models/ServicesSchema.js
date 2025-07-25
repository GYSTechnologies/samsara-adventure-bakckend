const mongoose = require('mongoose');

const ServicesSchema = new mongoose.Schema({
    travelingWithPet: {
        type: Boolean,
        default: false
    },
    personalDecoration: {
        type: Boolean,
        default: false
    },
    photographer: {
        type: Boolean,
        default: false
    },
    translator: {
        type: Boolean,
        default: false
    }
}, { _id: false });

module.exports = ServicesSchema;