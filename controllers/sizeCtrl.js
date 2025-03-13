import asyncHandler from "express-async-handler";
import Size from "../model/Size.js";

export const createSizeCtrl = asyncHandler(async (req, res) => {
  const { name, abbreviation } = req.body;
  const sizeFound = await Size.findOne({ name });
  if (sizeFound) throw new Error("Size already exists");

  const size = await Size.create({
    name,
    abbreviation,
    user: req.user.id,
  });

  res.status(201).json({
    status: "success",
    message: "Size created successfully",
    size,
  });
});

export const getAllSizesCtrl = asyncHandler(async (req, res) => {
  const sizes = await Size.find();
  res.json({
    status: "success",
    message: "Sizes fetched successfully",
    sizes,
  });
});

export const getSingleSizeCtrl = asyncHandler(async (req, res) => {
  const size = await Size.findById(req.params.id);
  if (!size) throw new Error("Size not found");
  res.json({
    status: "success",
    message: "Size fetched successfully",
    size,
  });
});

export const updateSizeCtrl = asyncHandler(async (req, res) => {
  const { name, abbreviation } = req.body;
  const size = await Size.findByIdAndUpdate(
    req.params.id,
    { name, abbreviation },
    { new: true, runValidators: true }
  );
  if (!size) throw new Error("Size not found");
  res.json({
    status: "success",
    message: "Size updated successfully",
    size,
  });
});

export const deleteSizeCtrl = asyncHandler(async (req, res) => {
  const size = await Size.findByIdAndDelete(req.params.id);
  if (!size) throw new Error("Size not found");
  res.json({
    status: "success",
    message: "Size deleted successfully",
  });
});
