const express = require("express");
const { getStatus, getStatusOne } = require("../controllers/monitorController");

const router = express.Router();

router.get("/", getStatus);
router.get("/:site", getStatusOne);

module.exports = router 