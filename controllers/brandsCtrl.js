import asyncHandler from "express-async-handler";
import Brand from "../model/Brand.js";

export const createBrandCtrl = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const brandFound = await Brand.findOne({ name });
  if (brandFound) throw new Error("Brand already exists");

  const brand = await Brand.create({
    name,
    description,
    user: req.user.id,
  });

  res.status(201).json({
    status: "success",
    message: "Brand created successfully",
    brand,
  });
});

export const getAllBrandsCtrl = asyncHandler(async (req, res) => {
  const brands = await Brand.find();
  res.json({
    status: "success",
    message: "Brands fetched successfully",
    brands,
  });
});

export const getSingleBrandCtrl = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new Error("Brand not found");
  res.json({
    status: "success",
    message: "Brand fetched successfully",
    brand,
  });
});

export const updateBrandCtrl = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { name, description },
    { new: true, runValidators: true }
  );
  if (!brand) throw new Error("Brand not found");
  res.json({
    status: "success",
    message: "Brand updated successfully",
    brand,
  });
});

export const deleteBrandCtrl = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw new Error("Brand not found");
  res.json({
    status: "success",
    message: "Brand deleted successfully",
  });
});
