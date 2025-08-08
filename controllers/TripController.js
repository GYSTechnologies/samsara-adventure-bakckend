const TripItineraryModel = require('../models/TripItinerarySchema');
const FavoriteTripModel = require('../models/FavoriteTripSchema')
const cloudinary = require('../cloudinary');

createTrip = async (req, res) => {
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
      activities,
      startDate,
      endDate,
      duration,
      payment,
      itinerary,
      pickupDropLocation,
      isActive
    } = req.body;

    // Parse arrays sent as strings
    const overviewArray = JSON.parse(overview);
    const inclusionsArray = JSON.parse(inclusions);
    const exclusionsArray = JSON.parse(exclusions);
    const activitiesArray = JSON.parse(activities)
    const paymentObj = JSON.parse(payment);
    const itineraryArray = JSON.parse(itinerary);

    // Map images from req.files
    const mainImages = (req.files['images'] || []).map(file => file.path);

    // No image injection needed anymore
    const itineraryWithoutImages = itineraryArray.map(item => ({
      ...item
    }));


    const newTrip = new TripItineraryModel({
      tripType,
      title,
      state,
      description,
      images: mainImages,
      overview: overviewArray,
      inclusions: inclusionsArray,
      exclusions: exclusionsArray,
      activities: activitiesArray,
      category: category,
      isSessional: isSessional,
      payment: paymentObj,
      startDate,
      endDate,
      duration,
      itinerary: itineraryWithoutImages,
      pickupDropLocation: pickupDropLocation,
      isActive: isActive
    });

    const savedTrip = await newTrip.save();

    return res.status(201).json({
      message: 'Trip created successfully!'
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: 0,
      message: 'Failed to create trip',
      error: error.message
    });
  }
};

const deleteTripById = async (req, res) => {
  const { tripId } = req.params;

  try {
    const trip = await TripItineraryModel.findOne({ tripId });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
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
          console.error('Failed to delete Cloudinary image:', err.message);
        }
      });

      await Promise.all(deletionPromises);
    }

    // Delete the trip document
    await TripItineraryModel.deleteOne({ tripId });

    res.status(200).json({ message: 'Trip and images deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper to extract publicId from Cloudinary URL
function extractPublicId(imageUrl) {
  try {
    const urlParts = imageUrl.split('/');
    const fileNameWithExt = urlParts[urlParts.length - 1]; // e.g., abc123.jpg
    const folder = urlParts[urlParts.length - 2]; // e.g., trip_images
    const publicId = `${folder}/${fileNameWithExt.split('.')[0]}`; // trip_images/abc123
    return publicId;
  } catch (err) {
    console.error('Error extracting publicId:', err.message);
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
      const favorites = await FavoriteTripModel.find({ email: email }).select("tripId");
      favoriteTripIdsSet = new Set(favorites.map(f => f.tripId)); // O(1) lookup
    }

    // Step 2: Add isFavorite to each trip using set lookup
    const enrichedTrips = trips.map(trip => {
      return {
        ...trip.toObject(),
        isFavorite: favoriteTripIdsSet.has(trip.tripId) // O(1) check
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
      maxPrice
    } = req.query;

    const filter = {};

    // Basic filters
    if (state) filter.state = state;
    if (category) filter.category = category;
    if (type) filter.tripType = type;

    if (name) {
      filter.$or = [
        { title: { $regex: name, $options: 'i' } },
        { state: { $regex: name, $options: 'i' } },
        { category: { $regex: name, $options: 'i' } }
      ];
    }

    // Date filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Price filter (payment.subTotal)
    if (minPrice !== null && minPrice !== undefined && minPrice !== '' ||
      maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {

      const min = Number(minPrice);
      const max = Number(maxPrice);

      // Only apply if either one is a valid number
      if (!isNaN(min) || !isNaN(max)) {
        filter['payment.subTotal'] = {};
        if (!isNaN(min)) filter['payment.subTotal'].$gte = min;
        if (!isNaN(max)) filter['payment.subTotal'].$lte = max;
      }
    }

    // Sorting logic
    let sort = {};
    switch (sortBy) {
      case 'recent':
        sort.createdAt = -1;
        break;
      case 'asc':
        sort.title = 1;
        break;
      case 'desc':
        sort.title = -1;
        break;
      case 'price_asc':
        sort['payment.subTotal'] = 1;
        break;
      case 'price_desc':
        sort['payment.subTotal'] = -1;
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
      .select('-_id -__v');

    if (!trips || trips.length === 0) {
      return res.status(404).json({ message: "No trips found!" });
    }

    // Get favorite tripIds if email provided
    let favoriteTripIds = [];
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select('tripId -_id');
      favoriteTripIds = favorites.map(fav => fav.tripId);
    }

    // Add isFavorite to each trip
    const tripsWithFavorite = trips.map(trip => {
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
    const trip = await TripItineraryModel.findOne({ tripId }).select('-_id -__v');

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
      isFavorite
    };

    res.status(200).json({ trip: tripDetails });

  } catch (error) {
    console.error("Error fetching trip details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


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
        { title: { $regex: name, $options: 'i' } },
        { state: { $regex: name, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch required fields only
    const trips = await TripItineraryModel.find(filter)
      .select('tripId tripType state category payment.actualPrice payment.subTotal images isSessional')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Step 1: Get user's favorite trip IDs
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select('tripId -_id');
      favoriteTripIdsSet = new Set(favorites.map(f => f.tripId));
    }

    // Step 2: Format response with isFavorite flag and first image
    const formattedTrips = trips.map(trip => {
      const tripObj = trip.toObject();
      return {
        tripId: tripObj.tripId,
        tripType: tripObj.tripType,
        state: tripObj.state,
        category: tripObj.category,
        actualPrice: tripObj.payment.actualPrice,
        subTotal: tripObj.payment.subTotal,
        image: tripObj.images?.[0] || null,
        isFavorite: favoriteTripIdsSet.has(tripObj.tripId),
        isSessional: tripObj.isSessional
      };
    });

    res.status(200).json({ trips: formattedTrips });
  } catch (error) {
    console.error('Error fetching minimal trip details:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getStateTrips = async (req, res) => {
  try {
    const { state, sortBy = 'recent', page = 1, limit = 20 } = req.query;

    const filter = {};

    if (state && state !== 'null' && state !== '') {
      filter.state = state;
    }

    // Determine sort field
    let sort = {};
    switch (sortBy) {
      case 'price_asc':
        sort['payment.subTotal'] = 1;
        break;
      case 'price_desc':
        sort['payment.subTotal'] = -1;
        break;
      case 'title_asc':
        sort['title'] = 1;
        break;
      case 'title_desc':
        sort['title'] = -1;
        break;
      case 'recent':
      default:
        sort['createdAt'] = -1;
    }

    const skip = (page - 1) * limit;

    const trips = await TripItineraryModel.find(filter)
      .select('state payment.actualPrice payment.subTotal images startDate duration')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const formattedTrips = trips.map(trip => {
      const t = trip.toObject();
      return {
        state: t.state,
        actualPrice: t.payment.actualPrice,
        subTotal: t.payment.subTotal,
        image: t.images?.[0] || null,
        startDate: t.startDate,
        duration: t.duration
      };
    });

    res.status(200).json({ trips: formattedTrips });
  } catch (error) {
    console.error('Error fetching trip summaries by state:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getTripsByState = async (req, res) => {
  try {
    const {
      state,
      category,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      email,
      page = 1,
      limit = 10,
      isSessional,
      sortBy
    } = req.query;

    const filter = {};

    if (state) filter.state = state;
    if (category) filter.category = category;

    if (isSessional === 'true' || isSessional === true) {
      filter.isSessional = true;
    } else if (isSessional === 'false' || isSessional === false) {
      filter.isSessional = false;
    }

    // Date filters
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Price filters
    if (minPrice || maxPrice) {
      filter['payment.actualPrice'] = {};
      if (minPrice) filter['payment.actualPrice'].$gte = Number(minPrice);
      if (maxPrice) filter['payment.actualPrice'].$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;

    // Sorting
    let sortOption = { createdAt: -1 }; // Default: recent
    if (sortBy === 'price_asc') sortOption = { 'payment.actualPrice': 1 };
    else if (sortBy === 'price_desc') sortOption = { 'payment.actualPrice': -1 };
    else if (sortBy === 'duration') sortOption = { duration: 1 };

    // Get favorite trip IDs
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select('tripId -_id');
      favoriteTripIdsSet = new Set(favorites.map(f => f.tripId));
    }

    // Query trips
    const trips = await TripItineraryModel.find(filter)
      .select('tripId title images activities duration payment.actualPrice payment.subTotal tripType')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const formattedTrips = trips.map(trip => {
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
        tripType: tripObj.tripType
      };
    });

    res.status(200).json({ trips: formattedTrips });
  } catch (error) {
    console.error('Error fetching minimal trip details:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getPlanYourOwnTrips = async (req, res) => {
  try {
    const { startDate, endDate, email, page = 1, limit = 10 } = req.query;

    const filter = {
      tripType: 'CUSTOMIZED'
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
      .select('tripId title duration startDate images itinerary activities')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Step 2: Get user's favorite trip IDs
    let favoriteTripIdsSet = new Set();
    if (email) {
      const favorites = await FavoriteTripModel.find({ email }).select('tripId -_id');
      favoriteTripIdsSet = new Set(favorites.map(fav => fav.tripId));
    }

    // Step 3: Format result
    const formatted = trips.map(trip => {
      const tripObj = trip.toObject();
      const itineraryTitles = Array.isArray(tripObj.itinerary)
        ? tripObj.itinerary.map(item => item.title || item.name || '')
        : [];

      return {
        tripId: tripObj.tripId,
        title: tripObj.title,
        duration: tripObj.duration,
        image: tripObj.images?.[0] || null,
        itineraryTitles: itineraryTitles.filter(Boolean),
        activities: tripObj.activities || [],
        isFavorite: favoriteTripIdsSet.has(tripObj.tripId)
      };
    });

    res.status(200).json({ trips: formatted });
  } catch (error) {
    console.error('Error in getTripSummaryWithDateFilter:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const getTop3Images = (trip) => {
  return (Array.isArray(trip.images) ? trip.images.slice(0, 3) : []);
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
      const favorites = await FavoriteTripModel.find({ email }).select('tripId -_id');
      favoriteTripIdsSet = new Set(favorites.map(f => f.tripId));
    }

    // Format response
    const formatted = trips.map(trip => {
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
        tripType: tripObj.tripType
      };
    });

    res.status(200).json({ trips: formatted });
  } catch (error) {
    console.error("Error in getPackageTripsWith3Images:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { createTrip, getAllTrips, getTripsByFilter, getHomeTripDetails, getStateTrips, getTripsByState, getPlanYourOwnTrips, getUpcommingTrips, getTripDetailsById, deleteTripById };
