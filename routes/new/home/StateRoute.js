const express = require("express");
const router = express.Router();
const parser = require('../../../middlewares/upload');

const {
    createState,
    getAllStates,
    updateState,
    deleteState,
} = require("../../../controllers/new/home/StateController");

router.post("/createState", parser.single("image"), createState);
router.get("/getAllStates", getAllStates);
router.put("/updateState", parser.single("image"), updateState);
router.delete("/deleteState", deleteState);

module.exports = router;
