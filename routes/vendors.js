const express = require("express");
const router = express.Router();
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Create vendor profile (protected)
router.post("/", auth, async (req, res) => {
  try {
    const { id, role } = req.user;
    const { storeName, description, address } = req.body;

    if (role !== "vendor") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only vendors can create profiles." });
    }

    const existingVendor = await Vendor.findOne({ user: id });
    if (existingVendor) {
      return res
        .status(400)
        .json({ message: "Vendor profile already exists for this user." });
    }

    const newVendor = new Vendor({
      user: id,
      storeName,
      description,
      address,
    });

    await newVendor.save();
    res.status(201).json({
      message: "Vendor profile created successfully!",
      vendor: newVendor,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get all vendors (public)
router.get("/", async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
