const express = require("express");
const router = express.Router();

const {
  checkRequestStatus,
  submitCustomRequest,
  updateRequest
} = require("../controllers/customtrip.controller");
const { protect } = require("../middleware/authMiddleware");

// Public Routes
router.get("/check-request-status", checkRequestStatus);
router.post("/submit-custom-request", submitCustomRequest);

// Admin Routes
// router.put("/update-request/:id", updateRequest);

module.exports = router;
