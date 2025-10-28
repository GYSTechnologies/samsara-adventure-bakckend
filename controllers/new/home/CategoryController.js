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

        const newCategory = new Category({ category, active: true, image });
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

exports.getAllCategories = async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        // Fetch categories with pagination and sort by newest first
        const categories = await Category.find(
            { active: true }
        )
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

// Update active status of a state
exports.updateCategoryActiveStatus = async (req, res) => {
    try {
        const { id, active } = req.body; // Boolean from request body

        if (typeof active !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Invalid value for 'active'. Must be a boolean (true/false).",
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { active },
            { new: true } // return the updated document
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Category active status updated successfully.",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating category active status:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating category.",
            error: error.message,
        });
    }
};

exports.getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories
    return res.status(200).json({
      success: true,
      data: categories,
      message: "Categories fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get only active category names
exports.getActiveCategoryNames = async (req, res) => {
  try {
    // Find categories where 'active' is true, and project only 'category' field
    const activeCategories = await Category.find(
      { active: true },
      { category: 1, _id: 0 } // projection: include category, exclude _id
    );

    // Extract category names into array (optional)
    const categoryNames = activeCategories.map(cat => cat.category);

    res.status(200).json({
      success: true,
      count: categoryNames.length,
      categories: categoryNames,
    });
  } catch (error) {
    console.error('Error fetching active categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};