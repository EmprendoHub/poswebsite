"use client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, tienda } from "@/redux/store";
import { SessionWrapper } from "./SessionWrapper";
import { ReactNode } from "react";

interface CustomSessionProviderProps {
  children: ReactNode;
}

const CustomSessionProvider = ({ children }: CustomSessionProviderProps) => {
  return (
    <Provider store={tienda}>
      <PersistGate persistor={persistor} loading={null}>
        <SessionWrapper>{children}</SessionWrapper>
      </PersistGate>
    </Provider>
  );
};

export default CustomSessionProvider;
