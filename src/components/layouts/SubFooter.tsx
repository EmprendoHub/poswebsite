import React from "react";
import ColFooterTextComponent from "../texts/ColFooterTextComponent";
import Image from "next/image";

const SubFooter = () => {
  return (
    <div className="w-full h-full  relative flex flex-row  maxmd:flex-col-reverse justify-center items-end px-40 maxlg:px-10 maxmd:pt-10 bg-background">
      <div className="w-full  h-full relative z-[1] flex justify-end pr-20 maxmd:pr-5">
        <Image
          src={"/images/footer_image.webp"}
          width={1080}
          height={1080}
          alt="Vende tus coleccionables"
          className="object-cover max-w-[350px] h-full relative bottom-0 z-[1]"
        />
        <div className="bg-primary w-[340px] h-[340px] rounded-tl-full rounded-tr-full rounded-br-full absolute bottom-0 z-0" />
      </div>

      <div className="w-full relative z-[1]">
        <ColFooterTextComponent
          pretitle={
            "No esperes más para expandir tu colección o vender tus artículos."
          }
          title={""}
          subtitle={
            "Confía en Super Collectibles Mx para todas tus necesidades de coleccionismo."
          }
          btnUrl={`/acerca`}
          btnText={"Vende con Nosotros"}
        />
      </div>
      <div className="w-full h-full bg-card absolute bottom-0 left-0 z-0" />
    </div>
  );
};

export default SubFooter;
