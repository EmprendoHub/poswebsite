"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import WhiteLogoComponent from "./WhiteLogoComponent";

const FooterMenu = () => {
  return (
    <div className="w-full bg-black  px-20 maxmd:px-5 py-24 grid xsm:grid-cols-1 maxmd:grid-cols-2 grid-cols-4 gap-10 text-white">
      <div className=" flex flex-col justify-start">
        <WhiteLogoComponent className="w-[100px]" />
        <p className="text-xs mt-1">{"Super Collectibles Mx"}</p>
        <span className="flex flex-row items-center  text-xs">
          <p className="">{" Centro Magno"}</p>
        </span>
        <span className=" text-xs mt-1">
          <p className="">
            {
              "Av. Ignacio L Vallarta 2425, Arcos Vallarta, 44130 Guadalajara, Jal."
            }
          </p>
        </span>
        <div className="flex item-center justify-start text-[12px] gap-x-1 mt-1">
          <Link
            href={"tel:+523328123760"}
            className="flex flex-row items-center  "
          >
            <p>{"332-812-3760"}</p>
          </Link>
        </div>
      </div>
      <div className="column-1 mt-10">
        <p className="text-sm">{"Atención al cliente"}</p>
        <ul className="text-xs font-light mt-2 flex flex-col gap-y-2 ">
          <Link href={`/contacto`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Solicita una cita"}
            </motion.li>
          </Link>
          <Link href={`/contacto`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Contacto"}
            </motion.li>
          </Link>

          <Link href={`/contacto`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Ubicación"}
            </motion.li>
          </Link>
        </ul>
      </div>
      <div className="column-2 mt-10">
        <p className="text-sm">{"Servicios"}</p>
        <ul className="text-xs font-light mt-2 flex flex-col gap-y-2">
          <Link href={`/tienda`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Tienda en Linea"}
            </motion.li>
          </Link>

          <Link href={`/torneos`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary  cursor-pointer duration-200"
            >
              {"Torneos de Pokemon"}
            </motion.li>
          </Link>

          <Link href={`/`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary  cursor-pointer duration-200"
            >
              {"Servicio de Autentificación"}
            </motion.li>
          </Link>
        </ul>
      </div>
      <div className="column-3 mt-10">
        <p className="text-sm mb-2"> {"Corporativo"}</p>
        <ul className="text-xs font-light mt-2 flex flex-col gap-y-2">
          <Link href={`/terminos`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary  cursor-pointer duration-200"
            >
              {"Términos de Uso"}
            </motion.li>
          </Link>
          <Link href={`/politica-privacidad`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Política de Privacidad"}
            </motion.li>
          </Link>
          <Link href={`/`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Póliza de Envíos"}
            </motion.li>
          </Link>
          <Link href={`/acerca`}>
            <motion.li
              whileHover={{ y: -4 }}
              whileTap={{ y: 1 }}
              transition={{ duration: 0.15 }}
              className="hover:text-primary cursor-pointer duration-200"
            >
              {"Acerca de"}
            </motion.li>
          </Link>
        </ul>
      </div>
    </div>
  );
};

export default FooterMenu;
