import { sequelize } from "./db.js";

import { User } from "../models/userModel.js";
import { Category } from "../models/categoryModel.js";
import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";

export const syncModels = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("Models da duoc dong bo voi database");
  } catch (error) {
    console.error("Loi khi dong bo syncModels:", error);
  }
};
