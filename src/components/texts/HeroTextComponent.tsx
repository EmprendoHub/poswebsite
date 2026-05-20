"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const HeroTextComponent = ({
  title,
  subtitle,
  btnText,
  btnUrl,
}: {
  title: string;
  subtitle: string;
  btnText: string;
  btnUrl: string;
}) => {
  return (
    <div className="relative w-full h-full">
      <div className="flex h-full flex-col items-center gap-y-6 justify-center">
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-7xl maxmd:text-4xl font-bold  font-playfair-display "
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-base text-slate-100 font-poppins w-[70%]"
        >
          {subtitle}
        </motion.p>
        {btnText && btnUrl && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="flex gap-x-4 mt-2 justify-center"
          >
            <Link href={btnUrl}>
              <p className="py-3 px-8 rounded-full bg-background hover:text-black hover:bg-foreground hover: duration-700 text-sm uppercase font-semibold w-full">
                {btnText}
              </p>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HeroTextComponent;
