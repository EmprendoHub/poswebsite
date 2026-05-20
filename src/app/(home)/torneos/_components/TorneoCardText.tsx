"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const TorneoCardText = ({
  title = "",
  paraOne = "",
  paraTwo = "",
  btnText,
  btnUrl,
}: {
  title: string;
  paraOne: string;
  paraTwo: string;
  btnText: string;
  btnUrl: string;
}) => {
  return (
    <div className="mx-auto">
      <div className="flex h-full flex-col gap-y-6 justify-center  text-center">
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-2xl maxmd:text-xl font-semibold font-EB_Garamond "
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.9 }}
          className="text-base text-white"
        >
          {paraOne}
        </motion.p>
        <motion.p
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.0 }}
          className="text-base text-white"
        >
          {paraTwo}
        </motion.p>

        {btnText && btnUrl && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex gap-x-4 mt-2 justify-center"
          >
            <Link href={btnUrl}>
              <p className="py-3 px-8 rounded-full bg-black text-white hover:bg-background hover:text-foreground duration-700 text-sm uppercase font-semibold w-full">
                {btnText}
              </p>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TorneoCardText;
