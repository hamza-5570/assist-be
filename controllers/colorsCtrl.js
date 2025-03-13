import asyncHandler from "express-async-handler";
import Color from "../model/Color.js";

export const createColorCtrl = asyncHandler(async (req, res) => {
  const { name, hexCode } = req.body;
  const colorFound = await Color.findOne({ name });
  if (colorFound) throw new Error("Color already exists");

  const color = await Color.create({
    name,
    hexCode,
    user: req.user.id,
  });

  res.status(201).json({
    status: "success",
    message: "Color created successfully",
    color,
  });
});

export const getAllColorsCtrl = asyncHandler(async (req, res) => {
  const colors = await Color.find();
  res.json({
    status: "success",
    message: "Colors fetched successfully",
    colors,
  });
});

export const getSingleColorCtrl = asyncHandler(async (req, res) => {
  const color = await Color.findById(req.params.id);
  if (!color) throw new Error("Color not found");
  res.json({
    status: "success",
    message: "Color fetched successfully",
    color,
  });
});

export const updateColorCtrl = asyncHandler(async (req, res) => {
  const { name, hexCode } = req.body;
  const color = await Color.findByIdAndUpdate(
    req.params.id,
    { name, hexCode },
    { new: true, runValidators: true }
  );
  if (!color) throw new Error("Color not found");
  res.json({
    status: "success",
    message: "Color updated successfully",
    color,
  });
});

export const deleteColorCtrl = asyncHandler(async (req, res) => {
  const color = await Color.findByIdAndDelete(req.params.id);
  if (!color) throw new Error("Color not found");
  res.json({
    status: "success",
    message: "Color deleted successfully",
  });
});
