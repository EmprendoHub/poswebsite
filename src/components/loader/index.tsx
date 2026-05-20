import React from "react";
import { SpinnerLoading } from "../spinner";
import { cn } from "@/lib/utils";

type LoaderProps = {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
};

export const Loader = ({
  loading,
  children,
  noPadding,
  className,
}: LoaderProps) => {
  return loading ? (
    <div
      className={cn(
        className || "w-full h-full relative flex justify-center items-center"
      )}
    >
      <SpinnerLoading />
    </div>
  ) : (
    children
  );
};
