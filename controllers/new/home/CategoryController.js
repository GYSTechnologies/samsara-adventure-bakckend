const dotenv = require('dotenv');
dotenv.config();
const cloudinary = require("../../../cloudinary");

const Category = require("../../../models/new/home/CategorySchema");

// CREATE Category
exports.createCategory = async (req, res) => {
    try {
        const { category } = req.body;
        const image = req.file ? req.file.path : null; // multer/cloudinary parser gives path/url

        if (!category || !image) {
            return res.status(400).json({
                success: false,
                message: "Category name and image are required",
            });
        }

        const newCategory = new Category({ category, image });
        await newCategory.save();

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: newCategory,
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET ALL Categories
// exports.getAllCategories = async (req, res) => {
//     try {
//         const categories = await Category.find().sort({ createdAt: -1 });

//         res.status(200).json({
//             success: true,
//             count: categories.length,
//             data: categories,
//         });
//     } catch (error) {
//         console.error("Error fetching categories:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };

exports.getAllCategories = async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        // Fetch categories with pagination and sort by newest first
        const categories = await Category.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Total count for pagination
        const totalRecords = await Category.countDocuments();
        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            success: true,
            // page,
            // limit,
            // totalPages,
            // totalRecords,
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


// UPDATE Category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.body;
        const { category } = req.body;
        const image = req.file ? req.file.path : undefined; // only update if new file uploaded

        const updateData = {};
        if (category) updateData.category = category;
        if (image) updateData.image = image;

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res
                .status(404)
                .json({ success: false, message: "Category not found" });
        }

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// DELETE Category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.query;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // delete from Cloudinary
        try {
            const publicId = extractPublicId(category.image.url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (err) {
            console.error("Failed to delete image:", err.message);
        }

        // delete from DB
        await Category.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


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