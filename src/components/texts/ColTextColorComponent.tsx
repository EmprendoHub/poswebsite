"use client";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";

const ColTextColorComponent = ({
  pretitle,
  title,
  subtitle,
  btnText,
  btnUrl = "/contacto",
  addressOne,
  addressTwo,
  tel,
  email,
}: {
  pretitle: string;
  title: string;
  subtitle: string;
  btnText: string;
  btnUrl: string;
  addressOne: string;
  addressTwo: string;
  tel: string;
  email: string;
}) => {
  return (
    <div className="h-auto">
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-base maxsm:text-md tracking-widest uppercase"
      >
        {pretitle}
      </motion.p>
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-2xl font-raleway font-black tracking-normal uppercase"
      >
        {title}{" "}
      </motion.h2>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-base  tracking-wide "
      >
        {subtitle}
      </motion.p>
      <motion.ul
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="
        text-base tracking-wide "
      >
        <li>{addressOne}</li>
        <li>{addressTwo}</li>
        <li>{tel}</li>
        <li>{email}</li>
      </motion.ul>
      {btnText && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          className="mt-5"
        >
          <Link
            href={btnUrl}
            className="pt-3 uppercase text-sm rounded-full px-6 py-3 bg-primary drop-shadow-sm text-white duration-300"
          >
            {btnText}
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default ColTextColorComponent;
