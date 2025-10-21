const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: true, // you can remove this if image is optional
        },
        active: {
            type: Boolean,
            required: true,
            default: true
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true, // adds createdAt & updatedAt automatically
    }
);

module.exports = mongoose.model("Category", CategorySchema);