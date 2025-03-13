import asyncHandler from "express-async-handler";
import Category from "../model/Category.js";

export const createCategoryCtrl = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const categoryFound = await Category.findOne({ name });
  if (categoryFound) throw new Error("Category already exists");

  const category = await Category.create({
    name,
    description,
    user: req.user.id,
    image: req?.file?.path,
  });

  res.status(201).json({
    status: "success",
    message: "Category created successfully",
    category,
  });
});

export const getAllCategoriesCtrl = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.json({
    status: "success",
    message: "Categories fetched successfully",
    categories,
  });
});

export const getSingleCategoryCtrl = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new Error("Category not found");
  res.json({
    status: "success",
    message: "Category fetched successfully",
    category,
  });
});

export const updateCategoryCtrl = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description },
    { new: true, runValidators: true }
  );
  if (!category) throw new Error("Category not found");
  res.json({
    status: "success",
    message: "Category updated successfully",
    category,
  });
});

export const deleteCategoryCtrl = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new Error("Category not found");
  res.json({
    status: "success",
    message: "Category deleted successfully",
  });
});
