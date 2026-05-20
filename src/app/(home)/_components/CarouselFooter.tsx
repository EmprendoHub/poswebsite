import Image from "next/image";
import React from "react";
const CarouselFooter = ({ cards }: { cards: any }) => {
  return (
    <div className="maxmd:hidden absolute bottom-36 max2xl:bottom-48 maxxlg:bottom-56  maxlg:bottom-64 maxbase:bottom-72 left-0 right-0 z-10 flex items-center justify-center gap-x-3 w-3/4 maxlg:w-5/6 mx-auto ">
      {cards.map((card: any) => (
        <div
          key={card.id}
          className="max-w-34 max-h-48 flex flex-col gap-1 items-start justify-start px-3 py-5 bg-card  cursor-pointer hover:scale-110 duration-300 ease-in-out border-4 border-red-900"
        >
          <h3 className="text-[12px] font-bold">{card.cta}</h3>
          <Image src={card.src} alt={card.alt} width={150} height={150} />
          <p className="text-emerald-700 text-[12px] font-bold">
            {card.footer}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CarouselFooter;
