const TripItineraryModel = require('../models/TripItinerarySchema');
const FavoriteTripModel = require('../models/FavoriteTripSchema')

createTrip = async (req, res) => {
  try {
    const {
      tripType,
      title,
      state,
      description,
      category,
      overview,
      inclusions,
      exclusions,
      activities,
      startDate,
      endDate,
      duration,
      payment,
      itinerary
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

    const itineraryWithImages = itineraryArray.map((item, index) => {
      const imgField = `itinerary[${index}][image]`;
      const imageFile = req.files[imgField]?.[0];

      return {
        ...item,
        image: imageFile?.path || '', // required field in schema
      };
    });

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
      payment: paymentObj,
      startDate,
      endDate,
      duration,
      itinerary: itineraryWithImages,
    });

    const savedTrip = await newTrip.save();

    return res.status(201).json({
      success: 1,
      message: 'Trip created successfully!',
      trip: savedTrip
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

// const getTripsByFilter = async (req, res) => {
//   try {
//     const {
//       state,
//       category,
//       type,
//       name,
//       sortBy,
//       startDate,
//       endDate,
//       page = 1,
//       limit = 20,
//       email
//     } = req.query;

//     const filter = {};

//     // Apply filters
//     if (state) filter.state = state;
//     if (category) filter.category = category;
//     if (type) filter.tripType = type;
//     if (name) filter.title = { $regex: name, $options: 'i' };
//     if (startDate || endDate) {
//       filter.startDate = {};
//       if (startDate) filter.startDate.$gte = new Date(startDate);
//       if (endDate) filter.startDate.$lte = new Date(endDate);
//     }

//     // Sort logic
//     let sort = {};
//     if (sortBy === 'recent') sort.createdAt = -1;
//     else if (sortBy === 'asc') sort.title = 1;
//     else if (sortBy === 'desc') sort.title = -1;

//     // Pagination
//     const skip = (page - 1) * limit;

//     // Get trips
//     const trips = await TripItineraryModel.find(filter)
//       .sort(sort)
//       .skip(skip)
//       .limit(Number(limit))
//       .select('-_id -__v');

//     if (!trips || trips.length === 0) {
//       return res.status(404).json({ message: "No trips found!" });
//     }

//     // If userEmail provided, get user's favorite tripIds
//     let favoriteTripIds = [];
//     if (email) {
//       const favorites = await FavoriteTripModel.find({ email }).select('tripId -_id');
//       favoriteTripIds = favorites.map(fav => fav.tripId);
//     }

//     // Add isFavorite to each trip
//     const tripsWithFavorite = trips.map(trip => {
//       const tripObj = trip.toObject(); // convert mongoose doc to plain object
//       tripObj.isFavorite = favoriteTripIds.includes(trip.tripId);
//       return tripObj;
//     });

//     return res.status(200).json({ trips: tripsWithFavorite });

//   } catch (error) {
//     console.error("Error while retrieving trips.", error);
//     return res.status(500).json({ message: "Error while retrieving trips." });
//   }
// };

const getTripsByFilter = async (req, res) => {
  try {
    const {
      state,
      category,
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
    if (name) filter.title = { $regex: name, $options: 'i' };

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


module.exports = { createTrip, getAllTrips, getTripsByFilter };
