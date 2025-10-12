const Booking = require('../models/BookingSchema');

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
            "tripId title duration startDate endDate isPaymentUpdated tripType _id requestStatus image"
        ).sort({ updatedAt: -1 });

        const response = bookings.map(booking => ({
            bookingId: booking._id,
            tripId: booking.tripId,
            title: booking.title || "",
            duration: booking.duration || "",
            startDate: booking.startDate || "",
            endDate: booking.endDate || "",
            paymentStatus: booking.isPaymentUpdated || false,
            tripType: booking.tripType || "PACKAGE",
            requestStatus: booking.requestStatus || "PENDING",
            image: booking.image
        }));

        res.status(200).json({ plans: response });
    } catch (error) {
        console.error("Error fetching plans:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// const getMyTrips = async (req, res) => {
//     try {
//         const { email } = req.query;

//         if (!email) {
//             return res.status(400).json({ message: "Email is required." });
//         }

//         // Get today's date without time (midnight)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         // Only fetch trips starting today or in the future
//         const bookings = await Booking.find({
//             email,
//             startDate: { $gte: today.toISOString().split("T")[0] }
//         }).select("tripId title duration startDate endDate image");

//         const response = bookings.map(booking => ({
//             tripId: booking.tripId,
//             title: booking.title || "",
//             duration: booking.duration || "",
//             startDate: booking.startDate || "",
//             endDate: booking.endDate || "",
//             image: booking.image || ""
//         }));

//         res.status(200).json({ plans: response });
//     } catch (error) {
//         console.error("Error fetching plans:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

const getMyTrips = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        // Fetch only trips with status PAID
        const bookings = await Booking.find({
            email,
            requestStatus: "PAID"
        }).select("tripId title duration startDate endDate image requestStatus tripType");

        const response = bookings.map(booking => ({
            tripId: booking.tripId,
            title: booking.title || "",
            duration: booking.duration || "",
            startDate: booking.startDate || "",
            endDate: booking.endDate || "",
            image: booking.image || "",
            status: booking.requestStatus,
            tripType: booking.tripType
        }));

        res.status(200).json({ plans: response });
    } catch (error) {
        console.error("Error fetching trips:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// const getPastTrips = async (req, res) => {
//     try {
//         const { email } = req.query;

//         if (!email) {
//             return res.status(400).json({ message: "Email is required." });
//         }

//         // Get today's date without time (midnight)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         // Only fetch trips that ended before today
//         const bookings = await Booking.find({
//             email,
//             endDate: { $lt: today.toISOString().split("T")[0] }
//         }).select("tripId title bookedDate payment.grandTotal image");

//         const response = bookings.map(booking => ({
//             tripId: booking.tripId,
//             title: booking.title || "",
//             bookedDate: booking.bookedDate || "",
//             image: booking.image || "",
//             grandTotal: booking.payment.grandTotal || 0
//         }));

//         res.status(200).json({ pastPlans: response });
//     } catch (error) {
//         console.error("Error fetching past trips:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

const getPastTrips = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        // Fetch only trips with status COMPLETED or CANCELLED
        const bookings = await Booking.find({
            email,
            requestStatus: { $in: ["COMPLETED", "CANCELLED"] }
        }).select("tripId title duration startDate endDate isPaymentUpdated tripType _id requestStatus image");

        const response = bookings.map(booking => ({
            bookingId: booking._id,
            tripId: booking.tripId,
            title: booking.title || "",
            duration: booking.duration || "",
            startDate: booking.startDate || "",
            endDate: booking.endDate || "",
            paymentStatus: booking.isPaymentUpdated || false,
            tripType: booking.tripType || "PACKAGE",
            requestStatus: booking.requestStatus || "PENDING",
            image: booking.image
        }));

        res.status(200).json({ pastPlans: response });
    } catch (error) {
        console.error("Error fetching past trips:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const getMyTripDetails = async (req, res) => {
    const { email, tripId } = req.query;

    if (!email || !tripId) {
        return res.status(400).json({ message: "Email and TripId is required." });
    }
    try {
        const booking = await Booking.findOne({ email, tripId });
        if (!booking) {
            return res.status(404).json({ message: "Trip Details not found!" });
        }
        res.status(200).json({
            image: booking.image || "",
            title: booking.title || "",
            duration: booking.duration || "",
            startDate: booking.startDate || "",
            endDate: booking.endDate || "",
            name: booking.name || "",
            email: booking.email || "",
            phone: booking.phone || 0,
            payment: booking.payment
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ message: "Server error." });
    }
}


const getTripHistoryDetails = async (req, res) => {
    const { email, tripId } = req.query;

    if (!email || !tripId) {
        return res.status(400).json({ message: "Email and TripId is required." });
    }
    try {
        const booking = await Booking.findOne({ email, tripId });
        if (!booking) {
            return res.status(404).json({ message: "Trip history not found!" });
        }
        res.status(200).json({
            title: booking.title || "",
            duration: booking.duration || "",
            state: booking.state || "",
            adults: booking.adults || 0,
            children: booking.childrens || 0,
            startDate: booking.startDate || "",
            endDate: booking.endDate || "",
            grandTotal: booking.payment.grandTotal || 0,
            paymentStatus: booking.isPaymentPending || true
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ message: "Server error." });
    }
}

// const getUserTripStatics = async (req, res) => {
//     try {
//         const { email } = req.query;

//         if (!email) {
//             return res.status(400).json({ message: "Email is required." });
//         }

//         // Get today's date without time (midnight)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         // Only fetch trips starting today or in the future
//         const trips = await Booking.find({
//             email,
//             startDate: { $gte: today.toISOString().split("T")[0] }
//         }).countDocuments();

//         const history = await Booking.find({
//             email,
//             endDate: { $lt: today.toISOString().split("T")[0] }
//         }).countDocuments();

//         return res.status(200).json({ trips: trips, history: history });
//     } catch (error) {
//         console.error("Error while getting statics:", error);
//         res.status(500).json({ message: "Server error." });
//     }
// };

const getUserTripStatics = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        // Count only PAID trips
        const trips = await Booking.countDocuments({
            email,
            requestStatus: "PAID"
        });

        // Count only COMPLETED or CANCELLED trips
        const history = await Booking.countDocuments({
            email,
            requestStatus: { $in: ["COMPLETED", "CANCELLED"] }
        });

        return res.status(200).json({ trips, history });
    } catch (error) {
        console.error("Error while getting statics:", error);
        res.status(500).json({ message: "Server error." });
    }
};


const getApprovedBookingIds = async (req, res) => {
    const { email, tripId } = req.query;

    if (!email || !tripId) {
        return res.status(400).json({ message: "Email and TripId is required." });
    }
    try {
        const booking = await Booking.findOne({ email, tripId });
        if (!booking) {
            return res.status(404).json({ message: "Trip history not found!" });
        }
        res.status(200).json({
            phone: booking.phone || 0,
            id: booking._id || ""
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ message: "Server error." });
    }
}

const getBookingById = async (req, res) => {
  try {
    const { id } = req.query;

    // Validate ID format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format.",
      });
    }

    // Find booking by ID
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Error fetching booking by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error.",
      error: error.message,
    });
  }
};

module.exports = { createBooking, getMyPlans, deleteByEmailAndTripId, getMyTrips, getPastTrips, getMyTripDetails, getTripHistoryDetails, getUserTripStatics, getApprovedBookingIds,getBookingById };
