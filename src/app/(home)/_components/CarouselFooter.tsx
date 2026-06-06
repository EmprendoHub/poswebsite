import Image from "next/image";
import React from "react";
const CarouselFooter = ({ cards }: { cards: any }) => {
  return (
    <div className="maxmd:hidden absolute bottom-10 left-0 right-0 z-10 flex items-end justify-center gap-x-3 w-3/4 maxlg:w-5/6 mx-auto">
      {cards.map((card: any) => (
        <div
          key={card.id}
          className="flex flex-col gap-1 items-start justify-start px-3 py-4 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 cursor-pointer hover:scale-105 hover:border-white/30 duration-300 ease-in-out shadow-xl"
        >
          <h3 className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
            {card.cta}
          </h3>
          <Image
            src={card.src}
            alt={card.alt}
            width={140}
            height={140}
            className="rounded-md"
          />
          <p className="text-emerald-400 text-[11px] font-bold">
            {card.footer}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CarouselFooter;
