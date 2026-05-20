"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SectionTextComponent = ({
  title,
  paraOne,
  paraTwo = "",
  btnText = "Catalog",
  btnUrl = "/catalog",
}: {
  title: string;
  paraOne: string;
  paraTwo: string;
  btnText: string;
  btnUrl: string;
}) => {
  return (
    <div className="mx-[10%]">
      <div className="flex h-full flex-col gap-y-6 justify-center">
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl lg:text-2xl font-bold font-raleway uppercase tracking-wide "
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-base text-white font-poppins"
        >
          {paraOne}
        </motion.p>
        <motion.p
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="text-base text-white font-poppins "
        >
          {paraTwo}
        </motion.p>
        {/* button */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex gap-x-4 mt-2 justify-center"
        >
          <Link href={btnUrl}>
            <Button variant="default">{btnText}</Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default SectionTextComponent;
