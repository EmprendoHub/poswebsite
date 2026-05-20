"use client";
import React, { useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import WhiteLogoComponent from "../layouts/WhiteLogoComponent";
import { MdEmail } from "react-icons/md";
import { BsFacebook, BsInstagram } from "react-icons/bs";
import Image from "next/image";
import { X } from "lucide-react";

const navLinks = [
  { title: "Torneos", url: "/torneos" },
  { title: "Tienda", url: "/tienda" },
  { title: "Nosotros", url: "/acerca" },
  { title: "Contacto", url: "/contacto" },
];

const MobileMenuComponent = () => {
  const [open, setOpen] = useState(false);
  const toggleMobileMenu = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const menuVariants = {
    initial: {
      x: "-100%",
    },
    animate: {
      x: "-10%",
      transition: {
        duration: 0.5,
        ease: [0.12, 0, 0.39, 0],
      },
    },
    exit: {
      x: "-100%",
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const containerVariants = {
    initial: {
      transition: {
        staggerChildren: 0.09,
        staggerDirection: -1,
      },
    },
    open: {
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.09,
        staggerDirection: 1,
      },
    },
  };

  return (
    <>
      <nav>
        {/*Mobile Navigation*/}
        <div
          onClick={toggleMobileMenu}
          className=" maxmd:flex maxmd:flex-row items-center justify-center gap-x-2 text-white cursor-pointer text-sm"
        >
          <AiOutlineMenu size={18} />
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <>
            {/* Blurred Overlay */}
            <motion.div
              onClick={toggleMobileMenu}
              className="fixed inset-0 z-[998] bg-black bg-opacity-50 backdrop-blur-md min-h-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
            <motion.div
              variants={menuVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed z-[999] left-8 top-0 w-auto min-h-screen bg-black text-white px-5  origin-top"
            >
              <div className="flex h-full flex-col place-items-center ">
                {/* Logo and Close  */}
                <div className=" flex fle-row items-center justify-center gap-x-[200px] ml-3 mt-1 w-full">
                  <div onClick={toggleMobileMenu}>
                    <WhiteLogoComponent className="w-[80px] my-3" />
                  </div>
                  <div className="flex items-center justify-center gap-x-4">
                    <motion.a
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleMobileMenu}
                    >
                      <span className="socialLink">
                        <X className="text-2xl text-red-700" />
                      </span>
                    </motion.a>
                  </div>
                </div>
                {/* Cats Menu */}
                <div className="flex px-2 gap-3 flex-col items-center justify-center w-full h-auto z-[1]">
                  {/* Image Section 1 */}
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.9 }}
                    whileHover={{
                      scale: 1.05,
                      rotate: 1,
                      boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-[320px] h-auto "
                  >
                    <Link
                      href={"/tienda?gender=Pokemon"}
                      onClick={toggleMobileMenu}
                    >
                      <Image
                        alt="Super Collectibles Mx"
                        src="/covers/PokemonCategoryTemplate.webp"
                        width={1920}
                        height={400}
                        className="object-cover rounded-[5px]"
                      />
                    </Link>
                  </motion.div>

                  {/* Image Section 2 */}
                  <div className="flex flex-col relative gap-3 items-center justify-center w-[320px] h-full">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=UFC"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/UFC_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=Futbol"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/Soccer_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Image Section 3 */}
                  <div className="flex relative gap-3 items-center justify-center w-[320px] h-full">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=Basketball"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/NBA_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=American+Football"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/NFL_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Image Section 5 */}
                  <div className="flex relative gap-3 items-center justify-center w-[320px] h-full">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=Baseball"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/MLB_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=Tenis"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/Tenis_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Image Section 6 */}
                  <div className="flex relative gap-3 items-center justify-center w-[320px] h-full">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=Yu-Gi-Oh"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/yugi_Category.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      whileHover={{
                        scale: 1.05,
                        rotate: 1,
                        boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full h-30"
                    >
                      <Link
                        href={"/tienda?gender=One+Piece"}
                        onClick={toggleMobileMenu}
                      >
                        <Image
                          alt="Super Collectibles Mx"
                          src="/covers/Group3.webp"
                          width={1920}
                          height={400}
                          className="object-cover rounded-[5px]"
                        />
                      </Link>
                    </motion.div>
                  </div>
                </div>
                {/* Menu links */}
                <motion.div
                  variants={containerVariants}
                  initial="initial"
                  animate="open"
                  exit="initial"
                  className="flex flex-wrap h-full justify-center font-raleway font-black tracking-wider items-center gap-x-3 relative max-w-fit mt-5"
                >
                  {navLinks?.map((link, index) => {
                    return (
                      <div key={index} className="overflow-hidden">
                        <MobileNavLink
                          title={link.title}
                          href={link.url}
                          toggleMobileMenu={toggleMobileMenu}
                        />
                      </div>
                    );
                  })}
                </motion.div>
                {/* Social links */}
                <div className="flex items-center justify-center gap-x-4 mt-5">
                  <motion.a
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    href="https://www.instagram.com/supercollectibles_mx"
                    target="_blank"
                  >
                    <span className="socialLink">
                      <BsInstagram className="text-2xl" />
                    </span>
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    href="https://www.facebook.com/profile.php?id=61564208924734"
                    target="_blank"
                  >
                    <span className="socialLink">
                      <BsFacebook className="text-2xl" />
                    </span>
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    href="mailto:supercollectiblesc12@gmail.com"
                    target="_blank"
                  >
                    <span className="socialLink">
                      <MdEmail className="text-3xl" />
                    </span>
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileMenuComponent;

const mobileNavLinksVariants = {
  initial: {
    x: "-100%",
    transition: {
      duration: 0.5,
      ease: [0.37, 0, 0.63, 1],
    },
  },
  open: {
    x: 0,
    transition: {
      duration: 0.7,
      ease: [0, 0.35, 0.45, 1],
    },
  },
};

const MobileNavLink = ({
  title,
  href,
  toggleMobileMenu,
}: {
  title: string;
  href: string;
  toggleMobileMenu: any;
}) => {
  return (
    <motion.div
      variants={mobileNavLinksVariants}
      className="text-sm uppercase text-white"
    >
      <Link href={href} onClick={toggleMobileMenu}>
        {title}
      </Link>
    </motion.div>
  );
};
