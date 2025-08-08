const Booking = require('../models/BookingSchema')

const createBooking = async (req, res) => {
    try {
        const newUpdate = new Booking(req.body);
        const savedUpdate = await newUpdate.save();
        res.status(201).json({ message: "Trip Booked Successfully!" });
    } catch (error) {
        res.status(400).json({ error: "Failed to create trip update", message: error.message });
    }
};


const deleteByEmailAndTripId = async (req, res) => {
    const { email, tripId } = req.body;
    if (!email || !tripId) {
        return res.status(400).json({ message: "Email and TripId is required." });
    }
    try {
        const booking = await Booking.findOneAndDelete({ email, tripId });
        if (!booking) {
            return res.status(404).json({ message: "Booking not found with provided email and tripId." });
        }
        res.status(200).json({ message: "Booking deleted successfully." });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ message: "Server error." });
    }
}

const getMyPlans = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const bookings = await Booking.find({ email }).select(
            "tripId title duration startDate endDate isPaymentUpdated tripType"
        );

        const response = bookings.map(booking => ({
            tripId: booking.tripId,
            title: booking.title,
            duration: booking.duration,
            startDate: booking.startDate,
            endDate: booking.endDate,
            paymentStatus: booking.isPaymentUpdated,
            tripType: booking.tripType
        }));

        res.status(200).json({ plans: response });
    } catch (error) {
        console.error("Error fetching plans:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getMyPlans2 = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const bookings = await Booking.find({ email }).select(
            "tripId title duration startDate endDate image"
        );

        const response = bookings.map(booking => ({
            tripId: booking.tripId,
            title: booking.title,
            duration: booking.duration,
            startDate: booking.startDate,
            endDate: booking.endDate,
            image: image
        }));

        res.status(200).json({ plans: response });
    } catch (error) {
        console.error("Error fetching plans:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { createBooking, getMyPlans, deleteByEmailAndTripId, getMyPlans2 };
