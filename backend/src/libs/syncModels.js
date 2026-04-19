import { sequelize } from "./db.js";

import { User } from "../models/userModel.js";
import { Category } from "../models/categoryModel.js";
import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";
import { Cart } from "../models/cartModel.js";
import { CartItem } from "../models/cartItemModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { Slideshow } from "../models/slideshowModel.js";
import { DiscountCampaign } from "../models/discountCampaignModel.js";
import { DiscountCampaignProduct } from "../models/discountCampaignProductModel.js";
import { DiscountCampaignCategory } from "../models/discountCampaignCategoryModel.js";
import { DiscountCampaignVariantPrice } from "../models/discountCampaignVariantPriceModel.js";

// Import associations
import "../models/associationsModel.js";

export const syncModels = async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log("Models da duoc dong bo voi database");
  } catch (error) {
    console.error("Loi khi dong bo syncModels:", error);
  }
};
