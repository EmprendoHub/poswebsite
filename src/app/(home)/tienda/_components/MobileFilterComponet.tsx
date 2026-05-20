"use client";
import styles from "./boxfilterstyle.module.css";
import { motion } from "framer-motion";
import AllFiltersComponent from "./AllFiltersComponent";
import React from "react";

const MobileFilterComponent = ({
  allBrands,
  allCategories,
  allGenders,
  priceRange,
  SetIsActive,
  isActive,
}: {
  allBrands: string[];
  allCategories: string[];
  allGenders: string[];
  priceRange: { min: number; max: number };
  SetIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  isActive: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
      onClick={() => SetIsActive(false)}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="absolute right-0 top-0 h-full w-80 bg-card shadow-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <AllFiltersComponent
            allBrands={allBrands}
            allCategories={allCategories}
            allGenders={allGenders}
            priceRange={priceRange}
            SetIsActive={SetIsActive}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MobileFilterComponent;
