"use client";
import React from "react";
import AllFiltersComponent from "./AllFiltersComponent";

interface CategoryOption {
  _id: string;
  name: string;
}
interface SubCategoryOption extends CategoryOption {
  parent: string;
}

const FilterMenuComponent = ({
  allBrands,
  allCategories,
  allGenders,
  allMainCategories,
  allSubCategories,
  allAttributes,
  priceRange,
  SetIsActive,
  isActive,
}: {
  allBrands: string[];
  allCategories: string[];
  allGenders: string[];
  allMainCategories?: CategoryOption[];
  allSubCategories?: SubCategoryOption[];
  allAttributes?: CategoryOption[];
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
        allMainCategories={allMainCategories}
        allSubCategories={allSubCategories}
        allAttributes={allAttributes}
        priceRange={priceRange}
        SetIsActive={SetIsActive}
      />
    </div>
  );
};

export default FilterMenuComponent;

