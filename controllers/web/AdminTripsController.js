const TripItinerary = require('../../models/TripItinerarySchema')
const Booking = require('../../models/BookingSchema')

const getPackagesTrips = async (req, res) => {
    try {
        const trips = await TripItinerary.find({ tripType: 'PACKAGE' }).select('tripId title duration startDate endDate isActive payment.grandTotal');

        if (!trips || trips.length === 0) {
            return res.status(404).json({ message: "Package Trips not found." });
        }

        // Add booking count for each trip
        const tripsWithBookingCount = await Promise.all(
            trips.map(async (trip) => {
                const enrolledCount = await Booking.countDocuments({ tripId: trip.tripId });
                return {
                    tripId: trip.tripId,
                    title: trip.title,
                    duration: trip.duration,
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    isActive: trip.isActive,
                    grandTotal: trip.payment.grandTotal,
                    enrolledCount
                };
            })
        );

        return res.status(200).json(tripsWithBookingCount);
    } catch (error) {
        console.error('Error getting package trips:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const getPlanOwnTrips = async (req, res) => {
    try {
        // 1. Fetch all bookings
        const bookings = await Booking.find({ tripType: 'CUSTOMIZED' }).select(
            "name title duration startDate endDate payment.grandTotal total_members tripId"
        );

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }

        // 2. For each booking, fetch related trip's isActive
        const results = await Promise.all(
            bookings.map(async (booking) => {
                const trip = await TripItinerary.findOne({ tripId: booking.tripId }).select("isActive");

                return {
                    name: booking.name,
                    title: booking.title,
                    duration: booking.duration,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    total_members: booking.total_members,
                    grandTotal: booking.payment?.grandTotal || 0,
                    isActive: trip ? trip.isActive : false // default false if trip not found
                };
            })
        );

        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching booking with trip status:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getPayments = async (req, res) => {
    try {
        const bookings = await Booking.find({ isPaymentPending: false }).select(
            "name payment.grandTotal tripId paymentDate transactionId"
        );
        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }
        const results = await Promise.all(
            bookings.map(async (booking) => {
                return {
                    name: booking.name,
                    tripId: booking.tripId,
                    grandTotal: booking.payment?.grandTotal || 0,
                    paymentDate: booking.payment?.paymentDate || '',
                    transactionId: booking.payment?.transactionId || ''
                }
            })
        );
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const getPassengers = async (req, res) => {
    try {
        const bookings = await Booking.find().select(
            "name email phone tripType payment.grandTotal tripId"
        );
        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }
        const results = await Promise.all(
            bookings.map(async (booking) => {
                return {
                    name: booking.name,
                    email: booking.email,
                    tripId: booking.tripId,
                    grandTotal: booking.payment?.grandTotal || 0,
                    tripType: booking.tripType,
                    phone: booking.phone
                }
            })
        );
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const getEnquiries = async (req, res) => {
    try {
        const bookings = await Booking.find().select(
            "name email phone duration total_members title tripId"
        );
        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }
        const results = await Promise.all(
            bookings.map(async (booking) => {
                return {
                    name: booking.name,
                    email: booking.email,
                    tripId: booking.tripId,
                    title: booking.title,
                    duration: booking.duration,
                    total_members: booking.total_members,
                    phone: booking.phone
                }
            })
        );
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching enquiries:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { getPackagesTrips, getPlanOwnTrips, getPayments, getPassengers, getEnquiries };