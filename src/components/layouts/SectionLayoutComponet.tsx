import React from "react";

const SectionLayoutComponet = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) => {
  return <div className={`${className}`}>{children}</div>;
};

export default SectionLayoutComponet;
