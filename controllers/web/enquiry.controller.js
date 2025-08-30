const Booking = require("../../models/BookingSchema");
const TripItinerary = require("../../models/TripItinerarySchema");

const getCustomEnquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    // Build filter object
    const filter = { tripType: "CUSTOMIZED" };

    if (status && status !== "all") {
      filter.requestStatus = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { tripId: { $regex: search, $options: "i" } },
      ];
    }

    const enquiries = await Booking.find(filter)
      .populate("customItinerary")
      .populate("tripId", "title") 
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      enquiries,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const enquiry = await Booking.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      enquiry,
    });
  } catch (error) {
    console.error("Error fetching enquiry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, changes, iteneraryChanges, meetDate, pickupAndDrop } =
      req.body;

    const enquiry = await Booking.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }
    // ✅ SECURITY CHECK: PREVENT UPDATES IF STATUS IS PAID
    if (enquiry.requestStatus === "PAID") {
      return res.status(403).json({
        success: false,
        message: "Cannot update enquiry after payment has been made",
      });
    }

    // Update fields
    if (status) enquiry.requestStatus = status;
    if (changes) enquiry.changes = changes;
    if (iteneraryChanges) enquiry.iteneraryChanges = iteneraryChanges;
    if (meetDate) enquiry.meetDate = meetDate;
    if (pickupAndDrop) enquiry.pickupAndDrop = pickupAndDrop;

    await enquiry.save();

    res.status(200).json({
      success: true,
      message: "Enquiry updated successfully",
      enquiry,
    });
  } catch (error) {
    console.error("Error updating enquiry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// In your backend createCustomItinerary function
const createCustomItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const itineraryData = req.body;

    // ✅ VALIDATE PAYMENT DATA
    const payment = itineraryData.payment || {};
    const subTotal = parseFloat(payment.subTotal) || 0;
    const activities = parseFloat(payment.activities) || 0;
    const insurance = parseFloat(payment.insurance) || 0;
    const taxation = parseFloat(payment.taxation) || 0;

    // Calculate correct grandTotal
    const grandTotal = subTotal + activities + insurance + taxation;

    const enquiry = await Booking.findById(id);

    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    // ✅ SECURITY CHECK: PREVENT UPDATES IF STATUS IS PAID
    if (enquiry.requestStatus === "PAID") {
      return res.status(403).json({
        success: false,
        message: "Cannot update enquiry after payment has been made",
      });
    }

    const updatedEnquiry = await Booking.findByIdAndUpdate(
      id,
      {
        customItinerary: {
          ...itineraryData,
          payment: {
            ...payment,
            grandTotal: grandTotal, // ✅ Use calculated grandTotal
            actualPrice: Math.max(
              parseFloat(payment.actualPrice) || 0,
              grandTotal
            ),
          },
        },
        hasCustomItinerary: true,
        requestStatus: "APPROVED",
      },
      { new: true }
    );

    res.status(200).json({
      message: "Custom itinerary saved successfully",
      enquiry: updatedEnquiry,
    });
  } catch (error) {
    console.error("Error saving custom itinerary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTripDetailsById = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await TripItinerary.findOne({ tripId: tripId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // ✅ RETURN EXACTLY THE SAME FORMATTED DATA AS getTripById
    const responseData = {
      _id: trip._id,
      tripId: trip.tripId, // ✅ ADD THIS FIELD
      tripType: trip.tripType,
      title: trip.title,
      state: trip.state,
      description: trip.description,
      category: trip.category || [""],
      isSessional: trip.isSessional || false,
      overview: trip.overview || [""],
      inclusions: trip.inclusions || [""],
      exclusions: trip.exclusions || [""],
      activities: trip.activities || [""],
      tags: trip.tags || [""],
      startDate: trip.startDate
        ? new Date(trip.startDate).toISOString().split("T")[0]
        : "",
      endDate: trip.endDate
        ? new Date(trip.endDate).toISOString().split("T")[0]
        : "",
      duration: trip.duration || "",
      payment: trip.payment || {
        actualPrice: 0,
        grandTotal: 0,
        activities: 0,
        insurance: 0,
        taxation: 0,
        subTotal: 0,
      },
      totalSeats: trip.totalSeats || "",
      itinerary: trip.itinerary || [
        { dayNumber: "", title: "", description: "", points: [""] },
      ],
      pickupDropLocation: trip.pickupDropLocation || "",
      isActive: trip.isActive !== undefined ? trip.isActive : true,
      images: trip.images || [],
      existingImages: trip.images || [],
    };

    res.status(200).json({
      success: true,
      trip: responseData, // ✅ FORMATTED DATA RETURN KARO
    });
  } catch (error) {
    console.error("Error fetching trip details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//   try {
//     const { enquiryId, email } = req.params;

//     // Find the booking/enquiry
//     const booking = await Booking.findOne({
//       _id: enquiryId,
//       email: email
//     });

//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     if (!booking.hasCustomItinerary || !booking.customItinerary) {
//       return res.status(404).json({ message: "Custom itinerary not found" });
//     }

//     // Return the custom itinerary data
//     res.status(200).json({
//       success: true,
//       customItinerary: booking.customItinerary,
//       bookingStatus: booking.requestStatus
//     });

//   } catch (error) {
//     console.error("Error fetching custom itinerary:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
// ✅ Add this function to your controller
const getCustomItineraryForPayment = async (req, res) => {
  try {
    const { enquiryId, email } = req.params;

    // Find the booking/enquiry
    const booking = await Booking.findOne({
      _id: enquiryId,
      email: email,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!booking.hasCustomItinerary || !booking.customItinerary) {
      return res.status(404).json({ message: "Custom itinerary not found" });
    }

    // Return the custom itinerary data
    res.status(200).json({
      success: true,
      customItinerary: booking.customItinerary,
      bookingStatus: booking.requestStatus,
    });
  } catch (error) {
    console.error("Error fetching custom itinerary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getCustomEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  createCustomItinerary,
  getTripDetailsById,
  getCustomItineraryForPayment,
};
