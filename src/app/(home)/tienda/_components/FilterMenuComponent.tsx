"use client";
import React from "react";
import AllFiltersComponent from "./AllFiltersComponent";

const FilterMenuComponent = ({
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
    <div className="w-full">
      <AllFiltersComponent
        allBrands={allBrands}
        allCategories={allCategories}
        allGenders={allGenders}
        priceRange={priceRange}
        SetIsActive={SetIsActive}
      />
    </div>
  );
};

export default FilterMenuComponent;
