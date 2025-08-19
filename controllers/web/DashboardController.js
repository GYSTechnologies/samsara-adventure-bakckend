const TripItinerary = require('../../models/TripItinerarySchema')
const Booking = require('../../models/BookingSchema');

const getDashboardTopStatics = async (req, res) => {
    try {
        const totalTrips = await TripItinerary.countDocuments();

        const ourPackagesCount = await TripItinerary.countDocuments({ tripType: 'PACKAGE' });

        const customizedTripsCount = await TripItinerary.countDocuments({ tripType: 'CUSTOMIZED' });

        const avgCostResult = await TripItinerary.aggregate([
            {
                $group: {
                    _id: null,
                    averageGrandTotal: { $avg: '$payment.grandTotal' }
                }
            }
        ]);

        const averageGrandTotal = avgCostResult[0]?.averageGrandTotal || 0;

        return res.status(200).json({
            totalTrips,
            ourPackagesCount,
            customizedTripsCount,
            averageGrandTotal: Number(averageGrandTotal.toFixed(2))
        });
    } catch (err) {
        console.error('Error getting trip statistics:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

const getDashBoardTrips = async (req, res) => {
    try {
        const trips = await TripItinerary.find().select("tripId title tripType duration payment.grandTotal images");

        const results = [];

        for (const trip of trips) {
            const count = await Booking.countDocuments({ tripId: trip.tripId });

            results.push({
                tripId: trip.tripId,
                title: trip.title,
                tripType: trip.tripType,
                duration: trip.duration,
                grandTotal: trip.payment.grandTotal,
                image: trip.images[0] || "",
                enrolledCount: count
            });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error("Error in getTripEnrolledCounts:", error);
        res.status(500).json({ message: "Something went wrong", error });
    }
};


module.exports = { getDashboardTopStatics, getDashBoardTrips };