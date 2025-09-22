const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const auth = require("../middleware/auth");

// ---- ADD THESE IMPORTS ----
const multer = require("multer");
const cloudinary = require("../utils/cloudinary"); // Assuming you have this file from a previous step
const fs = require("fs");
const upload = multer({ dest: "uploads/" }); // Use a temporary folder for uploads

// Get all products (public)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("vendor", "storeName");
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get a single product by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "vendor",
      "storeName description"
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get a vendor's products (public)
router.get("/vendor/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const products = await Product.find({ vendor: vendorId });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Create a new product (protected)
// ---- ADD `upload.single('image')` middleware here ----
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { vendorId, name, description, price, stockQuantity } = req.body;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    if (req.user.role !== "vendor" || !vendor.user.equals(req.user.id)) {
      return res.status(403).json({
        message:
          "Forbidden: You are not authorized to add products for this vendor.",
      });
    }

    // ---- CLOUDINARY UPLOAD LOGIC ----
    let imageUrl, imageId;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "multi-vendor-app-products",
      });
      imageUrl = result.secure_url;
      imageId = result.public_id;
      // Clean up the temporary file
      fs.unlinkSync(req.file.path);
    }
    // ------------------------------------

    const newProduct = new Product({
      vendor: vendorId,
      name,
      description,
      price,
      stockQuantity,
      imageUrl, // ---- ADD THIS ----
      imageId, // ---- ADD THIS ----
    });

    await newProduct.save();
    res
      .status(201)
      .json({ message: "Product created successfully!", product: newProduct });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Update a product (protected)
// ---- ADD `upload.single('image')` middleware here ----
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedProduct = await Product.findById(id);

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    const vendor = await Vendor.findById(updatedProduct.vendor);
    if (req.user.role !== "vendor" || !vendor.user.equals(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to update this product.",
      });
    }

    if (req.file) {
      // First, delete the old image from Cloudinary if one exists
      if (updatedProduct.imageId) {
        await cloudinary.uploader.destroy(updatedProduct.imageId);
      }
      // Then, upload the new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "multi-vendor-app-products",
      });
      updates.imageUrl = result.secure_url;
      updates.imageId = result.public_id;
      // Clean up the temporary file
      fs.unlinkSync(req.file.path);
    }

    Object.assign(updatedProduct, updates);
    await updatedProduct.save();

    res.json({
      message: "Product updated successfully!",
      product: updatedProduct,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete a product (protected)
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const vendor = await Vendor.findById(product.vendor);
    if (req.user.role !== "vendor" || !vendor.user.equals(req.user.id)) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this product.",
      });
    }

    // ---- DELETE IMAGE FROM CLOUDINARY ----
    if (product.imageId) {
      await cloudinary.uploader.destroy(product.imageId);
    }
    // -------------------------------------

    await Product.findByIdAndDelete(id);

    res.json({ message: "Product deleted successfully!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
