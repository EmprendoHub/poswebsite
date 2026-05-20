"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AllFiltersComponent = ({
  allBrands,
  allCategories,
  allGenders,
  priceRange,
  SetIsActive,
}: {
  allBrands: string[];
  allCategories: string[];
  allGenders: string[];
  priceRange: { min: number; max: number };
  SetIsActive: (active: boolean) => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for filters - using undefined instead of empty string
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    searchParams.get("category") || undefined
  );
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
    searchParams.get("brand") || undefined
  );
  const [selectedGender, setSelectedGender] = useState<string | undefined>(
    searchParams.get("gender") || undefined
  );
  const [priceValues, setPriceValues] = useState<[number, number]>([
    parseInt(searchParams.get("minPrice") || priceRange.min.toString()),
    parseInt(searchParams.get("maxPrice") || priceRange.max.toString()),
  ]);

  // Auto-search after 4th character
  useEffect(() => {
    if (searchTerm.length >= 4 || searchTerm.length === 0) {
      const timer = setTimeout(() => {
        updateURL();
      }, 300);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Update URL when filters change
  useEffect(() => {
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedBrand, selectedGender, priceValues]);

  const updateURL = () => {
    const params = new URLSearchParams();

    if (searchTerm.length >= 4) {
      params.set("search", searchTerm);
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedBrand) {
      params.set("brand", selectedBrand);
    }

    if (selectedGender) {
      params.set("gender", selectedGender);
    }

    if (priceValues[0] !== priceRange.min) {
      params.set("minPrice", priceValues[0].toString());
    }

    if (priceValues[1] !== priceRange.max) {
      params.set("maxPrice", priceValues[1].toString());
    }

    const queryString = params.toString();
    const newURL = queryString ? `/tienda?${queryString}` : "/tienda";

    router.push(newURL);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory(undefined);
    setSelectedBrand(undefined);
    setSelectedGender(undefined);
    setPriceValues([priceRange.min, priceRange.max]);
    router.push("/tienda");
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.length > 0 ||
      selectedCategory !== undefined ||
      selectedBrand !== undefined ||
      selectedGender !== undefined ||
      priceValues[0] !== priceRange.min ||
      priceValues[1] !== priceRange.max
    );
  }, [
    searchTerm,
    selectedCategory,
    selectedBrand,
    selectedGender,
    priceValues,
    priceRange,
  ]);

  // Handle select changes with proper clearing
  const handleCategoryChange = (value: string) => {
    if (value === "all") {
      setSelectedCategory(undefined);
    } else {
      setSelectedCategory(value);
    }
  };

  const handleBrandChange = (value: string) => {
    if (value === "all") {
      setSelectedBrand(undefined);
    } else {
      setSelectedBrand(value);
    }
  };

  const handleGenderChange = (value: string) => {
    if (value === "all") {
      setSelectedGender(undefined);
    } else {
      setSelectedGender(value);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile Layout (Vertical) */}
      <div className="lg:hidden space-y-6">
        {/* Clear all filters */}
        {hasActiveFilters && (
          <Button
            onClick={clearAllFilters}
            variant="outline"
            className="w-full"
          >
            Limpiar filtros
          </Button>
        )}

        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar producto</label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              type="text"
              placeholder="Buscar... (mín. 4 caracteres)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm.length > 0 && searchTerm.length < 4 && (
            <p className="text-xs text-gray-500">
              Escribe al menos 4 caracteres para buscar
            </p>
          )}
        </div>

        {/* Price Range Slider */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Rango de precio</label>
          <div className="px-3">
            <Slider
              value={priceValues}
              onValueChange={(value) =>
                setPriceValues(value as [number, number])
              }
              max={priceRange.max}
              min={priceRange.min}
              step={50}
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between text-sm ">
            <span>${priceValues[0].toLocaleString()}</span>
            <span>${priceValues[1].toLocaleString()}</span>
          </div>
        </div>

        {/* Categories Dropdown */}
        {allCategories.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select
              value={selectedCategory || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {allCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Brands Dropdown */}
        {allBrands.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Certificador</label>
            <Select
              value={selectedBrand || "all"}
              onValueChange={handleBrandChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar certificador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los certificadores</SelectItem>
                {allBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Genders Dropdown */}
        {allGenders.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Género</label>
            <Select
              value={selectedGender || "all"}
              onValueChange={handleGenderChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los géneros</SelectItem>
                {allGenders.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Desktop Layout (Horizontal) */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Precio</label>
            <div className="px-3">
              <Slider
                value={priceValues}
                onValueChange={(value) =>
                  setPriceValues(value as [number, number])
                }
                max={priceRange.max}
                min={priceRange.min}
                step={50}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>${priceValues[0].toLocaleString()}</span>
              <span>${priceValues[1].toLocaleString()}</span>
            </div>
          </div>

          {/* Categories Dropdown */}
          {allCategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={selectedCategory || "all"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {allCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.length > 15
                        ? `${category.substring(0, 15)}...`
                        : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Brands Dropdown */}
          {allBrands.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Certificador</label>
              <Select
                value={selectedBrand || "all"}
                onValueChange={handleBrandChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Certificador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Genders Dropdown and Clear Button */}
          <div className="space-y-2">
            {allGenders.length > 0 && (
              <>
                <label className="text-sm font-medium">Género</label>
                <Select
                  value={selectedGender || "all"}
                  onValueChange={handleGenderChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allGenders.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                onClick={clearAllFilters}
                variant="outline"
                size="sm"
                className="w-full text-xs mt-2"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllFiltersComponent;
