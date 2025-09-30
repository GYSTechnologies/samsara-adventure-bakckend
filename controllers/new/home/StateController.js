const dotenv = require('dotenv');
dotenv.config();
const cloudinary = require("../../../cloudinary");

const State = require("../../../models/new/home/StateSchema");

// CREATE State
exports.createState = async (req, res) => {
    try {
        const { state } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Image is required" });
        }

        // Upload file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "states",
        });

        const newState = new State({
            state,
            image: { url: result.secure_url, public_id: result.public_id },
        });

        await newState.save();

        res.status(201).json({
            success: true,
            message: "State created successfully",
            data: newState,
        });
    } catch (error) {
        console.error("Error creating state:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET ALL States
// exports.getAllStates = async (req, res) => {
//     try {
//         const states = await State.find().sort({ createdAt: -1 });

//         res.status(200).json({
//             success: true,
//             count: states.length,
//             data: states,
//         });
//     } catch (error) {
//         console.error("Error fetching states:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };
exports.getAllStates = async (req, res) => {
    try {
        // page and limit from query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        // total documents count
        const totalStates = await State.countDocuments();

        // fetch only state and image fields
        const states = await State.find({}, { state: 1, image: 1 })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: states.length,
            data: states,
        });
    } catch (error) {
        console.error("Error fetching states:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// UPDATE State
exports.updateState = async (req, res) => {
    try {
        const { id } = req.query;
        const { state } = req.body;
        let updateData = {};

        if (state) updateData.state = state;

        if (req.file) {
            // Upload new image
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "states",
            });

            // Find old state to delete old image
            const existingState = await State.findById(id);
            if (existingState && existingState.image.public_id) {
                await cloudinary.uploader.destroy(existingState.image.public_id);
            }

            updateData.image = {
                url: result.secure_url,
                public_id: result.public_id,
            };
        }

        const updatedState = await State.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedState) {
            return res.status(404).json({ success: false, message: "State not found" });
        }

        res.status(200).json({
            success: true,
            message: "State updated successfully",
            data: updatedState,
        });
    } catch (error) {
        console.error("Error updating state:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// DELETE State
exports.deleteState = async (req, res) => {
    try {
        const { id } = req.query;

        const state = await State.findById(id);
        if (!state) {
            return res.status(404).json({ success: false, message: "State not found" });
        }

        // delete from Cloudinary
        try {
            const publicId = extractPublicId(state.image.url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (err) {
            console.error("Failed to delete image:", err.message);
        }

        // delete from DB
        await State.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "State deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting state:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

function extractPublicId(imageUrl) {
    try {
        const urlParts = imageUrl.split("/");
        const fileNameWithExt = urlParts[urlParts.length - 1];
        const folder = urlParts[urlParts.length - 2];
        const publicId = `${folder}/${fileNameWithExt.split(".")[0]}`;
        return publicId;
    } catch (err) {
        console.error("Error extracting publicId:", err.message);
        return null;
    }
}