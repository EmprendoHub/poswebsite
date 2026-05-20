"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface ConditionalHeaderWrapperProps {
  children: ReactNode;
}

const ConditionalHeaderWrapper = ({
  children,
}: ConditionalHeaderWrapperProps) => {
  const pathname = usePathname();

  // Define paths where header should be hidden
  const hideHeaderPaths = ["/cacha"];

  // Check if current path should hide header
  const shouldHideHeader = hideHeaderPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (shouldHideHeader) {
    return null;
  }

  return <>{children}</>;
};

export default ConditionalHeaderWrapper;
