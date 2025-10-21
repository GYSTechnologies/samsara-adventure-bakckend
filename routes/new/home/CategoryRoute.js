const express = require('express');
const router = express.Router();
const parser = require('../../../middlewares/upload');

const { createCategory, deleteCategory, getAllCategories, updateCategory,updateCategoryActiveStatus } = require('../../../controllers/new/home/CategoryController');

router.post('/createCategory', parser.single('image'), createCategory);

router.delete('/deleteCategory',deleteCategory);

router.get('/getAllCategories',getAllCategories);

router.put('/updateCategory',updateCategory);

router.put('/updateCategoryActiveStatus',updateCategoryActiveStatus);

module.exports = router;