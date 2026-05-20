"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import SectionTextComponent from "@/components/texts/SectionTextComponent";
import HeroTextComponent from "@/components/texts/HeroTextComponent";
// Placeholder images
import InnerSectionTextComponent from "@/components/texts/InnerSectionTextComponent";
import TorneoCardText from "./TorneoCardText";

const Torneos = () => {
  return (
    <div>
      <section className=" flex flex-row maxsm:flex-col justify-center items-center relative overflow-hidden bg-primary">
        <div className="container mx-auto flex justify-center items-center text-center p-5 z-10">
          <Image
            alt="Super Collectibles Mx"
            src="/covers/TorneosPokemon.webp"
            width={1920}
            height={400}
            className="object-cover rounded-[5px]"
          />
        </div>
      </section>

      <section className=" text-center pt-12 mx-auto">
        <div className="container mx-auto">
          <h3 className="text-4xl maxmd:text-2xl font-semibold font-raleway  mb-5">
            {"PARTICIPA Y GANA"}
          </h3>
          <p className="text-white font-raleway text-base">
            {
              "El escenario definitivo para demostrar tu estrategia, competir con otros entrenadores y llevarte increíbles premios."
            }
          </p>

          <div className="flex maxmd:flex-col items-center justify-center gap-4 mt-5">
            <div className="w-full bg-background  px-3 py-4 shadow-md">
              <Image
                src={"/covers/TorneosPKM1080_01.webp"}
                width={500}
                height={500}
                alt="Icon"
                className="mx-auto mb-4 object-cover  w-80 h-80"
              />

              <TorneoCardText
                title={"Torneos Competitivos"}
                paraOne={
                  "Pon a prueba tu mazo en un ambiente lleno de emoción, estrategia y rivalidad sana entre fans de Pokémon TCG."
                }
                paraTwo={""}
                btnText={""}
                btnUrl={""}
              />
              <div className="mt-10" />
            </div>

            <div className="w-full bg-background   px-3 py-4  shadow-md">
              <Image
                src={"/covers/TorneosPKM1080_02.webp"}
                width={500}
                height={500}
                alt="Icon"
                className="mx-auto mb-4 w-80 h-08 "
              />

              <TorneoCardText
                title={"Premios y Reconocimientos"}
                paraOne={
                  "Cada torneo ofrece recompensas únicas, desde sobres y cartas exclusivas hasta trofeos y productos coleccionables."
                }
                paraTwo={""}
                btnText={""}
                btnUrl={""}
              />
              <div className="mt-10" />
            </div>

            <div className="w-full bg-background px-3 py-4  shadow-md">
              <Image
                src={"/covers/TorneosPKM1080_04.webp"}
                width={500}
                height={500}
                alt="Icon"
                className="mx-auto mb-4 w-80 h-80 "
              />

              <TorneoCardText
                title={"Comunidad Pokémon"}
                paraOne={
                  "Conecta con otros entrenadores apasionados, comparte estrategias y haz nuevos amigos que disfrutan tanto como tú este increíble juego."
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
          <Image
            src={"/covers/TorneosPKM1080_05.webp"}
            width={400}
            height={400}
            alt="Super Collectibles MX"
            className="mx-auto mb-4 w-[400px] h-full "
          />
          <InnerSectionTextComponent
            title={"Más que una tienda, tu arena Pokémon"}
            paraOne={
              "En Super Collectibles MX no solo coleccionamos, ¡también jugamos! Creamos espacios diseñados para que entrenadores de todos los niveles disfruten de torneos emocionantes, con reglas claras y un ambiente amigable."
            }
            paraTwo={
              "Desde nuestros inicios, hemos buscado ser un punto de encuentro para coleccionistas y jugadores de Pokémon TCG, Magic: The Gathering, béisbol y mucho más."
            }
            btnText={"Inscríbete para participar"}
            btnUrl={"/contacto"}
          />
        </div>
      </section>
      <section className="h-auto flex flex-row maxsm:flex-col justify-center items-center relative">
        <div className=" mx-auto flex justify-center items-center text-center p-5 py-20 bg-primary z-10">
          <HeroTextComponent
            title={"Una Experiencia Pokémon Única"}
            subtitle={
              "Registro sencillo para participar en torneos. Eventos organizados con total transparencia.Premios garantizados y experiencias memorables."
            }
            btnText={"Inscríbete al próximo torneo"}
            btnUrl={`/tienda`}
          />
        </div>
      </section>
      <div className="flex flex-row w-[80%] maxmd:w-full maxmd:flex-col items-center mx-auto my-20 px-1">
        <section className="text-center w-1/2 maxmd:w-full">
          <div className=" mx-auto px-6 maxsm:px-3">
            <SectionTextComponent
              title={"Misión Pokemon"}
              paraOne={
                "Impulsar la pasión por Pokémon TCG, creando un espacio seguro, divertido y competitivo donde cada jugador tenga la oportunidad de brillar."
              }
              paraTwo={"¿Listo para demostrar que eres el mejor entrenador?"}
              btnText={"Inscríbete y juega"}
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
                src={"/covers/TorneosPKM1080_03.webp"}
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

export default Torneos;
