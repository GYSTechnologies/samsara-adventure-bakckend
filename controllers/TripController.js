const TripItineraryModel = require('../models/TripItinerarySchema');

const createTrip = async (req, res) => {
    try {
        const newTrip = new TripItineraryModel(req.body);
        const savedTrip = await newTrip.save();

        res.status(201).json({
            message: 'Trip created successfully!',
            data: savedTrip
        });
    } catch (error) {
        console.error('Error creating trip:', error);
        res.status(400).json({
            message: 'Failed to create trip itinerary',
            error: error.message
        });
    }
};

module.exports = { createTrip };
