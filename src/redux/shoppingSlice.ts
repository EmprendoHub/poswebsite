import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define the Variation interface
interface Variation {
  _id: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  stock: number;
  image: string;
  product?: string;
  variation?: string;
  title?: string;
  images?: { url: string }[];
  quantity?: number;
  brand?: string;
}

// Define the initial state type
interface CartState {
  productsData: Variation[];
}

// Define the action type
interface AddToCartAction {
  type: string;
  payload: Variation;
}

const initialState = {
  productsData: [],
  productsPOS: [],
  favoritesData: [],
  userInfo: null,
  locationInfo: null,
  shippingInfo: null,
  shippingMethod: null,
  orderData: [],
  affiliateInfo: null,
  emailListData: [],
  qrListData: [],
  loginAttempts: null,
};

export const shoppingSlice = createSlice({
  name: "compras",
  initialState,
  reducers: {
    increaseLoginAttempts: (state, action) => {
      state.loginAttempts += action.payload.count;
    },
    addToPOSCart: (state: any, action: any) => {
      const existingProduct: any = state.productsPOS.find(
        (item: any) => item._id === action.payload._id
      );
      if (existingProduct) {
        existingProduct.quantity += action.payload.quantity;
      } else {
        state.productsPOS.push(action.payload);
      }
    },
    increasePOSQuantity: (state, action) => {
      const existingProduct: any = state.productsPOS.find(
        (item: any) => item._id === action.payload._id
      );

      if (existingProduct && existingProduct.stock > existingProduct.quantity) {
        existingProduct.quantity++;
      }
    },
    decreasePOSQuantity: (state, action) => {
      const existingProduct: any = state.productsPOS.find(
        (item: any) => item._id === action.payload._id
      );
      if (existingProduct?.quantity === 1) {
        existingProduct.quantity === 1;
      } else {
        existingProduct && existingProduct.quantity--;
      }
    },
    deletePOSProduct: (state, action) => {
      state.productsPOS = state.productsPOS.filter(
        (item: any) => item._id !== action.payload
      );
    },
    resetPOSCart: (state) => {
      state.productsPOS = [];
    },
    addToCart: (state: any, action: PayloadAction<Variation>) => {
      const existingProduct: any = state.productsData.find(
        (item: any) => item._id === action.payload._id
      );
      if (existingProduct) {
        existingProduct.quantity =
          (existingProduct.quantity ?? 0) + action.payload.quantity!;
      } else {
        state.productsData.push(action.payload);
      }
    },
    increaseQuantity: (state, action) => {
      const existingProduct: any = state.productsData.find(
        (item: any) => item._id === action.payload._id
      );
      existingProduct.quantity++;
    },
    decreaseQuantity: (state, action) => {
      const existingProduct: any = state.productsData.find(
        (item: any) => item._id === action.payload._id
      );
      if (existingProduct?.quantity === 1) {
        existingProduct.quantity === 1;
      } else {
        existingProduct && existingProduct.quantity--;
      }
    },
    deleteProduct: (state, action) => {
      state.productsData = state.productsData.filter(
        (item: any) => item._id !== action.payload
      );
    },
    resetCart: (state) => {
      state.productsData = [];
    },
    addToFavorites: (state: any, action: any) => {
      const existingProduct = state.favoritesData.find(
        (item: any) => item._id === action.payload._id
      );
      if (existingProduct) {
        state.favoritesData = state.favoritesData.filter(
          (item: any) => item._id !== action.payload._id
        );
      } else {
        state.favoritesData.push(action.payload);
      }
    },
    deleteFavorite: (state, action) => {
      state.favoritesData = state.favoritesData.filter(
        (item: any) => item._id !== action.payload
      );
    },
    resetFavorites: (state) => {
      state.favoritesData = [];
    },
    addLocation: (state, action) => {
      state.locationInfo = action.payload;
    },
    deleteLocation: (state) => {
      state.locationInfo = null;
    },
    addUser: (state, action) => {
      state.userInfo = action.payload;
    },

    addAffiliate: (state, action) => {
      state.affiliateInfo = action.payload;
    },
    addShippingInfo: (state, action) => {
      state.shippingInfo = action.payload;
    },
    addShippingMethod: (state, action) => {
      state.shippingMethod = action.payload;
    },
    deleteUser: (state) => {
      state.userInfo = null;
    },
    saveOrder: (state, action) => {
      state.orderData = action.payload;
    },
    savePOSOrder: (state, action) => {
      state.orderData = action.payload;
    },
    repopulateCart: (state: any, action: any) => {
      state.productsData.push(action.payload);
    },
    repopulateFavorites: (state: any, action: any) => {
      state.favoritesData.push(action.payload);
    },
    resetOrder: (state: any) => {
      state.orderData = {};
    },
    saveEmailReceiver: (state: any, action: any) => {
      const existingEmail = state.emailListData.find(
        (item: any) => item.id === action.payload.id
      );
      if (existingEmail) {
        const clientIdToRemove = action.payload.id;
        state.emailListData = state.emailListData.filter(
          (item: any) => item.id !== clientIdToRemove
        );
      } else {
        state.emailListData.push(action.payload);
      }
    },
    removeEmailReceiver: (state, action) => {
      const clientIdToRemove = action.payload;
      state.emailListData = state.emailListData.filter(
        (item: any) => item.id !== clientIdToRemove
      );
    },
    resetEmailReceiver: (state: any) => {
      state.emailListData = [];
    },
    saveQRToPrint: (state: any, action: any) => {
      const existingEmail = state.qrListData.find(
        (item: any) => item.id === action.payload.id
      );
      if (existingEmail) {
        const productIdToRemove = action.payload.id;
        state.qrListData = state.qrListData.filter(
          (item: any) => item.id !== productIdToRemove
        );
      } else {
        state.qrListData.push(action.payload);
      }
    },
    removeQRToPrint: (state, action) => {
      const productIdToRemove = action.payload;
      state.qrListData = state.qrListData.filter(
        (item: any) => item.id !== productIdToRemove
      );
    },
    resetQRToPrint: (state) => {
      state.qrListData = [];
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  deleteProduct,
  resetCart,
  addToPOSCart,
  increasePOSQuantity,
  decreasePOSQuantity,
  deletePOSProduct,
  resetPOSCart,
  addUser,
  addAffiliate,
  deleteUser,
  saveOrder,
  savePOSOrder,
  repopulateCart,
  addShippingInfo,
  addShippingMethod,
  saveEmailReceiver,
  removeEmailReceiver,
  resetEmailReceiver,
  repopulateFavorites,
  resetFavorites,
  deleteFavorite,
  addToFavorites,
  increaseLoginAttempts,
  saveQRToPrint,
  removeQRToPrint,
  resetQRToPrint,
  addLocation,
  deleteLocation,
} = shoppingSlice.actions;

export default shoppingSlice.reducer;
