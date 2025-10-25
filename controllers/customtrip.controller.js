const { sendUserCustomTripEmail, sendAdminCustomTripEmail } = require("../config/email");
const Booking = require("../models/BookingSchema");

function getStatusMessage(status) {
  const messages = {
    PENDING: "Your request is pending approval",
    APPROVED: "Your custom trip has been approved",
    REJECTED: "Your request has been rejected",
    COMPLETED: "Your trip has been completed",
    PAID: "Payment completed! View your plans", // ✅ Add this
    CONFIRMED: "Booking confirmed! View your plans",
  };
  return messages[status] || "Status unknown";
}

exports.checkRequestStatus = async (req, res) => {
  try {
    const { email, tripId } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingRequest = await Booking.findOne({
      email: email.toLowerCase().trim(),
      tripType: "CUSTOMIZED",
      tripId: tripId.trim(),
    }).sort({ createdAt: -1 });

    if (!existingRequest) {
      return res.json({
        status: "NEW_USER",
        message: "No existing request found for this trip",
      });
    }

    return res.json({
      status: existingRequest.requestStatus || "PENDING",
      enquiryId: existingRequest._id,
      message: getStatusMessage(existingRequest.requestStatus),
      // Add this to help UI determine what to show
      isPaid:
        existingRequest.requestStatus === "PAID" ||
        existingRequest.requestStatus === "CONFIRMED",
    });
  } catch (error) {
    console.error("Error checking request status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//  Submit new custom trip request
exports.submitCustomRequest = async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    const requiredFields = [
      "email",
      "phone",
      "tripId",
      "startDate",
      "adults",
      "current_location", // Consistent naming
      "persons"
    ];

    const missingFields = requiredFields.filter((field) => !formData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Check for existing request
    const existingRequest = await Booking.findOne({
      email: formData.email,
      tripId: formData.tripId,
    });

    if (existingRequest) {
      return res.status(400).json({
        error: "You already have a request for this trip",
        existingStatus: existingRequest.requestStatus,
      });
    }

    // Create new request
     const newRequest = new Booking({
      ...formData,
      name: formData.fullName || "Not provided",
      total_members: formData.adults + (formData.childrens || 0),
      tripType: "CUSTOMIZED",
      requestStatus: "PENDING",
      bookedDate: new Date().toISOString(),
      changes: formData.specialRequests || "No special requests",

      iteneraryChanges: formData.iteneraryChanges || "Not provided",
      current_location: formData.pickupLocation || formData.current_location,
      persons: formData.persons,
      //  Force booleans
      travelWithPet: formData.travelWithPet === true,
      decoration: formData.decoration === true,
      photographer: formData.photographer === true, 
      translator: formData.translator === true,

      title: formData.title || "",
      startDate: formData.startDate || "",
      endDate: formData.endDate || "",
      image: formData.image || "",
      duration: formData.duration || "",
      isPaymentPending: formData.isPaymentPending !== false, // default true
    });

    await newRequest.save();

        // Email send
    await Promise.all([
      sendAdminCustomTripEmail(formData),
      sendUserCustomTripEmail(formData)
    ]);
    res.json({
      success: true,
      requestId: newRequest._id,
      status: newRequest.requestStatus,
      message: "Custom trip request submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting custom request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Update custom trip request (Admin only)
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentDetails, adminNotes } = req.body;

    const request = await Booking.findById(id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.requestStatus = status;

    if (status === "APPROVED" && paymentDetails) {
      request.payment = paymentDetails;
      request.isPaymentPending = true;
      request.isPaymentUpdated = false;
    }

    if (adminNotes) {
      request.adminNotes = adminNotes;
    }

    await request.save();

    res.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      request,
    });
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
