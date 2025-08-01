const BookingSchema = require('../models/BookingSchema')

const createBooking = async (req, res) => {
    try {
        const newUpdate = new BookingSchema(req.body);
        const savedUpdate = await newUpdate.save();
        res.status(201).json(savedUpdate);
    } catch (error) {
        res.status(400).json({ error: "Failed to create trip update", message: error.message });
    }
};

module.exports = { createBooking };
