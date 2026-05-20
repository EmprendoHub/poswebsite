import mongoose from "mongoose";

export type UserType = {
  active: Boolean;
  name: String;
  email: String;
  verificationToken: String;
  phone: String;
  stripe_id?: String;
  mercado_token?: {
    access_token: String;
    token_type: String;
    expires_in: Number;
    scope: String;
    user_id: Number;
    refresh_token: String;
    createdAt: Date;
    updatedAt: Date;
  };
  password: String;
  avatar?: String;
  permissions?: {
    name: String;
    active: Boolean;
  };
  favorites?: {
    _id: String;
    title: String;
    price: Number;
    images: {
      url: String;
    }[];
  }[];
  loginAttempts?: Number;
  points?: Number;
  role?: String;
};

export type Product = {
  type?: string;
  _id?: string;
  url: string;
  currency: string;
  images: [{ url: string; color: string }];
  domain: string;
  ASIN: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
  active: Boolean;
  createdAt: Date;
  published: Boolean;
  featured: Boolean;
  quantity: number;
  sale_price: number;
  sale_price_end_date: Date;
  cost: number;
  currentPrice: number;
  originalPrice: number;
  discountRate: number;
  description: string;
  details: { key: string; value: string }[];
  gender: String;
  brand?: string;
  category: string;
  reviewCount: number;
  stars: number;
  rating?: number;
  isOutOfStock: Boolean;
  variations: [
    {
      title: String;
      stock: Number;
      color?: String;
      colorHex?: String;
      colorHexTwo?: String;
      colorHexThree?: String;
      size?: String;
      cost: Number;
      price: Number;
      image?: String;
      quantity?: Number;
      productId: String;
    }
  ];
  availability: {
    instagram: Boolean;
    branch: Boolean;
    online: Boolean;
  };
  reviews: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
};

export type NotificationType =
  | "WELCOME"
  | "CHANGE_OF_STOCK"
  | "LOWEST_PRICE"
  | "THRESHOLD_MET";

export type EmailContent = {
  subject: string;
  body: string;
};

export type EmailProductInfo = {
  title: string;
  url: string;
};

export type ValidationError = {
  [key: string]: {
    _errors: string[];
  };
};

export type PostProps = {
  slug: any;
  _id: string;
  mainImage: string;
  category: string;
  mainTitle: string;
  createdAt: string;
};

export type ImageInfo = {
  error: boolean;
  note: string;
  url: string;
};
