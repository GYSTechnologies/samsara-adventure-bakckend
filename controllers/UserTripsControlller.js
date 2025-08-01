const FavoriteTrip = require('../models/FavoriteTripSchema');
const TripItineraryModel = require('../models/TripItinerarySchema');

// const toggleFavoriteTrip = async (req, res) => {
//     try {
//         const { email, tripId } = req.body;

//         const existing = await FavoriteTrip.findOne({ email, tripId });

//         if (existing) {
//             // Already favorite — remove it
//             await FavoriteTrip.deleteOne({ email, tripId });
//             return res.status(200).json({
//                 message: 'Removed from favorites',
//                 isFavorite: false
//             });
//         } else {
//             // Not favorite yet — add it
//             const favorite = await FavoriteTrip.create({ email, tripId });
//             return res.status(201).json({
//                 message: 'Added to favorites',
//                 isFavorite: true,
//             });
//         }

//     } catch (error) {
//         return res.status(500).json({
//             message: 'Failed to toggle favorite',
//         });
//     }
// };
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

// const getFavoriteTripsByUser = async (req, res) => {
//     try {
//         const { email } = req.params;

//         const favorites = await FavoriteTrip.find({ email: email }).select('-_id -__v');

//         const trips = await TripItineraryModel.find({ tripId: { $in: favorites.map(f => f.tripId) } }).select('-_id -__v');

//         if (!trips) {
//             return res.status(404).json({ message: "Trips not found!" });
//         }
//         res.status(200).json({ trips });
//     } catch (error) {
//         res.status(500).json({ success: false, message: 'Error fetching favorite trips', error: error.message });
//     }
// };

const getFavoriteTripsByUser = async (req, res) => {
    try {
        const { email } = req.params;

        // Get all favorite entries for this user
        const favorites = await FavoriteTrip.find({ email }).select("tripId");

        const favoriteTripIds = favorites.map(f => f.tripId);

        // Fetch trips that are in the user's favorite list
        const trips = await TripItineraryModel.find({ tripId: { $in: favoriteTripIds } }).select('-_id -__v');

        // Inject isFavorite = true into each trip
        const enrichedTrips = trips.map(trip => {
            return {
                ...trip.toObject(),
                isFavorite: true
            };
        });

        res.status(200).json({ trips: enrichedTrips });

    } catch (error) {
        console.error("Error fetching favorite trips", error);
        res.status(500).json({ success: false, message: 'Error fetching favorite trips', error: error.message });
    }
};


module.exports = { toggleFavoriteTrip, getFavoriteTripsByUser };