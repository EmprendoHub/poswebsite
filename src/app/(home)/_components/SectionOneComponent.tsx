import DivUpMotion from "@/components/images/DivUpMotion";
import SectionLayoutComponet from "@/components/layouts/SectionLayoutComponet";
import HeroColTextComponent from "@/components/texts/HeroColTextComponent";
import Link from "next/link";
import React from "react";

const serviciosMedicos = [
  {
    title: "Gran Variedad de Coleccionables",
    text: "Contamos con una gran variedad de coleccionables ubicas perfectas para expandir tu colección.",
    imgUrl: "/contacto",
    imgSrc: "/images/Supecollectibles_Unique_Cards.webp",
  },
  {
    title: "Garantía de Autenticidad",
    text: "Cada artículo o tarjeta es verificado para garantizar que estás adquiriendo piezas genuinas.",
    imgUrl: "/tienda",
    imgSrc: "/images/Supecollectibles_PSA_Certification.webp",
  },
  {
    title: "Compras Seguras y Fáciles",
    text: "Proceso de compra es sencillo, seguro y rápido, adquiere lo que necesitas sin complicaciones.",
    imgUrl: "/servicios",
    imgSrc: "/images/card_security_PSA_3.webp",
  },
];

const SectionOneComponent = () => {
  return (
    <>
      <SectionLayoutComponet
        className={
          "bg-nackground maxmd:px-5 pb-24 mx-auto text-center  min-h-screen w-full "
        }
      >
        <div className=" pt-40 w-[80%] maxsm:w-full mx-auto text-center pb-20">
          <HeroColTextComponent
            className={"text-center"}
            pretitle={"Amplia Selección"}
            title={"¿Por Qué  "}
            word={"Elegirnos?"}
            subtitle={
              "Disponemos de un catálogo extenso con tarjetas y artículos coleccionables cuidadosamente seleccionados, asegurando calidad y autenticidad en cada producto."
            }
          />
          <div className="flex flex-row maxmd:flex-col gap-6 maxmd:gap-24 justify-center items-center mt-10">
            {serviciosMedicos?.map((servicio, index) => (
              <DivUpMotion
                key={index}
                divIndex={index}
                divClassName={`relative flex justify-center bg-gray-300 h-[350px] w-[500px] maxsm:w-full r`}
                imgSrc={servicio?.imgSrc}
                imgWidth={1000}
                imgHeight={1000}
                imgAlt="Super Collectibles Mx"
                imgClassName="object-cover w-full h-full"
                title={servicio?.title}
                text={servicio?.text}
                divDuration={1}
              />
            ))}
          </div>
        </div>
        <Link
          href={"/tienda"}
          className="border-b bg-primary px-6 py-3 rounded-full text-white border-b-gray-400 mt-20 tracking-wide font-raleway uppercase"
        >
          Explorar La Tienda
        </Link>
      </SectionLayoutComponet>
    </>
  );
};

export default SectionOneComponent;
