"use client";
import React, { useState } from "react";
import MainMenuComponent from "./MainMenuComponent";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import LogoComponent from "../layouts/LogoComponent";
import { BsFacebook, BsInstagram, BsWhatsapp } from "react-icons/bs";
import { ModeToggle } from "../ui/mode-toggle";
import GlobalSearch from "../layouts/GlobalSearch";
import { MdEmail } from "react-icons/md";

const MotionHeaderComponent = ({ session }: { session: any }) => {
  const [hidden, setHidden] = useState(true);
  const { scrollY } = useScroll();

  // useMotionValueEvent(scrollY, "change", (latest) => {
  //   const previous: any = scrollY.getPrevious();
  //   if (latest > previous && latest > 300) {
  //     setHidden(false);
  //   } else {
  //     setHidden(true);
  //   }
  // });

  return (
    <motion.div
      variants={{ hidden: { y: 0 }, visible: { y: "-100%" } }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="header-class bg-black text-slate-100 shadow-sm text-xl sticky top-0 z-[50]  w-full mx-auto"
    >
      {/* <div className="flex flex-row justify-center items-center w-full py-2 gap-x-3 maxmd:hidden ">
        
        <div className=" object-contain justify-center">
          <LogoComponent className="w-[100px]" />
        </div>
        <GlobalSearch className={""} />
      </div> */}
      <MainMenuComponent className={""} session={session} />
    </motion.div>
  );
};

export default MotionHeaderComponent;
