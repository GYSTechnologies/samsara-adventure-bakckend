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
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const favorites = await FavoriteTrip.find({ email }).select('tripId');
    const favoriteTripIds = favorites.map((f) => f.tripId);

    if (favoriteTripIds.length === 0) {
      return res.status(200).json({ success: true, trips: [] });
    }

    const trips = await TripItineraryModel.find({ tripId: { $in: favoriteTripIds } })
      .select('tripId title images payment duration activities tripType state');

    const formattedTrips = trips.map((trip) => {
      const t = trip.toObject();
      const primaryImage = Array.isArray(t.images) && t.images.length > 0 ? t.images[0] : null;
      const price =
        t.payment?.subTotal ??
        t.payment?.actualPrice ??
        t.payment?.grandTotal ??
        0;

      return {
        tripId: t.tripId,
        title: t.title,
        image: primaryImage,
        duration: t.duration,
        activities: t.activities || [],
        price,
        payment: t.payment || {},
        tripType: t.tripType || 'CUSTOMIZED',
        state: t.state || 'Unknown',
      };
    });

    res.status(200).json({ success: true, trips: formattedTrips });
  } catch (error) {
    console.error('Error fetching favorite trips', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorite trips',
      error: error.message,
    });
  }
};
module.exports = { toggleFavoriteTrip, getFavoriteTripsByUser };