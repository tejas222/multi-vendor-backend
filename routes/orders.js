const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

// Create a new order (protected)
router.post("/", auth, async (req, res) => {
  try {
    const { items } = req.body;
    const customerId = req.user.id;

    if (req.user.role !== "customer") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only customers can place orders." });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product || product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${item.productId}`,
        });
      }

      const itemPrice = product.price * item.quantity;
      totalAmount += itemPrice;

      const newOrderItem = new OrderItem({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      await newOrderItem.save();
      orderItems.push(newOrderItem._id);

      product.stockQuantity -= item.quantity;
      await product.save();
    }

    const newOrder = new Order({
      customer: customerId,
      products: orderItems,
      totalAmount: totalAmount,
    });

    await newOrder.save();
    res
      .status(201)
      .json({ message: "Order placed successfully!", order: newOrder });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
