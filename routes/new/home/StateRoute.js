const express = require("express");
const router = express.Router();
const parser = require('../../../middlewares/upload');

const {
    createState,
    getAllStates,
    updateState,
    deleteState,
    updateStateActiveStatus,
    getAllStatesAdmin,
    getActiveStates
} = require("../../../controllers/new/home/StateController");

router.post("/createState", parser.single("image"), createState);
router.get("/getAllStates", getAllStates);
router.put("/updateState", parser.single("image"), updateState);
router.delete("/deleteState", deleteState);
router.put('/updateStateActiveStatus',updateStateActiveStatus);

// Admin
router.get('/getAllStatesAdmin',getAllStatesAdmin);

router.get('/getActiveStates',getActiveStates);

module.exports = router;
