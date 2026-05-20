import React from "react";

const PageLayoutComponet = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className=" flex relative min-h-screen flex-col items-start justify-start bg-nackground p-24 maxmd:px-10 maxsm:px-2">
      {children}
    </div>
  );
};

export default PageLayoutComponet;
