import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

dotenv.config();
const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/profile", protect, (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port 5000")
    );
  })
  .catch((err) => console.log(err));
