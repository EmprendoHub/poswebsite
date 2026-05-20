"use client";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";

const MobileNavLink = ({ title, href }: { title: string; href: string }) => {
  return (
    <motion.div className="text-2xl uppercase">
      <Link href={href}>{title}</Link>
    </motion.div>
  );
};

export default MobileNavLink;
