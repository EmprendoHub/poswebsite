import React from "react";
import ColTextComponent from "@/components/texts/ColTextComponent";
import ImageRightMotion from "@/components/images/ImageRightMotion";
import Image from "next/image";
import LogoComponent from "@/components/layouts/LogoComponent";
import Link from "next/link";

const MainHeroComponent = () => {
  return (
    <div
      className={`min-w-full min-h-screen relative flex flex-col justify-center items-center`}
    >
      {/* overlay */}
      <div className="h-full flex flex-wrap bg-black bg-opacity-85 w-full absolute bottom-0 right-0 z-[1]" />
      <div className="absolute flex flex-col items-center justify-center z-20 w-[70%] maxmd:w-[100%]  px-5">
        <Link href={"/torneos"}>
          <Image
            alt="Super Collectibles Mx"
            src="/covers/TorneosPokemon.webp"
            width={1920}
            height={400}
            className="object-cover rounded-[5px]"
          />
        </Link>
        <ColTextComponent
          pretitle={"TORNEOS"}
          title={"Pokemon TCG"}
          subtitle={
            "¡Participa en nuestros Torneos de Pokémon TCG y demuestra que eres el mejor Entrenador! Compite, gana premios increíbles y vive la emoción de cada partida. Regístrate ahora, asegura tu lugar y prepárate para la batalla. ¡El desafío te espera, no te quedes fuera, inscríbete hoy mismo!"
          }
          btnUrl={`/torneos`}
          btnText={"Saber Mas"}
        />
      </div>

      {/* Updated Image Component */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Super Collectibles Mx"
          src="/covers/Cover_Pokemon_dos.jpg"
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          quality={100}
        />
      </div>
    </div>
  );
};

export default MainHeroComponent;
