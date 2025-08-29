const Event = require("../models/EventModel");
const EventBooking = require("../models/EventBookingModel");
const { razorpay, verifyPaymentSignature } = require("../config/razorpay");

// Helper function to process files
const processFiles = (req) => {
  const result = {
    coverImage: null,
    scheduleItems: {},
    includedItems: {},
  };

  if (!req.files || req.files.length === 0) return result;

  req.files.forEach((file) => {
    const fieldName = file.fieldname;

    if (fieldName === "coverImage") {
      result.coverImage = file.path;
    } else if (fieldName.startsWith("scheduleItems")) {
      // Extract index from field name like 'scheduleItems[0][image]'
      const match = fieldName.match(/scheduleItems\[(\d+)\]\[image\]/);
      if (match) {
        const index = parseInt(match[1]);
        result.scheduleItems[index] = { image: file.path };
      }
    } else if (fieldName.startsWith("includedItems")) {
      // Extract index from field name like 'includedItems[0][image]'
      const match = fieldName.match(/includedItems\[(\d+)\]\[image\]/);
      if (match) {
        const index = parseInt(match[1]);
        result.includedItems[index] = { image: file.path };
      }
    }
  });

  return result;
};

// Create event (Admin)
exports.createEvent = async (req, res) => {
  try {
    const eventData = req.body;

    // Process uploaded files using the corrected function
    const uploadedFiles = processFiles(req);

    // Handle cover image - REQUIRED for new events
    if (uploadedFiles.coverImage) {
      eventData.coverImage = uploadedFiles.coverImage;
    } else {
      return res.status(400).json({ message: "Cover image is required" });
    }

    // Parse array fields if they are strings
    const arrayFields = [
      "highlights",
      "inclusions",
      "exclusions",
      "termsConditions",
      "scheduleItems",
      "includedItems",
    ];

    arrayFields.forEach((field) => {
      if (typeof eventData[field] === "string") {
        try {
          eventData[field] = JSON.parse(eventData[field]);
        } catch (e) {
          // If not valid JSON, try splitting by comma
          eventData[field] = eventData[field]
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item !== "");
        }
      }
    });

    // Process schedule items with images
    if (eventData.scheduleItems && Array.isArray(eventData.scheduleItems)) {
      eventData.scheduleItems = eventData.scheduleItems.map((item, index) => {
        if (
          uploadedFiles.scheduleItems[index] &&
          uploadedFiles.scheduleItems[index].image
        ) {
          return {
            ...item,
            image: uploadedFiles.scheduleItems[index].image,
          };
        }
        return item;
      });
    }

    // Process included items with images
    if (eventData.includedItems && Array.isArray(eventData.includedItems)) {
      eventData.includedItems = eventData.includedItems.map((item, index) => {
        if (
          uploadedFiles.includedItems[index] &&
          uploadedFiles.includedItems[index].image
        ) {
          return {
            ...item,
            image: uploadedFiles.includedItems[index].image,
          };
        }
        return item;
      });
    }

    // Convert string values to proper types
    if (eventData.price) eventData.price = parseFloat(eventData.price);
    if (eventData.capacity) eventData.capacity = parseInt(eventData.capacity);
    if (eventData.bookedSeats) {
      eventData.bookedSeats = parseInt(eventData.bookedSeats);
    }

    const event = new Event(eventData);
    const savedEvent = await event.save();

    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(400).json({ message: error.message });
  }
};

// Update event (Admin)
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventData = req.body;

    // Find existing event first
    const existingEvent = await Event.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Process uploaded files
    const uploadedFiles = processFiles(req);

    // Handle cover image - not required for updates, only if new one is uploaded
    if (uploadedFiles.coverImage) {
      eventData.coverImage = uploadedFiles.coverImage;
    } else if (eventData.removeCoverImage === "true") {
      eventData.coverImage = null;
    }
    // If no cover image change, keep the existing one by not setting eventData.coverImage

    // Parse array fields if they are strings
    const arrayFields = [
      "highlights",
      "inclusions",
      "exclusions",
      "termsConditions",
      "scheduleItems",
      "includedItems",
    ];

    arrayFields.forEach((field) => {
      if (typeof eventData[field] === "string") {
        try {
          eventData[field] = JSON.parse(eventData[field]);
        } catch (e) {
          eventData[field] = eventData[field]
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item !== "");
        }
      }
    });

    // Process schedule items with images
    if (eventData.scheduleItems && Array.isArray(eventData.scheduleItems)) {
      eventData.scheduleItems = eventData.scheduleItems.map((item, index) => {
        // Use new image if uploaded
        if (
          uploadedFiles.scheduleItems[index] &&
          uploadedFiles.scheduleItems[index].image
        ) {
          return {
            ...item,
            image: uploadedFiles.scheduleItems[index].image,
          };
        }
        // Keep existing image if available and not explicitly removed
        else if (
          existingEvent.scheduleItems[index] &&
          existingEvent.scheduleItems[index].image &&
          item.removeImage !== "true"
        ) {
          return {
            ...item,
            image: existingEvent.scheduleItems[index].image,
          };
        }
        // No image
        return { ...item, image: null };
      });
    }

    // Process included items with images
    if (eventData.includedItems && Array.isArray(eventData.includedItems)) {
      eventData.includedItems = eventData.includedItems.map((item, index) => {
        // Use new image if uploaded
        if (
          uploadedFiles.includedItems[index] &&
          uploadedFiles.includedItems[index].image
        ) {
          return {
            ...item,
            image: uploadedFiles.includedItems[index].image,
          };
        }
        // Keep existing image if available and not explicitly removed
        else if (
          existingEvent.includedItems[index] &&
          existingEvent.includedItems[index].image &&
          item.removeImage !== "true"
        ) {
          return {
            ...item,
            image: existingEvent.includedItems[index].image,
          };
        }
        // No image
        return { ...item, image: null };
      });
    }

    // Convert string values to proper types
    if (eventData.price) eventData.price = parseFloat(eventData.price);
    if (eventData.capacity) eventData.capacity = parseInt(eventData.capacity);
    if (eventData.bookedSeats) {
      eventData.bookedSeats = parseInt(eventData.bookedSeats);
    }

    const updatedEvent = await Event.findByIdAndUpdate(eventId, eventData, {
      new: true,
      runValidators: true,
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(400).json({ message: error.message });
  }
};

// Get all events (Public)
exports.getAllEvents = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;

    let filter = { status: "published" };
    if (category) filter.category = category;

    const events = await Event.find(filter)
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCartEvent = async (req, res) => {
  try {
    // only select required fields
    const events = await Event.find(
      {},
      "coverImage shortDescription scheduleItems.time"
    );

    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching events",
      error: err.message,
    });
  }
};

// Get single event (Public)
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Delete event (Admin)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Razorpay order for event booking
exports.createEventBookingOrder = async (req, res) => {
  try {

    const { eventId, tickets, contactInfo } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status !== "published") {
      return res
        .status(400)
        .json({ message: "Event is not available for booking" });
    }

    const adults = tickets?.adults || 0;
    const children = tickets?.children || 0;
    const totalTickets = adults + children;

    if (totalTickets <= 0) {
      return res.status(400).json({ message: "Invalid ticket counts" });
    }

    if (event.bookedSeats + totalTickets > event.capacity) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    const totalAmount = adults * event.price + children * event.price * 0.7;
    const amountInPaise = Math.round(totalAmount * 100);

    // Reserve seats atomically
    const reservedEvent = await Event.findOneAndUpdate(
      { _id: eventId, bookedSeats: { $lte: event.capacity - totalTickets } },
      { $inc: { bookedSeats: totalTickets } },
      { new: true }
    );

    if (!reservedEvent) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    // --- IMPORTANT: short receipt to satisfy Razorpay <= 40 chars ---
    // Format: evt_<last8ofEventId>_<last6ofTimestamp>  -> typically well under 40 chars
    const shortReceipt = `evt_${eventId.toString().slice(-8)}_${Date.now()
      .toString()
      .slice(-6)}`;

    let razorpayOrder;
    try {
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: shortReceipt, // <-- short receipt here
        notes: {
          eventId: eventId.toString(),
          userId: req.user._id.toString(),
          tickets: JSON.stringify(tickets),
          contactInfo: JSON.stringify(contactInfo),
        },
      };

      razorpayOrder = await razorpay.orders.create(options);
    } catch (err) {
      // rollback reserved seats if razorpay order creation fails
      await Event.findByIdAndUpdate(eventId, {
        $inc: { bookedSeats: -totalTickets },
      });
      console.error("Razorpay order creation failed:", err);
      // send error detail for debugging (do not reveal secrets in prod)
      const errMsg =
        err?.error?.description ||
        err?.message ||
        "Failed to create payment order";
      return res.status(500).json({ message: errMsg });
    }

    // Create temporary booking with pending status
    const booking = new EventBooking({
      event: eventId,
      user: req.user._id,
      tickets,
      totalAmount,
      contactInfo,
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
      paymentStatus: "pending",
    });

    await booking.save();

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      bookingId: booking._id,
      key: process.env.RAZORPAY_KEY_ID,
      // optional: return used receipt for traceability
      receipt: shortReceipt,
    });
  } catch (error) {
    console.error("createEventBookingOrder error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } =
      req.body;

    // Basic validation
    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !bookingId
    ) {
      return res
        .status(400)
        .json({ message: "Missing required verification fields" });
    }

    // verify signature
    const isValidSignature = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    // find booking
    const booking = await EventBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // if signature invalid -> mark booking failed and release reserved seats
    if (!isValidSignature) {
      // if booking is still pending, mark failed and release seats
      if (booking.paymentStatus === "pending" || booking.status === "pending") {
        booking.paymentStatus = "failed";
        booking.status = "failed";
        await booking.save();

        // release seats (safe decrement)
        const totalTickets =
          (booking.tickets?.adults || 0) + (booking.tickets?.children || 0);
        if (totalTickets > 0) {
          await Event.findByIdAndUpdate(booking.event, {
            $inc: { bookedSeats: -totalTickets },
          });
        }
      }

      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Ensure razorpayOrderId matches booking
    if (booking.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ message: "Order ID mismatch" });
    }

    // If already paid, return success (idempotency)
    if (booking.paymentStatus === "paid") {
      return res.json({ message: "Already paid", booking });
    }

    // mark booking as paid (note: DO NOT increment event.bookedSeats again - it was already reserved)
    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature;
    booking.paymentConfirmedAt = new Date();
    await booking.save();

    // (Optional) send confirmation email
    // try {
    //   const event = await Event.findById(booking.event);
    //   await transporter.sendMail({
    //     from: `"Samsara Adventures" <${process.env.EMAIL}>`,
    //     to: booking.contactInfo?.email || booking.contactInfo?.contact || booking.user?.email,
    //     subject: "Your Event Booking Confirmation",
    //     html: `<p>Booking confirmed for ${event?.title || "your event"}.</p><p>Booking id: ${booking._id}</p>`,
    //   });
    // } catch (err) {
    //   console.warn("Email send failed:", err);
    // }

    res.json({ message: "Payment verified and booking confirmed", booking });
  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await EventBooking.find({ user: req.user._id })
      .populate({
        path: "event",
        model: "Event",
        select: "title date location price coverImage organizer",
      })
      .sort({ bookingDate: -1 });

    return res.json({ bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Request cancellation
exports.requestCancellation = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;

    const booking = await EventBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Only confirmed bookings can be cancelled" });
    }

    booking.status = "cancellation_requested";
    booking.cancellationReason = reason;
    booking.cancellationRequestDate = new Date();
    await booking.save();

    res.json({ message: "Cancellation request submitted for admin approval" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all bookings for admin
exports.getAllBookings = async (req, res) => {
  try {
    const { eventId, status, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (eventId) filter.event = eventId;
    if (status) filter.status = status;

    const bookings = await EventBooking.find(filter)
      .populate("event")
      .populate("user", "name email")
      .sort({ bookingDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EventBooking.countDocuments(filter);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin approve cancellation and process refund
exports.approveCancellation = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await EventBooking.findById(bookingId).populate("event");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "cancellation_requested") {
      return res
        .status(400)
        .json({ message: "No cancellation request pending" });
    }

    // Process refund via Razorpay
    const refundAmount = Math.round(booking.totalAmount * 100);
    const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
      amount: refundAmount,
    });

    // Update booking status
    booking.status = "cancelled";
    booking.paymentStatus = "refunded";
    booking.refundAmount = booking.totalAmount;
    booking.razorpayRefundId = refund.id;
    booking.cancellationApprovedDate = new Date();
    await booking.save();

    // Release booked seats
    const event = await Event.findById(booking.event);
    const totalTickets = booking.tickets.adults + booking.tickets.children;
    event.bookedSeats = Math.max(0, event.bookedSeats - totalTickets);
    await event.save();

    res.json({
      message: "Cancellation approved and refund processed",
      refundId: refund.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get events for admin
exports.getAdminEvents = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) filter.status = status;

    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
