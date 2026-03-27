import express from "express";
import indiaData from "../../constant/indiaData.js";

const router = express.Router();

// GET ALL STATES
router.get("/states", (req, res) => {
  const states = Object.keys(indiaData).map((code) => ({
    name: indiaData[code].name,
    isoCode: code,
  }));

  res.json(states);
});

// GET DISTRICTS BY STATE
router.get("/districts/:code", (req, res) => {
  const code = req.params.code.toUpperCase();

  if (!indiaData[code]) {
    return res.status(404).json({ message: "State not found" });
  }

  res.json(indiaData[code].districts);
});

export default router;
