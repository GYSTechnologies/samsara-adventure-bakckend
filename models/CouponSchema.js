// models/Coupon.js
const mongoose = require('mongoose');

const ValiditySchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    }
}, { _id: false });

const CouponSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true,
        trim: true
    },
    couponId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        unique: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 1
    },
    perDayLimit: {
        type: Number,
        required: true,
        min: 1
    },
    useLimit: {
        type: Number,
        required: true,
        min: 1
    },
    minimumAmount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    validity: {
        type: ValiditySchema,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('coupon_schema', CouponSchema);
