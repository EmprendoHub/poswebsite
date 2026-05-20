import SvgRightMotion from "@/components/images/SvgRightMotion";
import SectionLayoutComponet from "@/components/layouts/SectionLayoutComponet";
import ColTextComponent from "@/components/texts/ColTextComponent";
import Image from "next/image";
import React from "react";

const SectionEspecialidadesComponent = () => {
  return (
    <>
      <SectionLayoutComponet
        className={"bg-card flex justify-center   min-h-screen w-full "}
      >
        <div className="w-full px-40 maxmd:px-10 mx-auto relative">
          <div className="grid grid-cols-2 maxmd:grid-cols-1  items-center">
            <div className=" maxmd:my-20 maxsm:my-5 pr-10">
              {" "}
              <ColTextComponent
                pretitle={"Recursos Humanos"}
                title={"Central Medica de Especialidades"}
                subtitle={
                  "El personal que labora en esta institución esta capacitado y seleccionado para que desarrolle sus mejores cualidades, logrando de esta manera dar el mejor servicio, atendiendo de manera humana y profesional a nuestros pacientes y visitantes. Todos los que laboramos en Super Collectibles Mx estamos comprometidos con su salud, trabajamos para la obtención de logros y asi obtener la misión de esta institución, obteniendo un ambiente que favorezca la calidad de los servicios que aquí se ofrecen a los pacientes y médicos."
                }
                btnUrl={`/acerca`}
                btnText={"Saber Mas"}
              />
            </div>
            <div className="relative">
              <Image
                src={"/images/doctor-talking-with-patients-3.png"}
                width={1000}
                height={1000}
                alt="Servicios Medicos"
                className="z-10 relative"
              />
              <SvgRightMotion />
            </div>
          </div>
        </div>
      </SectionLayoutComponet>
    </>
  );
};

export default SectionEspecialidadesComponent;
