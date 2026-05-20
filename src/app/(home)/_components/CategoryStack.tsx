"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const CategoryStack = () => {
  return (
    <div
      className={`maxmd:w-full maxlg:w-[80%] w-[70%] h-auto relative flex flex-col justify-center items-center my-10 mx-auto overflow-x-hidden`}
    >
      <div className="w-full h-20 absolute z-0 -top-10 bg-gradient-to-t from-black via-black to-black/30 blur-sm" />
      <div className="w-full h-20 absolute z-0 -top-5 bg-gradient-to-b from-black via-black to-black/30 blur-sm" />

      {/* Image Section 1 (Main) */}
      <div className="flex px-2 gap-3 flex-col items-center justify-center w-full h-auto z-[1]">
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
          className="relative w-full h-auto "
        >
          <Link href={"/tienda?gender=Pokemon"}>
            <Image
              alt="Super Collectibles Mx"
              src="/covers/PokemonCategoryTemplate.webp"
              width={1920}
              height={400}
              className="object-cover rounded-[5px]"
            />
          </Link>
        </motion.div>
        {/* Image Section 6 */}
        <div className="flex maxsm:flex-col relative gap-3 items-center justify-center w-full h-full">
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
            <Link href={"/tienda?gender=Yu-Gi-Oh"}>
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
            <Link href={"/tienda?gender=One+Piece"}>
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

        {/* Image Section 7 */}
        <div className="flex maxsm:flex-col relative gap-3 items-center justify-center w-full h-full">
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
            <Link href={"/tienda?gender=Dragon+Ball"}>
              <Image
                alt="Super Collectibles Mx"
                src="/covers/Group4.webp"
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
            <Link href={"/tienda?gender=Star+Wars"}>
              <Image
                alt="Super Collectibles Mx"
                src="/covers/Group5.webp"
                width={1920}
                height={400}
                className="object-cover rounded-[5px]"
              />
            </Link>
          </motion.div>
        </div>

        {/* Image Section 8 */}
        <div className="flex maxsm:flex-col relative gap-3 items-center justify-center w-full h-full">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.9 }}
            whileHover={{
              scale: 1.05,
              rotate: 1,
              boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
            }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full h-30"
          >
            <Link href={"/tienda?gender=Magic"}>
              <Image
                alt="Super Collectibles Mx"
                src="/covers/Group6.webp"
                width={1920}
                height={400}
                quality={100}
                className="object-cover  rounded-[5px]"
              />
            </Link>
          </motion.div>
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.9 }}
            whileHover={{
              scale: 1.05,
              rotate: 1,
              boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.3)",
            }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full h-30"
          >
            <Link href={"/tienda?gender=Disney"}>
              <Image
                alt="Super Collectibles Mx"
                src="/covers/Group7.webp"
                width={1920}
                height={400}
                quality={100}
                className="object-cover rounded-[5px]"
              />
            </Link>
          </motion.div>
        </div>
        {/* Image Section 3 */}
        <div className="flex maxsm:flex-col relative gap-3 items-center justify-center w-full h-full">
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
            <Link href={"/tienda?gender=UFC"}>
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
            <Link href={"/tienda?gender=Futbol"}>
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

        {/* Image Section 4 */}
        <div className="flex maxsm:flex-col relative gap-3 items-center justify-center w-full h-full">
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
            <Link href={"/tienda?gender=Basketball"}>
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
            <Link href={"/tienda?gender=American+Football"}>
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
        <div className="flex maxsm:flex-col relative gap-3 items-center justify-center w-full h-full">
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
            <Link href={"/tienda?gender=Baseball"}>
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
            <Link href={"/tienda?gender=Tenis"}>
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
      </div>
    </div>
  );
};

export default CategoryStack;
