const PackageTripBookingModel = require('../models/PackageTripBookingModel');
const PlanOwnTripBoookingModel = require('../models/PlanOwnTripBookingModel');

const createPackageBooking = async (req, res) => {
    try {
        const {
            userName,
            email,
            phoneNo,
            currentLocation,
            tripId,
            destination,
            duration,
            startDate,
            endDate,
            imageUrl,
            paymentStatus,
            subTotal,
            taxation,
            insurance,
            grandTotal,
            travelers
        } = req.body;

        // Create and save booking
        const newBooking = new PackageTripBookingModel({
            userName,
            email,
            phoneNo,
            currentLocation,
            tripId,
            destination,
            duration,
            startDate,
            endDate,
            imageUrl,
            paymentStatus,
            subTotal,
            taxation,
            insurance,
            grandTotal,
            travelers
        });

        const savedBooking = await newBooking.save();

        return res.status(201).json({
            message: 'Package trip booked successfully.'
        });

    } catch (error) {
        console.error('Error while booking:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

const createPlanOwnTripBooking = async (req, res) => {
    try {
        const {
            userName,
            email,
            phoneNo,
            currentLocation,
            tripId,
            destination,
            duration,
            startDate,
            endDate,
            imageUrl,
            paymentStatus,
            subTotal,
            taxation,
            insurance,
            grandTotal,
            preferredDate,
            preferredTime,
            travelers,
            services
        } = req.body;


        const newBooking = new PlanOwnTripBoookingModel({
            userName,
            email,
            phoneNo,
            currentLocation,
            tripId,
            destination,
            duration,
            startDate,
            endDate,
            imageUrl,
            paymentStatus,
            subTotal,
            taxation,
            insurance,
            grandTotal,
            preferredDate,
            preferredTime,
            travelers,
            services
        });

        const savedBooking = await newBooking.save();

        return res.status(201).json({
            message: 'Plan Own Trip appointment booked successfully!'
        });

    } catch (error) {
        console.error('Error while booking:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};


module.exports = { createPackageBooking, createPlanOwnTripBooking };
