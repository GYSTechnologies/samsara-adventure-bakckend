const TripItineraryModel = require("../models/TripItinerarySchema");
const FavoriteTripModel = require("../models/FavoriteTripSchema");
const EventModel = require("../models/EventSchema");
const cloudinary = require("../cloudinary");
const Booking = require("../models/BookingSchema");
const TripItinerarySchema = require("../models/TripItinerarySchema");
// controllers/searchController.js

//search  Destination
const searchDestinations = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
    }

    // Search in states, titles, and tags
    const results = await TripItineraryModel.aggregate([
      {
        $match: {
          $or: [
            { state: { $regex: query, $options: "i" } },
            { title: { $regex: query, $options: "i" } },
            { tags: { $regex: query, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          state: 1,
          title: 1,
          images: 1,
          tripId: 1,
          tripType: 1,
        },
      },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// search Passengers
const searchPassengers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchRegex = new RegExp(q, "i");

    // 1. Find passengers matching search
    const passengers = await Booking.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { tripId: searchRegex },
      ],
    })
      .select("name email phone tripId")
      .limit(20);

    if (!passengers.length) {
      return res.status(200).json([]);
    }

    // 2. Extract unique tripIds
    const tripIds = [...new Set(passengers.map((b) => b.tripId))];

    // 3. Fetch trips by tripId (string field in TripItinerary)
    const trips = await TripItineraryModel.find({
      tripId: { $in: tripIds },
    }).select("tripId title tripType");

    // 4. Map trips by tripId for quick lookup
    const tripMap = {};
    trips.forEach((t) => {
      tripMap[t.tripId] = t;
    });

    // 5. Prepare final results
    const results = passengers.map((booking) => ({
      _id: booking._id,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      tripId: booking.tripId,
      tripTitle: tripMap[booking.tripId]?.title || "Unknown Trip",
      tripType: tripMap[booking.tripId]?.tripType || "UNKNOWN",
    }));

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error searching passengers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// const createTrip = async (req, res) => {
//   try {
//     const {
//       tripType,
//       title,
//       state,
//       description,
//       category,
//       isSessional, // sessional trip or not
//       overview,
//       inclusions,
//       exclusions,
//       tags,
//       activities,
//       startDate,
//       endDate,
//       duration,
//       payment,
//       totalSeats,
//       itinerary,
//       pickupDropLocation,
//       isActive,
//     } = req.body;

//     // Parse arrays sent as strings
//     const overviewArray = JSON.parse(overview);
//     const inclusionsArray = JSON.parse(inclusions);
//     const exclusionsArray = JSON.parse(exclusions);
//     const activitiesArray = JSON.parse(activities);
//     const paymentObj = JSON.parse(payment);
//     const itineraryArray = JSON.parse(itinerary);

//     // Map images from req.files
//     const mainImages = (req.files["images"] || []).map((file) => file.path);

//     // Get state image ONLY if it's a new state and image is uploaded
//     let stateImagePath = "";
//     if ((isNewState === 'true' || !stateExists) && req.files["stateImage"] && req.files["stateImage"][0]) {
//       stateImagePath = req.files["stateImage"][0].path;
//     } else if (stateExists) {
//       // Use existing state image if available
//       stateImagePath = stateExists.stateImage;
//     }

//     const newTrip = new TripItineraryModel({
//       tripType,
//       title,
//       state,
//       description,
//       images: mainImages,
//       overview: overviewArray,
//       inclusions: inclusionsArray,
//       exclusions: exclusionsArray,
//       activities: activitiesArray,
//       category: category,
//       isSessional: isSessional,
//       payment: paymentObj,
//       totalSeats: totalSeats,
//       startDate,
//       endDate,
//       duration,
//       tags: tags,
//       itinerary: itineraryWithoutImages,
//       pickupDropLocation: pickupDropLocation,
//       isActive: isActive,
//     });

//     const savedTrip = await newTrip.save();

//     return res.status(201).json({
//       message: "Trip created successfully!",
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(400).json({
//       success: 0,
//       message: "Failed to create trip",
//       error: error.message,
//     });
//   }
// };

const createTrip = async (req, res) => {
  try {
    const {
      tripType,
      title,
      state,
      description,
      category,
      isSessional, // sessional trip or not
      overview,
      inclusions,
      exclusions,
      tags,
      activities,
      startDate,
      endDate,
      duration,
      payment,
      totalSeats,
      itinerary,
      pickupDropLocation,
      isActive,
    } = req.body;

    // Safe parse helper
    const safeParse = (data, fallback) => {
      try {
        return data ? JSON.parse(data) : fallback;
      } catch {
        return fallback;
      }
    };

    // Parse arrays sent as strings safely
    const overviewArray = safeParse(overview, []);
    const inclusionsArray = safeParse(inclusions, []);
    const exclusionsArray = safeParse(exclusions, []);
    const activitiesArray = safeParse(activities, []);
    const paymentObj = safeParse(payment, {});
    const itineraryArray = safeParse(itinerary, []);

    // Map images from req.files
    const mainImages = (req.files?.["images"] || []).map((file) => file.path);

    // No image injection needed anymore
    const itineraryWithoutImages = itineraryArray.map((item) => ({
      ...item,
    }));

    const newTrip = new TripItineraryModel({
      tripType,
      title,
      state,
      description,
      images: mainImages,
      overview: overviewArray, // ✅ will always be [] if not sent
      inclusions: inclusionsArray,
      exclusions: exclusionsArray,
      activities: activitiesArray,
      category,
      isSessional,
      payment: paymentObj,
      totalSeats,
      startDate,
      endDate,
      duration,
      tags,
      itinerary: itineraryWithoutImages,
      pickupDropLocation,
      isActive,
    });

    await newTrip.save();

    return res.status(201).json({
      message: "Trip created successfully!",
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: 0,
      message: "Failed to create trip",
      error: error.message,
    });
  }
};

const updateTripStatus = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { isActive } = req.body;

    const trip = await TripItineraryModel.findOneAndUpdate(
      { tripId },
      { isActive },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.status(200).json({
      message: "Trip status updated successfully",
      isActive: trip.isActive,
    });
  } catch (error) {
    console.error("Error updating trip status:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getPackagesTrips = async (req, res) => {
  try {
    const trips = await TripItineraryModel.find({ tripType: "PACKAGE" }).select(
      "tripId title duration startDate endDate isActive payment.grandTotal images totalSeats tripType"
    );

    if (!trips || trips.length === 0) {
      return res.status(404).json({ message: "Package Trips not found." });
    }

    // Add booking count for each trip
    const tripsWithBookingCount = await Promise.all(
      trips.map(async (trip) => {
        const enrolledCount = await Booking.countDocuments({
          tripId: trip.tripId,
        });
        return {
          _id: trip._id,
          tripId: trip.tripId,
          title: trip.title,
          duration: trip.duration,
          startDate: trip.startDate,
          endDate: trip.endDate,
          isActive: trip.isActive,
          grandTotal: trip.payment?.grandTotal || 0,
          enrolledCount,
          images: trip.images || [],
          totalSeats: trip.totalSeats,
          tripType: trip.tripType,
        };
      })
    );

    return res.status(200).json(tripsWithBookingCount);
  } catch (error) {
    console.error("Error getting package trips:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getCustomizedTrips = async (req, res) => {
  try {
    const trips = await TripItineraryModel.find({
      tripType: "CUSTOMIZED",
    }).select(
      "tripId title duration startDate endDate isActive payment.grandTotal images totalSeats"
    );

    if (!trips || trips.length === 0) {
      return res.status(404).json({ message: "CUSTOMIZED Trips not found." });
    }

    // Add booking count for each trip
    const tripsWithBookingCount = await Promise.all(
      trips.map(async (trip) => {
        const enrolledCount = await Booking.countDocuments({
          tripId: trip.tripId,
        });
        return {
          _id: trip._id,
          tripId: trip.tripId,
          title: trip.title,
          duration: trip.duration,
          startDate: trip.startDate,
          endDate: trip.endDate,
          isActive: trip.isActive,
          grandTotal: trip.payment?.grandTotal || 0,
          enrolledCount,
          images: trip.images || [],
          totalSeats: trip.totalSeats,
        };
      })
    );

    return res.status(200).json(tripsWithBookingCount);
  } catch (error) {
    console.error("Error getting package trips:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// get passengers for a specific trip
const getTripPassengers = async (req, res) => {
  try {
    const { tripId } = req.params;

    const passengers = await Booking.find({ tripId })
      .select("name email phone _id") // Only basic info for listing
      .sort({ createdAt: -1 });

    if (!passengers || passengers.length === 0) {
      return res
        .status(404)
        .json({ message: "No passengers found for this trip" });
    }

    return res.status(200).json(passengers);
  } catch (error) {
    console.error("Error fetching passengers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
// //get enrolled user name
const getEnrolledUsers = async (req, res) => {
  try {
    const { tripId } = req.params;

    const bookings = await Booking.find({ tripId })
      .select("name email payment paymentDate requestStatus")
      .sort({ paymentDate: -1 });

    if (!bookings || bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No enrollments found for this trip" });
    }

    // Format the response
    const enrolledUsers = bookings.map((booking) => ({
      name: booking.name || "N/A",
      email: booking.email || "N/A",
      paymentAmount: booking.payment?.grandTotal || 0,
      paymentStatus: booking.payment?.razorpay_payment_id
        ? "completed"
        : "pending",
      paymentDate: booking.payment?.paymentDate || booking.paymentDate || "N/A",
      bookingStatus: booking.requestStatus || "N/A",
    }));

    return res.status(200).json(enrolledUsers);
  } catch (error) {
    console.error("Error getting enrolled users:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
// ================== GET PLAN OWN TRIPS ==================
const getPlanOwnTrips = async (req, res) => {
  try {
    // 1. Fetch all bookings
    const bookings = await Booking.find({ tripType: "CUSTOMIZED" }).select(
      "name title duration startDate endDate payment.grandTotal total_members tripId"
    );

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found" });
    }

    // 2. For each booking, fetch related trip's isActive + images
    const results = await Promise.all(
      bookings.map(async (booking) => {
        const trip = await TripItineraryModel.findOne({
          tripId: booking.tripId,
        }).select("isActive images _id"); // ✅ ADDED _id FOR EDIT FUNCTIONALITY

        return {
          _id: trip ? trip._id : null, // ✅ ADDED FOR EDIT FUNCTIONALITY
          name: booking.name,
          title: booking.title,
          duration: booking.duration,
          startDate: booking.startDate,
          endDate: booking.endDate,
          total_members: booking.total_members,
          grandTotal: booking.payment?.grandTotal || 0,
          isActive: trip ? trip.isActive : false,
          images: trip ? trip.images : [], // ✅ CHANGED TO images (plural)
        };
      })
    );

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching booking with trip status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ================== GET SINGLE TRIP ==================
const getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await TripItineraryModel.findById(id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Return exactly the same structure as create form expects
    const responseData = {
      _id: trip._id,
      tripType: trip.tripType,
      title: trip.title,
      state: trip.state,
      description: trip.description,
      category: trip.category,
      isSessional: trip.isSessional,
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
      duration: trip.duration,
      payment: trip.payment || {
        actualPrice: 0,
        grandTotal: 0,
        activities: 0,
        insurance: 0,
        taxation: 0,
        subTotal: 0,
      },
      totalSeats: trip.totalSeats,
      itinerary: trip.itinerary || [
        { dayNumber: "", title: "", description: "", points: [""] },
      ],
      pickupDropLocation: trip.pickupDropLocation,
      isActive: trip.isActive,
      images: trip.images || [],
      existingImages: trip.images || [],
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error getting trip:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================== UPDATE TRIP ==================
const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the trip first
    const existingTrip = await TripItineraryModel.findById(id);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Extract all fields from request body
    const {
      tripType,
      title,
      state,
      description,
      category,
      isSessional,
      overview,
      inclusions,
      exclusions,
      activities,
      tags,
      startDate,
      endDate,
      duration,
      payment,
      totalSeats,
      itinerary,
      pickupDropLocation,
      isActive,
      existingImages, // This is now coming from the frontend
    } = req.body;

    // Parse arrays sent as strings
    const overviewArray = overview
      ? JSON.parse(overview)
      : existingTrip.overview;
    const inclusionsArray = inclusions
      ? JSON.parse(inclusions)
      : existingTrip.inclusions;
    const exclusionsArray = exclusions
      ? JSON.parse(exclusions)
      : existingTrip.exclusions;
    const activitiesArray = activities
      ? JSON.parse(activities)
      : existingTrip.activities;
    const paymentObj = payment ? JSON.parse(payment) : existingTrip.payment;
    const itineraryArray = itinerary
      ? JSON.parse(itinerary)
      : existingTrip.itinerary;
    const tagsArray = tags ? JSON.parse(tags) : existingTrip.tags;

    // Handle existing images - parse the string from frontend
    let finalImages = [];

    if (existingImages) {
      try {
        const parsedExistingImages =
          typeof existingImages === "string"
            ? JSON.parse(existingImages)
            : existingImages;
        finalImages = [...parsedExistingImages];
      } catch (parseError) {
        console.error("Error parsing existingImages:", parseError);
        finalImages = existingTrip.images || [];
      }
    } else {
      finalImages = [...existingTrip.images];
    }

    // Add new uploaded images
    if (req.files) {
      // Handle both single file and multiple files
      const uploadedFiles = Array.isArray(req.files) ? req.files : [req.files];
      const newImages = uploadedFiles.map((file) => file.path);
      finalImages = [...finalImages, ...newImages];
    }

    // Remove image injection from itinerary
    const itineraryWithoutImages = itineraryArray.map((item) => ({
      dayNumber: item.dayNumber,
      title: item.title,
      description: item.description,
      points: item.points || [],
    }));

    // Prepare update data
    const updateData = {
      tripType: tripType || existingTrip.tripType,
      title: title || existingTrip.title,
      state: state || existingTrip.state,
      description: description || existingTrip.description,
      category: category || existingTrip.category,
      isSessional:
        isSessional !== undefined ? isSessional : existingTrip.isSessional,
      overview: overviewArray,
      inclusions: inclusionsArray,
      exclusions: exclusionsArray,
      activities: activitiesArray,
      tags: tagsArray,
      startDate: startDate || existingTrip.startDate,
      endDate: endDate || existingTrip.endDate,
      duration: duration || existingTrip.duration,
      payment: paymentObj,
      totalSeats: totalSeats || existingTrip.totalSeats,
      itinerary: itineraryWithoutImages,
      pickupDropLocation: pickupDropLocation || existingTrip.pickupDropLocation,
      isActive: isActive !== undefined ? isActive : existingTrip.isActive,
      images: finalImages, // This now contains the correct combination
    };

    // Update the trip
    const updatedTrip = await TripItineraryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Trip updated successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Error updating trip:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteTripById = async (req, res) => {
  const { tripId } = req.params;

  try {
    const trip = await TripItineraryModel.findOne({ tripId });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Delete images from Cloudinary
    if (trip.images && trip.images.length > 0) {
      const deletionPromises = trip.images.map(async (imageUrl) => {
        try {
          // Extract public_id from the URL
          const publicId = extractPublicId(imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (err) {
          console.error("Failed to delete Cloudinary image:", err.message);
        }
      });

      await Promise.all(deletionPromises);
    }

    // Delete the trip document
    await TripItineraryModel.deleteOne({ tripId });

    res.status(200).json({ message: "Trip and images deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper to extract publicId from Cloudinary URL
function extractPublicId(imageUrl) {
  try {
    const urlParts = imageUrl.split("/");
    const fileNameWithExt = urlParts[urlParts.length - 1]; // e.g., abc123.jpg
    const folder = urlParts[urlParts.length - 2]; // e.g., trip_images
    const publicId = `${folder}/${fileNameWithExt.split(".")[0]}`; // trip_images/abc123
    return publicId;
  } catch (err) {
    console.error("Error extracting publicId:", err.message);
    return null;
  }
}

const getAllTrips = async (req, res) => {
  const { email } = req.params;

  try {
    const trips = await TripItineraryModel.find().sort({ createdAt: -1 });

    // Step 1: Get favorite trip IDs for the user
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email: email }).select(
        "tripId"
      );
      favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId)); // O(1) lookup
    }

    // Step 2: Add isFavorite to each trip using set lookup
    const enrichedTrips = trips.map((trip) => {
      return {
        ...trip.toObject(),
        isFavorite: favoriteTripIdsSet.has(trip.tripId), // O(1) check
      };
    });

    res.status(200).json({ trips: enrichedTrips });
  } catch (err) {
    console.error("Error fetching trips", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getTripsByFilter = async (req, res) => {
  try {
    const {
      state,
      category, // BEACH,MOUNTAIN,GREENLY,DESERT
      type,
      name,
      sortBy,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      email,
      minPrice,
      maxPrice,
    } = req.query;

    const filter = {};

    // Basic filters
    if (state) filter.state = state;
    if (category) filter.category = category;
    if (type) filter.tripType = type;

    if (name) {
      filter.$or = [
        { title: { $regex: name, $options: "i" } },
        { state: { $regex: name, $options: "i" } },
        { category: { $regex: name, $options: "i" } },
      ];
    }

    // Date filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Price filter (payment.subTotal)
    if (
      (minPrice !== null && minPrice !== undefined && minPrice !== "") ||
      (maxPrice !== null && maxPrice !== undefined && maxPrice !== "")
    ) {
      const min = Number(minPrice);
      const max = Number(maxPrice);

      // Only apply if either one is a valid number
      if (!isNaN(min) || !isNaN(max)) {
        filter["payment.subTotal"] = {};
        if (!isNaN(min)) filter["payment.subTotal"].$gte = min;
        if (!isNaN(max)) filter["payment.subTotal"].$lte = max;
      }
    }

    // Sorting logic
    let sort = {};
    switch (sortBy) {
      case "recent":
        sort.createdAt = -1;
        break;
      case "asc":
        sort.title = 1;
        break;
      case "desc":
        sort.title = -1;
        break;
      case "price_asc":
        sort["payment.subTotal"] = 1;
        break;
      case "price_desc":
        sort["payment.subTotal"] = -1;
        break;
      default:
        sort.createdAt = -1;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch trips from DB
    const trips = await TripItineraryModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select("-_id -__v");

    if (!trips || trips.length === 0) {
      return res.status(404).json({ message: "No trips found!" });
    }

    // Get favorite tripIds if email provided
    let favoriteTripIds = [];
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIds = favorites.map((fav) => fav.tripId);
    }

    // Add isFavorite to each trip
    const tripsWithFavorite = trips.map((trip) => {
      const tripObj = trip.toObject();
      tripObj.isFavorite = favoriteTripIds.includes(trip.tripId);
      return tripObj;
    });

    return res.status(200).json({ trips: tripsWithFavorite });
  } catch (error) {
    console.error("Error while retrieving trips.", error);
    return res.status(500).json({ message: "Error while retrieving trips." });
  }
};

const getTripDetailsById = async (req, res) => {
  try {
    const { tripId, email } = req.query; // optional

    // Fetch trip by tripId
    const trip = await TripItineraryModel.findOne({ tripId }).select(
      "-_id -__v"
    );

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if trip is favorite for given email
    let isFavorite = false;
    if (email) {
      const fav = await FavoriteTripModel.findOne({ email, tripId });
      isFavorite = !!fav;
    }

    const tripDetails = {
      ...trip.toObject(),
      isFavorite,
    };

    res.status(200).json({ trip: tripDetails });
  } catch (error) {
    console.error("Error fetching trip details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Top Destination
const getHomeTripDetails = async (req, res) => {
  try {
    const { name, category, email, page = 1, limit = 10 } = req.query;

    const filter = { isSessional: true };

    // Apply filters
    if (category) {
      filter.category = category;
    }

    if (name) {
      filter.$or = [
        { title: { $regex: name, $options: "i" } },
        { state: { $regex: name, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch required fields only
    const trips = await TripItineraryModel.find(filter)
      .select(
        "tripId title payment.actualPrice payment.subTotal images isSessional description tags state duration"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Step 1: Get user's favorite trip IDs
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId));
    }

    // Step 2: Format response with isFavorite flag and first image
    const formattedTrips = trips.map((trip) => {
      const tripObj = trip.toObject();
      return {
        tripId: tripObj.tripId,
        title: tripObj.title,
        state: tripObj.state,
        actualPrice: tripObj.payment.actualPrice,
        subTotal: tripObj.payment.subTotal,
        image: tripObj.images?.[0] || null,
        isFavorite: favoriteTripIdsSet.has(tripObj.tripId),
        isSessional: tripObj.isSessional,
        description: tripObj.description,
        tags: tripObj.tags,
        duration: tripObj.duration,
      };
    });

    res.status(200).json({ trips: formattedTrips });
  } catch (error) {
    console.error("Error fetching minimal trip details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getStateTrips = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const filter = {};

    // Step 1: Get all trips (no sort yet)
    const trips = await TripItineraryModel.find(filter).select(
      "state payment.actualPrice payment.subTotal images startDate duration description tags"
    );

    // Step 2: Get unique by state (first occurrence only)
    const seenStates = new Set();
    const uniqueTrips = trips.filter((trip) => {
      if (seenStates.has(trip.state)) return false;
      seenStates.add(trip.state);
      return true;
    });

    // Step 3: Sort unique trips by price ascending
    uniqueTrips.sort((a, b) => a.payment.subTotal - b.payment.subTotal);

    // Step 4: Pagination AFTER deduplication
    const startIndex = (page - 1) * limit;
    const paginatedTrips = uniqueTrips.slice(
      startIndex,
      startIndex + Number(limit)
    );

    // Step 5: Format response
    const formattedTrips = paginatedTrips.map((t) => ({
      state: t.state,
      actualPrice: t.payment.actualPrice,
      subTotal: t.payment.subTotal,
      image: t.images?.[0] || null,
      startDate: t.startDate,
      duration: t.duration,
      description: t.description,
      tags: t.tags,
    }));

    res.status(200).json({
      total: uniqueTrips.length, // total unique trips
      page: Number(page),
      limit: Number(limit),
      trips: formattedTrips,
    });
  } catch (error) {
    console.error("Error fetching unique state trips sorted by price:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Specific state wise or sessional
const getTripsByState = async (req, res) => {
  try {
    const {
      state,
      category,
      tripType,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      email,
      page = 1,
      limit = 10,
      isSessional,
      sortBy,
    } = req.query;

    const filter = {
      isActive: true,
    };

    // State filter (ignore if empty)
    if (state && state.trim() !== "") {
      filter.state = { $regex: `^${state}$`, $options: "i" };
    }

    // Category filter (ignore if empty)
    if (category && category.trim() !== "") {
      filter.category = { $regex: `^${category}$`, $options: "i" };
    }

    // Trip type filter (PACKAGE, CUSTOMIZED) — only apply if provided
    if (tripType && tripType.trim() !== "") {
      filter.tripType = { $regex: `^${tripType}$`, $options: "i" };
    }

    // Boolean filter
    if (isSessional === "true" || isSessional === true) {
      filter.isSessional = true;
    }

    // Date filters (only if valid date)
    if (startDate && !isNaN(new Date(startDate).getTime())) {
      filter.startDate = filter.startDate || {};
      filter.startDate.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(new Date(endDate).getTime())) {
      filter.startDate = filter.startDate || {};
      filter.startDate.$lte = new Date(endDate);
    }

    // Price filters
    if (minPrice || maxPrice) {
      filter["payment.subTotal"] = {};
      if (minPrice) filter["payment.subTotal"].$gte = Number(minPrice);
      if (maxPrice) filter["payment.subTotal"].$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;

    // Sorting
    let sortOption = { createdAt: -1 }; // Default
    if (sortBy === "price_asc") sortOption = { "payment.subTotal": 1 };
    else if (sortBy === "price_desc") sortOption = { "payment.subTotal": -1 };
    else if (sortBy === "duration") sortOption = { duration: 1 };
    else if (sortBy === "recent") sortOption = { createdAt: -1 };
    // Get favorite trip IDs
    let favoriteTripIdsSet = new Set();
    if (email && email.trim() !== "") {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId));
    }

    // Query trips
    const trips = await TripItineraryModel.find(filter)
      .select(
        "tripId title images activities duration payment.actualPrice payment.subTotal tripType"
      )
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const formattedTrips = trips.map((trip) => {
      const tripObj = trip.toObject();
      return {
        tripId: tripObj.tripId,
        title: tripObj.title,
        image: tripObj.images?.[0] || null,
        actualPrice: tripObj.payment?.actualPrice || 0,
        subTotal: tripObj.payment?.subTotal || 0,
        duration: tripObj.duration,
        activities: tripObj.activities || [],
        isFavorite: favoriteTripIdsSet.has(tripObj.tripId),
        tripType: tripObj.tripType,
      };
    });

    res.status(200).json({ trips: formattedTrips });
  } catch (error) {
    console.error("Error fetching minimal trip details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// const getTripsByState = async (req, res) => {
//   try {
//     const {
//       state,
//       category,
//       tripType,
//       startDate,
//       endDate,
//       minPrice,
//       maxPrice,
//       email,
//       page = 1,
//       limit = 10,
//       isSessional,
//       sortBy,
//     } = req.query;

//     const filter = { isActive: true };

//     //  Auto cutoff filter
//     const today = new Date();
//     const cutoffDate = new Date();
//     cutoffDate.setDate(today.getDate() + 3);

//     //cart automatic hide 3 days before the  trip starting date
//     filter.endDate = { $gte: cutoffDate };

//     if (state && state.trim() !== "") {
//       filter.state = { $regex: `^${state}$`, $options: "i" };
//     }
//     if (category && category.trim() !== "") {
//       filter.category = { $regex: `^${category}$`, $options: "i" };
//     }
//     if (tripType && tripType.trim() !== "") {
//       filter.tripType = { $regex: `^${tripType}$`, $options: "i" };
//     }
//     if (isSessional === "true" || isSessional === true) {
//       filter.isSessional = true;
//     }

//     if (startDate && !isNaN(new Date(startDate).getTime())) {
//       filter.startDate = filter.startDate || {};
//       filter.startDate.$gte = new Date(startDate);
//     }
//     if (endDate && !isNaN(new Date(endDate).getTime())) {
//       filter.startDate = filter.startDate || {};
//       filter.startDate.$lte = new Date(endDate);
//     }

//     if (minPrice || maxPrice) {
//       filter["payment.subTotal"] = {};
//       if (minPrice) filter["payment.subTotal"].$gte = Number(minPrice);
//       if (maxPrice) filter["payment.subTotal"].$lte = Number(maxPrice);
//     }

//     const skip = (page - 1) * limit;

//     let sortOption = { createdAt: -1 };
//     if (sortBy === "price_asc") sortOption = { "payment.subTotal": 1 };
//     else if (sortBy === "price_desc") sortOption = { "payment.subTotal": -1 };
//     else if (sortBy === "duration") sortOption = { duration: 1 };
//     else if (sortBy === "recent") sortOption = { createdAt: -1 };

//     let favoriteTripIdsSet = new Set();
//     if (email && email.trim() !== "") {
//       const favorites = await FavoriteTripModel.find({ email }).select("tripId -_id");
//       favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId));
//     }

//     const trips = await TripItineraryModel.find(filter)
//       .select("tripId title images activities duration payment.actualPrice payment.subTotal tripType endDate")
//       .sort(sortOption)
//       .skip(skip)
//       .limit(Number(limit));

//     const formattedTrips = trips.map((trip) => {
//       const tripObj = trip.toObject();
//       return {
//         tripId: tripObj.tripId,
//         title: tripObj.title,
//         image: tripObj.images?.[0] || null,
//         actualPrice: tripObj.payment?.actualPrice || 0,
//         subTotal: tripObj.payment?.subTotal || 0,
//         duration: tripObj.duration,
//         activities: tripObj.activities || [],
//         isFavorite: favoriteTripIdsSet.has(tripObj.tripId),
//         tripType: tripObj.tripType,
//         endDate: tripObj.endDate,
//       };
//     });

//     res.status(200).json({ trips: formattedTrips });
//   } catch (error) {
//     console.error("Error fetching minimal trip details:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const getPlanYourOwnTrips = async (req, res) => {
  try {
    const { startDate, endDate, email, page = 1, limit = 10 } = req.query;

    const filter = {
      tripType: "CUSTOMIZED",
    };

    if (startDate) {
      filter.startDate = { $gte: new Date(startDate) };
    }

    if (endDate) {
      filter.startDate = { ...filter.startDate, $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;

    // Step 1: Get matching trips
    const trips = await TripItineraryModel.find(filter)
      .select("tripId title duration startDate images itinerary activities")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Step 2: Get user's favorite trip IDs
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIdsSet = new Set(favorites.map((fav) => fav.tripId));
    }

    // Step 3: Format result
    const formatted = trips.map((trip) => {
      const tripObj = trip.toObject();
      const itineraryTitles = Array.isArray(tripObj.itinerary)
        ? tripObj.itinerary.map((item) => item.title || item.name || "")
        : [];

      return {
        tripId: tripObj.tripId,
        title: tripObj.title,
        duration: tripObj.duration,
        image: tripObj.images?.[0] || null,
        itineraryTitles: itineraryTitles.filter(Boolean),
        activities: tripObj.activities || [],
        isFavorite: favoriteTripIdsSet.has(tripObj.tripId),
      };
    });

    res.status(200).json({ trips: formatted });
  } catch (error) {
    console.error("Error in getTripSummaryWithDateFilter:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getTop3Images = (trip) => {
  return Array.isArray(trip.images) ? trip.images.slice(0, 3) : [];
};

const getUpcommingTrips = async (req, res) => {
  try {
    const { email, type, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (type) filter.tripType = type;

    const skip = (page - 1) * limit;

    // Fetch trips
    const trips = await TripItineraryModel.find(filter)
      .sort({ createdAt: -1 }) // most recent
      .skip(skip)
      .limit(Number(limit));

    // Get favorites
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId));
    }

    // Format response
    const formatted = trips.map((trip) => {
      const tripObj = trip.toObject();
      return {
        tripId: tripObj.tripId,
        state: tripObj.state || "",
        duration: tripObj.duration,
        images: getTop3Images(tripObj),
        actualPrice: tripObj.payment?.actualPrice || 0,
        subTotal: tripObj.payment?.subTotal || 0,
        startDate: tripObj.startDate,
        isFavorite: favoriteTripIdsSet.has(tripObj.tripId),
        tripType: tripObj.tripType,
      };
    });

    res.status(200).json({ trips: formatted });
  } catch (error) {
    console.error("Error in getPackageTripsWith3Images:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET All Trips sorted by highest discount
const getHomeRecommendedTrips = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Fetch only PACKAGE trips with pagination
    const trips = await TripItineraryModel.find(
      { tripType: "PACKAGE" },
      {
        title: 1,
        state: 1,
        images: 1,
        payment: 1,
      }
    )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Map to return only required fields
    const tripsFiltered = trips.map((trip) => ({
      title: trip.title,
      state: trip.state,
      image: trip.images && trip.images.length > 0 ? trip.images[0] : null, // first image
      actualPrice: trip.payment?.actualPrice || 0,
      subTotal: trip.payment?.subTotal || 0,
    }));

    // Total count for pagination
    const totalRecords = await TripItineraryModel.countDocuments({ tripType: "PACKAGE" });
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages,
      totalRecords,
      count: tripsFiltered.length,
      data: tripsFiltered,
    });
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// const getTripToExplore = async (req, res) => {
//   try {
//     let { page = 1, limit = 10 } = req.query;
//     page = parseInt(page);
//     limit = parseInt(limit);
//     const skip = (page - 1) * limit;

//     // Fetch trips with selected fields
//     const trips = await TripItineraryModel.find(
//       {}, // you can add filters if needed
//       {
//         tripType: 1,
//         tripId: 1,
//         title: 1,
//         activities: 1,
//         payment: 1,
//         images: 1,
//         duration: 1
//       }
//     )
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     // Map to return only required fields
//     const tripsSummary = trips.map((trip) => ({
//       tripId: trip.tripId,
//       tripType: trip.tripType,
//       title: trip.title,
//       activities: trip.activities || [],
//       subTotal: trip.payment?.subTotal || 0,
//       duration: trip.duration,
//       image: trip.images && trip.images.length > 0 ? trip.images[0] : null,
//     }));

//     // Total count for pagination
//     const totalRecords = await TripItineraryModel.countDocuments({});
//     const totalPages = Math.ceil(totalRecords / limit);

//     res.status(200).json({
//       success: true,
//       page,
//       limit,
//       totalPages,
//       totalRecords,
//       count: tripsSummary.length,
//       data: tripsSummary,
//     });
//   } catch (error) {
//     console.error("Error fetching trips summary:", error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };
const getTripToExplore = async (req, res) => {
  try {
    let { page = 1, limit = 10, email } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Fetch trips with selected fields
    const trips = await TripItineraryModel.find(
      {}, // you can add filters if needed
      {
        tripType: 1,
        tripId: 1,
        title: 1,
        activities: 1,
        payment: 1,
        images: 1,
        duration: 1,
      }
    )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get favorites if email is provided
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId));
    }

    // Map to return only required fields + isFavorite
    const tripsSummary = trips.map((trip) => ({
      tripId: trip.tripId,
      tripType: trip.tripType,
      title: trip.title,
      activities: trip.activities || [],
      subTotal: trip.payment?.subTotal || 0,
      duration: trip.duration,
      image: trip.images && trip.images.length > 0 ? trip.images[0] : null,
      isFavorite: favoriteTripIdsSet.has(trip.tripId),
    }));

    // Total count for pagination
    const totalRecords = await TripItineraryModel.countDocuments({});
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages,
      totalRecords,
      count: tripsSummary.length,
      data: tripsSummary,
    });
  } catch (error) {
    console.error("Error fetching trips summary:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// GET Trips (always sorted by newest)
const getHomeStateTrips = async (req, res) => {
  try {
    let { page = 1, limit = 10, state, email } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (state) filter.state = state;

    // Fetch trips (always sorted by newest)
    const trips = await TripItineraryModel.find(filter, {
      tripId: 1,
      title: 1,
      description: 1,
      tripType: 1,
      images: 1,
      payment: 1,
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get favorites
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select(
        "tripId -_id"
      );
      favoriteTripIdsSet = new Set(favorites.map((f) => f.tripId));
    }

    // Format response
    const formattedTrips = trips.map((trip) => ({
      tripId: trip.tripId,
      title: trip.title,
      description: trip.description || "",
      tripType: trip.tripType,
      subTotal: trip.payment?.subTotal || 0,
      image: trip.images?.length > 0 ? trip.images[0] : null,
      isFavorite: favoriteTripIdsSet.has(trip.tripId),
    }));

    // Pagination
    const totalRecords = await TripItineraryModel.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages,
      totalRecords,
      count: formattedTrips.length,
      data: formattedTrips,
    });
  } catch (error) {
    console.error("Error fetching trips summary:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


module.exports = {
  createTrip,
  searchDestinations,
  getAllTrips,
  getTripsByFilter,
  getHomeTripDetails,
  getStateTrips,
  getTripsByState,
  getPlanYourOwnTrips,
  getUpcommingTrips,
  getTripDetailsById,
  deleteTripById,
  getPackagesTrips,
  getPlanOwnTrips,
  updateTripStatus,
  getTripById,
  updateTrip,
  getCustomizedTrips,
  getEnrolledUsers,
  getTripPassengers,
  searchPassengers,
  getHomeRecommendedTrips,
  getTripToExplore,
  getHomeStateTrips
  // checkState,
};
