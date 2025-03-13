import asyncHandler from "express-async-handler";
import Brand from "../model/Brand.js";
import Category from "../model/Category.js";
import Product from "../model/Product.js";

export const createProductCtrl = asyncHandler(async (req, res) => {
  const { name, description, category, sizes, colors, price, totalQty, brand } =
    req.body;
  const images = req.files.map((file) => file.path);

  const productExists = await Product.findOne({ name });
  if (productExists) throw new Error("Product already exists");

  const brandFound = await Brand.findById(brand);
  if (!brandFound) throw new Error("Brand not found, please create it first");

  const categoryFound = await Category.findById(category);
  if (!categoryFound)
    throw new Error("Category not found, please create it first");

  const product = await Product.create({
    name,
    description,
    category,
    sizes,
    colors,
    user: req.user.id,
    price,
    totalQty,
    brand,
    images,
  });

  categoryFound.products.push(product._id);
  brandFound.products.push(product._id);

  await categoryFound.save();
  await brandFound.save();

  res.status(201).json({
    status: "success",
    message: "Product created successfully",
    product,
  });
});

export const getProductsCtrl = asyncHandler(async (req, res) => {
  let productQuery = Product.find();

  if (req.query.name)
    productQuery = productQuery.find({
      name: { $regex: req.query.name, $options: "i" },
    });
  if (req.query.brand)
    productQuery = productQuery.find({ brand: req.query.brand });
  if (req.query.category)
    productQuery = productQuery.find({ category: req.query.category });
  if (req.query.color)
    productQuery = productQuery.find({ colors: req.query.color });
  if (req.query.size)
    productQuery = productQuery.find({ sizes: req.query.size });
  if (req.query.price) {
    const [minPrice, maxPrice] = req.query.price.split("-").map(Number);
    productQuery = productQuery.find({
      price: { $gte: minPrice, $lte: maxPrice },
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const total = await Product.countDocuments();
  productQuery = productQuery.skip((page - 1) * limit).limit(limit);

  const products = await productQuery.populate("reviews");

  res.json({
    status: "success",
    total,
    results: products.length,
    pagination: {
      next: page * limit < total ? page + 1 : null,
      prev: page > 1 ? page - 1 : null,
    },
    message: "Products fetched successfully",
    products,
  });
});

export const getProductCtrl = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: "reviews",
    populate: { path: "user", select: "name" },
  });
  if (!product) throw new Error("Product not found");
  res.json({
    status: "success",
    message: "Product fetched successfully",
    product,
  });
});

export const updateProductCtrl = asyncHandler(async (req, res) => {
  const { name, description, category, sizes, colors, price, totalQty, brand } =
    req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, description, category, sizes, colors, price, totalQty, brand },
    { new: true, runValidators: true }
  );
  if (!product) throw new Error("Product not found");
  res.json({
    status: "success",
    message: "Product updated successfully",
    product,
  });
});

export const deleteProductCtrl = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new Error("Product not found");
  res.json({ status: "success", message: "Product deleted successfully" });
});
