import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./src/routes/authRoutes.js";
import { protect } from "./src/middleware/authMiddleware.js";
import tripROutes from "./src/routes/tripRoutes.js"
import areaRotues from "./src/routes/areaRoutes.js"
import cors from "cors";



dotenv.config();
const app = express();

app.use(cors());


app.use(express.json());

console.log("secretkey",process.env.JWT_SECRET)

app.use("/api/auth", authRoutes);
app.use("/api",protect,tripROutes)
app.use("/api",protect,areaRotues)

app.get("/api/profile", protect, (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port 5000")
    );
  })
  .catch((err) => console.log(err));
