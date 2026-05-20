"use client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, tienda } from "@/redux/store";
import { SessionProvider } from "next-auth/react";

const CustomSessionProvider = ({ children }: { children: any }) => {
  return (
    <Provider store={tienda}>
      <PersistGate persistor={persistor}>
        <SessionProvider>{children}</SessionProvider>
      </PersistGate>
    </Provider>
  );
};

export default CustomSessionProvider;
