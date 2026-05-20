import MidSectionLayoutComponet from "@/components/layouts/MidSectionLayoutComponet";
import ColTextColorComponent from "@/components/texts/ColTextColorComponent";
import Image from "next/image";
import React from "react";

const SectionFourComponent = () => {
  return (
    <MidSectionLayoutComponet
      className={"bg-black items-center justify-center flex w-full"}
    >
      <div className="w-full h-auto px-20 maxmd:px-5 mx-auto relative">
        <div className="grid grid-cols-2 maxmd:grid-cols-1 items-center">
          <div className="maxmd:order-2 relative flex justify-center items-center w-full">
            <Image
              src={"/images/CentroMagno.webp"}
              width={1080}
              height={1080}
              alt="Servicios para coleccionistas"
              className="z-10 relative w-full  h-[380px]  object-cover "
            />
            <Image
              src={"/images/play_video_icon.png"}
              width={70}
              height={70}
              alt="play"
              className="absolute z-20"
            />
          </div>
          <div className="bg-background p-10 maxmd:p-10 h-full">
            <ColTextColorComponent
              pretitle={"Información de"}
              title={"Contacto"}
              subtitle={""}
              addressOne={"Centro Magno"}
              addressTwo={
                "Av. Ignacio L Vallarta 2425, Arcos Vallarta, 44130 Guadalajara, Jal."
              }
              tel={"332-812-3760"}
              email={"supercollectiblesc12@gmail.com"}
              btnUrl="/contacto"
              btnText={"Contactar"}
            />
          </div>
        </div>
      </div>
    </MidSectionLayoutComponet>
  );
};

export default SectionFourComponent;
