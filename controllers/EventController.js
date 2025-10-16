const EventModel = require('../models/EventModel')
const EventBooking = require('../models/EventBookingModel')

const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            location,
            date
        } = req.body;
        const image = req.file ? req.file.path : null;

        const event = new EventModel({
            title: title,
            description: description,
            price: price,
            image: image,
            location: location,
            date: date
        });

        await event.save();
        return res.status(201).json({
            message: 'Event created successfully!'
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

const getAllEvents = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        // Calculate how many docs to skip
        const skip = (page - 1) * limit;

        // Fetch paginated events
        const events = await EventModel
            .find()
            .select("eventId title coverImage date location shortDescription price")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            events
        });

    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getAllEventPageEvents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};

        // Exact match on title OR location (no regex)
        if (search.trim() !== "") {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ];
        }

        // Fetch paginated events
        const events = await EventModel
            .find(filter)
            .select("eventId title coverImage date location price shortDescription")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Remove duplicates by eventId
        // const uniqueEvents = [];
        // const seen = new Set();

        // for (const event of events) {
        //     if (!seen.has(event.eventId)) {
        //         seen.add(event.eventId);
        //         uniqueEvents.push(event);
        //     }
        // }

        return res.status(200).json({ events: events });

    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};


const getEventByEventId = async (req, res) => {
    try {
        const { eventId } = req.query;
        const event = await EventModel.findOne({ _id: eventId });
        if (!event) {
            return res.status(404).json({ message: "Event not found!" })
        }
        return res.status(200).json({
            event
        });
    } catch (err) {
        console.error("Error fetching event by id:", err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

module.exports = { createEvent, getAllEvents, getEventByEventId, getAllEventPageEvents};