import { sachet, landslide } from "../controllers/areaController.js";
import express from 'express';

const router = express.Router()

router.get("/sachet",sachet);
router.get("/landslide",landslide)

export default router;