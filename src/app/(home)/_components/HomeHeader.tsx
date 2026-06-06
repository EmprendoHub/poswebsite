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
    <div className="relative w-full">
      <EmblaCarousel slides={SLIDER_IMAGES} options={OPTIONS} />
      {/* Mobile free-shipping strip */}
      <div className="minmd:hidden flex items-center justify-center gap-1.5 bg-zinc-950 border-t border-white/10 py-2 text-xs font-medium text-zinc-300">
        <Truck size={14} className="text-emerald-400" />
        <span className="text-emerald-400 font-semibold">Envíos gratis</span>
        <span>en cientos de coleccionables</span>
      </div>
    </div>
  );
};

export default HomeHeader;
