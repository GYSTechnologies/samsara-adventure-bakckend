const FavoriteTrip = require('../models/FavoriteTripSchema');
const TripItineraryModel = require('../models/TripItinerarySchema');
const Booking = require('../models/BookingSchema')

const toggleFavoriteTrip = async (req, res) => {
  try {
    const { email, tripId } = req.body;

    if (!email || !tripId) {
      return res.status(400).json({ message: 'Email and tripId are required' });
    }

    const existing = await FavoriteTrip.findOne({ email, tripId });
    if (existing) {
      // Remove from favorites
      await FavoriteTrip.deleteOne({ email, tripId });
      return res.status(200).json({
        message: 'Removed from favorites',
        isFavorite: false,
        tripId: tripId
      });
    } else {
      // Add to favorites
      await FavoriteTrip.create({ email, tripId });
      return res.status(201).json({
        message: 'Added to favorites',
        isFavorite: true,
        tripId: tripId
      });
    }
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(409).json({ message: 'Already marked as favorite' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Failed to toggle favorite' });
  }
};

const getFavoriteTripsByUser = async (req, res) => {
  try {
    const { email } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get all favorite trip IDs for the user
    const favorites = await FavoriteTrip.find({ email }).select("tripId");
    const favoriteTripIds = favorites.map(f => f.tripId);

    // Fetch paginated trips with selected fields
    const trips = await TripItineraryModel.find({ tripId: { $in: favoriteTripIds } })
      .select('tripId title images payment duration activities tripType')
      .skip(skip)
      .limit(limit);

    // Format the response
    const formattedTrips = trips.map(trip => {
      const tripObj = trip.toObject();
      return {
        tripId: tripObj.tripId,
        title: tripObj.title,
        image: tripObj.images?.[0] || null,
        duration: tripObj.duration,
        activities: tripObj.activities || [],
        payment: tripObj.payment || {},
        tripType: tripObj.tripType
      };
    });

    res.status(200).json({ trips: formattedTrips });

  } catch (error) {
    console.error("Error fetching favorite trips", error);
    res.status(500).json({ success: false, message: 'Error fetching favorite trips', error: error.message });
  }
};
module.exports = { toggleFavoriteTrip, getFavoriteTripsByUser };