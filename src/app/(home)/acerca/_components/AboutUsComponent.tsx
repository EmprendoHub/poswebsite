"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import SectionTextComponent from "@/components/texts/SectionTextComponent";
import CardTextComponent from "./CardTextComponent";
import HeroTextComponent from "@/components/texts/HeroTextComponent";
// Placeholder images
import InnerSectionTextComponent from "@/components/texts/InnerSectionTextComponent";
import HeroColTextComponent from "@/components/texts/HeroColTextComponent";

const AboutUsComponent = () => {
  return (
    <div>
      <section className="min-h-[200px] flex flex-row maxsm:flex-col justify-center items-center relative overflow-hidden bg-primary">
        <div className="container mx-auto flex justify-center items-center text-center p-5 sm:py-20 z-10">
          <HeroColTextComponent
            pretitle={"CONOCE A"}
            title={"Super Collectibles MX"}
            subtitle={"Tu principal destino para coleccionables Y memorabilia "}
            word={""}
            className={""}
          />
        </div>
      </section>

      <section className=" text-center pt-12 mx-auto">
        <div className="container mx-auto">
          <h3 className="text-4xl maxmd:text-2xl font-semibold font-raleway  mb-5">
            {"¿Por Qué Elegir Super Collectibles MX?"}
          </h3>
          <p className="text-white font-raleway text-base">
            {
              "En Super Collectibles MX utilizamos nuestra experiencia colectiva para brindarte:"
            }
          </p>

          <div className="flex maxmd:flex-col items-center justify-center gap-4 mt-5">
            <div className="w-full bg-background  px-3 py-4 shadow-md">
              <Image
                src={"/images/Expertos_en_collecionables.webp"}
                width={500}
                height={500}
                alt="Icon"
                className="mx-auto mb-4 object-cover  w-80 h-80"
              />

              <CardTextComponent
                title={"Expertos en Coleccionables"}
                paraOne={
                  "Somos apasionados coleccionistas con décadas de experiencia que entienden el nicho del coleccionables y tus necesidades."
                }
                paraTwo={""}
                btnText={""}
                btnUrl={""}
              />
              <div className="mt-10" />
            </div>

            <div className="w-full bg-background   px-3 py-4  shadow-md">
              <Image
                src={"/images/Autenticidad_garantizada.webp"}
                width={500}
                height={500}
                alt="Icon"
                className="mx-auto mb-4 w-80 h-08 "
              />

              <CardTextComponent
                title={"Autenticidad Garantizada"}
                paraOne={
                  "Cada artículo que vendemos o compramos pasa por un riguroso proceso de verificación."
                }
                paraTwo={""}
                btnText={""}
                btnUrl={""}
              />
              <div className="mt-10" />
            </div>

            <div className="w-full bg-background px-3 py-4  shadow-md">
              <Image
                src={"/images/atencion_personalizada_james.webp"}
                width={500}
                height={500}
                alt="Icon"
                className="mx-auto mb-4 w-80 h-80 "
              />

              <CardTextComponent
                title={"Atención Personalizada"}
                paraOne={
                  "Estamos aquí para ayudarte en cada paso del camino, ya sea que estés buscando una tarjeta específica o desees vender tu colección."
                }
                paraTwo={""}
                btnText={""}
                btnUrl={""}
              />
              <div className="mt-10" />
            </div>
          </div>
        </div>
      </section>
      <section className=" text-center pb-12 w-[70%] maxmd:w-[90%] p-5 mx-auto">
        <div className=" mx-auto">
          <InnerSectionTextComponent
            title={"Experiencia Personalizada"}
            paraOne={
              "En Super Collectibles MX somos más que una tienda de tarjetas y artículos coleccionables. Somos un equipo de entusiastas y coleccionistas apasionados por conectar a personas con los productos que aman. "
            }
            paraTwo={
              "Desde nuestros inicios, hemos trabajado para ser un referente en la compra y venta de tarjetas de Pokémon, béisbol, Magic: The Gathering, y otros artículos coleccionables de alta calidad."
            }
            btnText={"Platica con un asesor"}
            btnUrl={"/contacto"}
          />
        </div>
      </section>
      <section className="h-auto flex flex-row maxsm:flex-col justify-center items-center relative">
        <div className=" mx-auto flex justify-center items-center text-center p-5 py-20 bg-primary z-10">
          <HeroTextComponent
            title={"Una Experiencia de Compra Excepcional"}
            subtitle={
              "En Super Collectibles MX, valoramos la importancia de una experiencia de compra sin complicaciones."
            }
            btnText={"Visitar Tienda"}
            btnUrl={`/tienda`}
          />
        </div>
      </section>
      <div className="flex flex-row w-[80%] maxmd:w-full maxmd:flex-col items-center mx-auto my-20 px-1">
        <section className="text-center w-1/2 maxmd:w-full">
          <div className=" mx-auto px-6 maxsm:px-3">
            <SectionTextComponent
              title={"Nuestra Misión"}
              paraOne={
                "Nuestra misión es brindar una experiencia única a los coleccionistas, ofreciendo un servicio confiable, productos auténticos y precios justos."
              }
              paraTwo={
                "Nos esforzamos por proporcionar una plataforma segura donde puedas comprar y vender tus artículos con total tranquilidad."
              }
              btnText={"Contactar"}
              btnUrl={`/contacto`}
            />
          </div>
        </section>

        <section className=" text-center w-1/2 maxmd:w-full maxmd:mt-5">
          {/* Image */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="flex gap-x-4 mt-2 justify-center"
          >
            <div className="bg-background  p-4 shadow-md">
              <Image
                src={"/images/PWCCsm2.jpg"}
                width={550}
                height={550}
                alt="Super Collectibles MX"
                className="mx-auto mb-4 w-full h-full "
              />
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default AboutUsComponent;
