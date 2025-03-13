import express from "express";
import { createReviewCtrl } from "../controllers/reviewsCtrl.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const reviewRouter = express.Router();

reviewRouter.post("/:productID", verifyToken, createReviewCtrl);

export default reviewRouter;
