import React from "react";

const MidSectionLayoutComponet = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) => {
  return <div className={`${className}   py-20 w-full `}>{children}</div>;
};

export default MidSectionLayoutComponet;
