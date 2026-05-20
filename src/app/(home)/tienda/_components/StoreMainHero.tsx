"use client";
import Image from "next/image";
import React from "react";

const StoreMainHero = () => {
  return (
    <section className="w-full  flex flex-col items-center justify-center h-auto mt-5  maxlg:px-20 maxmd:px-5  px-32 gap-8 maxsm:gap-4 ">
      <div className="relative w-full  h-full">
        <div className=" w-full h-full ">
          <Image
            src={`/covers/Store_Image_header.png`}
            alt="img"
            width={1920}
            height={1080}
            className="rounded-xl object-bottom w-full h-full"
          />
        </div>
      </div>
    </section>
  );
};

export default StoreMainHero;
