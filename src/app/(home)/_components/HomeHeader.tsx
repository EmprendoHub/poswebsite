"use client";
import * as React from "react";
import { SLIDER_IMAGES, SLIDER_FOOTER_CARDS } from "@/backend/data/constants";
import EmblaCarousel from "./EmblaCarousel";
import CarouselFooter from "./CarouselFooter";
import { EmblaOptionsType } from "embla-carousel";
import { Truck } from "lucide-react";

const OPTIONS: EmblaOptionsType = { loop: true };

const HomeHeader = () => {
  return (
    <div className="relative w-full home-header h-fit  bg-gradient-to-b from-primary to-transparent">
      <EmblaCarousel slides={SLIDER_IMAGES} options={OPTIONS} />
      <div className="absolute -bottom-5 z-[5] flex justify-center items-start w-full ">
        <div className="w-[97%] rounded-[3px] flex flex-row items-center justify-center text-[12px] bg-slate-100 text-black mx-auto mt-3 minmd:hidden ">
          <span className="flex flex-row items-center gap-x-1 text-emerald-700 p-1">
            <Truck size={16} /> Envíos gratis
          </span>{" "}
          en cientos de coleccionables
        </div>
      </div>
    </div>
  );
};

export default HomeHeader;
