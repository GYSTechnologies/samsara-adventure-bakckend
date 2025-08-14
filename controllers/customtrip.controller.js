const Booking = require("../models/BookingSchema")
// Helper function for status messages
function getStatusMessage(status) {
  const messages = {
    PENDING: "Your request is pending approval",
    APPROVED: "Your custom trip has been approved",
    REJECTED: "Your request has been rejected",
    COMPLETED: "Your trip has been completed"
  };
  return messages[status] || "Status unknown";
}

// @desc Check request status by email
exports.checkRequestStatus = async (req, res) => {
  try {
    const { email, tripId } = req.query;
    
    if (!email || !tripId) {
      return res.status(400).json({ error: "Email and tripId are required" });
    }

    const existingRequest = await Booking.findOne({ 
      email,
      tripId,
      tripType: "CUSTOMIZED"
    });

    if (!existingRequest) {
      return res.json({ 
        status: "NEW_USER",
        message: "No existing request found"
      });
    }

    return res.json({
      status: existingRequest.requestStatus || "PENDING",
      // tripData: existingRequest,
      message: getStatusMessage(existingRequest.requestStatus)
    });

  } catch (error) {
    console.error("Error checking request status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc Submit new custom trip request
exports.submitCustomRequest = async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    const requiredFields = [
      'email', 'phone', 'tripId', 'startDate', 
      'adults', 'childrens', 'pickupLocation'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Check for existing request
    const existingRequest = await Booking.findOne({ 
      email: formData.email, 
      tripId: formData.tripId 
    });
    
    if (existingRequest) {
      return res.status(400).json({ 
        error: "You already have a request for this trip",
        existingStatus: existingRequest.requestStatus
      });
    }

    // Create new request
    const newRequest = new Booking({
      ...formData,
      name: formData.fullName || "Not provided",
      total_members: formData.adults + formData.childrens,
      tripType: "CUSTOMIZED",
      requestStatus: "PENDING",
      bookedDate: new Date().toISOString(),
      changes: formData.specialRequests || "No special requests",
      current_location: formData.pickupLocation
    });

    await newRequest.save();

    res.json({ 
      success: true,
      requestId: newRequest._id,
      status: newRequest.requestStatus,
      message: "Custom trip request submitted successfully"
    });

  } catch (error) {
    console.error("Error submitting custom request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc Update custom trip request (Admin only)
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
      request
    });

  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
