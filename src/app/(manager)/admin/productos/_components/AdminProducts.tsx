"use client";
import Link from "next/link";
import Image from "next/image";
import {
  FaPencilAlt,
  FaStar,
  FaExclamationCircle,
  FaEye,
} from "react-icons/fa";
import { MdClose, MdStorefront } from "react-icons/md";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import Swal, { SweetAlertIcon } from "sweetalert2";
import SearchProducts from "@/app/(manager)/admin/productos/search";
import BarcodeScannerModal from "@/components/modals/BarcodeScannerModal";
import { MdQrCodeScanner } from "react-icons/md";
import {
  changeProductAvailability,
  deleteOneProduct,
  bulkUpdateProducts,
} from "@/app/_actions";
import { FaShop } from "react-icons/fa6";
import { TbWorldWww } from "react-icons/tb";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import { useSession } from "next-auth/react";
import { SiMercadopago } from "react-icons/si";
import ExportToTikTokButton from "./ExportToTikTokButton";

const AdminProducts = ({
  products,
  filteredProductsCount,
  search,
  perPage,
}: {
  products: any;
  filteredProductsCount: any;
  search: any;
  perPage: number;
}) => {
  const getPathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "super_admin";
  let pathname: string = "";
  if (getPathname.includes("admin")) {
    pathname = "admin";
  } else if (getPathname.includes("puntodeventa")) {
    pathname = "puntodeventa";
  } else if (getPathname.includes("marketplace")) {
    pathname = "marketplace";
  }
  const searchParams = useSearchParams();
  const searchValue = searchParams.get("page");
  const sortByParam = searchParams.get("sortBy");
  const sortDirParam = searchParams.get("sortDir");
  const [currentPage, setCurrentPage] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [selectAllInSearch, setSelectAllInSearch] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkGender, setBulkGender] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkLength, setBulkLength] = useState("");
  const [bulkWidth, setBulkWidth] = useState("");
  const [bulkHeight, setBulkHeight] = useState("");
  const [bulkWeight, setBulkWeight] = useState("");
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [stockPreview, setStockPreview] = useState<any | null>(null);
  const [stockPreviewLoading, setStockPreviewLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [brandOptions, setBrandOptions] = useState<any[]>([]);
  const [genderOptions, setGenderOptions] = useState<any[]>([]);
  const [stockPreviewRows, setStockPreviewRows] = useState<
    {
      storeName: string;
      total: number;
      details: { label: string; quantity: number }[];
    }[]
  >([]);
  const [stockCache, setStockCache] = useState<{ [productId: string]: number }>(
    {},
  );
  const [showScanner, setShowScanner] = useState(false);

  // Initialize stock cache from products' pre-fetched inventory data
  useEffect(() => {
    const cache: { [productId: string]: number } = {};
    if (products && products.length > 0) {
      products.forEach((product: any) => {
        // Use pre-fetched store inventory from server if available
        if (product.storeInventory && Array.isArray(product.storeInventory)) {
          const total = product.storeInventory.reduce(
            (sum: number, inv: any) => sum + (inv.quantity || 0),
            0,
          );
          cache[product._id] = total;
        } else {
          // Fallback to product.stock if available
          cache[product._id] = product.stock || 0;
        }
      });
    }
    setStockCache(cache);
  }, [products]);

  // Sorting state - initialize from URL params
  const [sortKey, setSortKey] = useState<
    "title" | "category" | "gender" | "brand" | "price" | "stock" | null
  >((sortByParam as any) || null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    (sortDirParam as "asc" | "desc") || "asc",
  );

  const closePreview = useCallback(() => setPreviewImage(null), []);
  const closeStockPreview = useCallback(() => {
    setStockPreview(null);
    setStockPreviewRows([]);
  }, []);

  const toggleSort = (
    key: "title" | "category" | "gender" | "brand" | "price" | "stock",
  ) => {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);

    // Update URL with sort params and reset to page 1
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get("keyword") || "";
    let newUrl = `?sortBy=${key}&sortDir=${newDir}&page=1`;
    if (keyword) {
      newUrl += `&keyword=${encodeURIComponent(keyword)}`;
    }
    startTransition(() => {
      router.push(newUrl);
    });
  };

  const openStockPreview = useCallback(async (product: any) => {
    setStockPreview(product);
    setStockPreviewLoading(true);
    setStockPreviewRows([]);
    try {
      // Use pre-fetched storeInventory from product if available
      let inventoryData: any[] = [];

      if (product.storeInventory && Array.isArray(product.storeInventory)) {
        inventoryData = product.storeInventory;
      } else {
        // Fallback to API call if storeInventory is not pre-fetched
        const res = await fetch(
          `/api/store-inventory?productId=${product._id}`,
        );
        const data = await res.json();

        // Handle array response (individual), object with productId key (batch), or data property
        if (Array.isArray(data)) {
          inventoryData = data;
        } else if (typeof data === "object" && data[product._id]) {
          inventoryData = data[product._id];
        } else if (Array.isArray(data?.data)) {
          inventoryData = data.data;
        }
      }

      if (!Array.isArray(inventoryData) || inventoryData.length === 0) return;

      const grouped = inventoryData.reduce((acc: any, rec: any) => {
        const storeName = rec.store?.name ?? "—";
        const variation = rec.product?.variations?.find(
          (vr: any) => vr._id?.toString() === rec.variationId?.toString(),
        );
        const label =
          variation?.title ||
          [variation?.color, variation?.size].filter(Boolean).join(" / ") ||
          rec.variationId?.toString()?.slice(-6) ||
          "—";

        if (!acc[storeName]) {
          acc[storeName] = { total: 0, details: [] as any[] };
        }
        acc[storeName].total += Number(rec.quantity ?? 0);
        acc[storeName].details.push({
          label,
          quantity: Number(rec.quantity ?? 0),
        });
        return acc;
      }, {});

      setStockPreviewRows(
        Object.entries(grouped)
          .map(([storeName, value]: any) => ({
            storeName,
            total: value.total,
            details: value.details,
          }))
          .sort((a, b) => b.total - a.total),
      );

      // Cache the total stock for this product
      const totalStockForProduct = Object.values(grouped).reduce(
        (sum: number, store: any) => sum + store.total,
        0,
      );
      setStockCache((prev) => ({
        ...prev,
        [product._id]: totalStockForProduct,
      }));
    } catch {
      setStockPreviewRows([]);
    } finally {
      setStockPreviewLoading(false);
    }
  }, []);

  // No need to fetch inventory on client - it's pre-populated from server via getAllProduct

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const [categoriesRes, brandsRes, gendersRes] = await Promise.all([
          fetch("/api/product-details?catType=category", {
            credentials: "include",
          }),
          fetch("/api/product-details?catType=brand", {
            credentials: "include",
          }),
          fetch("/api/product-details?catType=gender", {
            credentials: "include",
          }),
        ]);

        const categoriesData = await categoriesRes.json();
        const brandsData = await brandsRes.json();
        const gendersData = await gendersRes.json();

        setCategoryOptions(categoriesData.details || []);
        setBrandOptions(brandsData.details || []);
        setGenderOptions(gendersData.details || []);
      } catch (error) {
        console.error("Error fetching ProductDetails:", error);
      }
    };

    fetchProductDetails();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePreview();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview]);

  useEffect(() => {
    if (searchValue !== null) {
      setCurrentPage(searchValue);
    } else {
      setCurrentPage(""); // or any default value you prefer
    }
  }, [searchValue]);

  // Handle select all checkbox (page only)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allProductIds = products.map((p: any) => p._id);
      setSelectedProducts(new Set(allProductIds));
    } else {
      setSelectedProducts(new Set());
    }
    setSelectAllInSearch(false);
  };

  // Handle select all in search results
  const handleSelectAllInSearch = (checked: boolean) => {
    setSelectAllInSearch(checked);
    if (checked) {
      setSelectedProducts(new Set());
    }
  };

  // Handle individual product selection
  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedProducts);
    if (checked) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    setSelectedProducts(newSelection);
  };

  const handleBulkUpdate = async () => {
    const hasDims = bulkLength || bulkWidth || bulkHeight;
    if (!bulkCategory && !bulkGender && !bulkBrand && !hasDims && !bulkWeight)
      return;

    const isSearchWide = selectAllInSearch;
    const count = isSearchWide ? filteredProductsCount : selectedProducts.size;
    const scopeLabel = isSearchWide ? "búsqueda" : "página";

    const parts = [];
    if (bulkCategory) parts.push(`categoría "${bulkCategory}"`);
    if (bulkGender) parts.push(`género "${bulkGender}"`);
    if (bulkBrand) parts.push(`marca "${bulkBrand}"`);
    if (bulkWeight) parts.push(`peso ${bulkWeight}kg`);
    if (hasDims)
      parts.push(
        `dimensiones (${bulkLength || "—"}×${bulkWidth || "—"}×${bulkHeight || "—"} cm)`,
      );

    const confirmed = await Swal.fire({
      title: `¿Actualizar ${count} producto(s)?`,
      text: `Se aplicará: ${parts.join(" y ")} a ${count} producto(s) de esta ${scopeLabel}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#228B22",
      cancelButtonColor: "#000",
      confirmButtonText: "Sí, actualizar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmed.isConfirmed) return;
    setIsBulkLoading(true);
    try {
      const updatePayload = {
        category: bulkCategory || undefined,
        gender: bulkGender || undefined,
        brand: bulkBrand || undefined,
        weight: bulkWeight ? Number(bulkWeight) : undefined,
        dimensions: hasDims
          ? {
              length: bulkLength ? Number(bulkLength) : undefined,
              width: bulkWidth ? Number(bulkWidth) : undefined,
              height: bulkHeight ? Number(bulkHeight) : undefined,
            }
          : undefined,
      };

      if (isSearchWide) {
        // Update all products matching the search
        const searchParams = new URLSearchParams(window.location.search);
        const keyword = searchParams.get("keyword") || "";
        const response = await fetch("/api/products/bulk-update-by-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            updates: updatePayload,
          }),
        });
        if (!response.ok) throw new Error("Failed to update products");
      } else {
        // Update selected products
        await bulkUpdateProducts(Array.from(selectedProducts), updatePayload);
      }

      await Swal.fire({
        title: "¡Actualizado!",
        text: `${count} producto(s) actualizados correctamente.`,
        icon: "success",
        confirmButtonColor: "#228B22",
      });
      setSelectedProducts(new Set());
      setSelectAllInSearch(false);
      setBulkCategory("");
      setBulkGender("");
      setBulkBrand("");
      setBulkWeight("");
      setBulkLength("");
      setBulkWidth("");
      setBulkHeight("");
    } catch {
      Swal.fire("Error", "No se pudo actualizar los productos.", "error");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const deleteHandler: any = (product_id: string) => {
    Swal.fire({
      title: "¿Estas seguro(a) que quieres eliminar a este producto?",
      text: "¡Esta acción es permanente y no se podrá revertir!",
      icon: "error",
      iconColor: "#fafafa",
      background: "#d33",
      color: "#fafafa",
      focusCancel: true,
      showCancelButton: true,
      confirmButtonColor: "#4E0000",
      cancelButtonColor: "#000",
      confirmButtonText: "¡Sí, Eliminar!",
      cancelButtonText: "No, cancelar!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteOneProduct(product_id);
      }
    });
  };

  const deactivateOnlineHandler = (product_id: any, active: boolean) => {
    const location = "Online";
    let title: string;
    let text: string;
    let confirmBtn: string;
    let successTitle: string;
    let successText: string;
    let icon: SweetAlertIcon;
    let confirmBtnColor: string;
    if (active === true) {
      icon = "warning";
      title = "Estas seguro(a)?";
      text =
        "¡Estas a punto de desactivar a este producto en el Sitio Web y quedara sin acceso!";
      confirmBtn = "¡Sí, desactivar producto!";
      confirmBtnColor = "#CE7E00";
      successTitle = "Desactivar!";
      successText = "El producto ha sido desactivado.";
    } else {
      icon = "success";
      title = "Estas seguro(a)?";
      text = "¡Estas a punto de Activar a este producto en el Sitio Web!";
      confirmBtn = "¡Sí, Activar producto!";
      confirmBtnColor = "#228B22";
      successTitle = "Reactivado!";
      successText = "El producto ha sido Activado.";
    }
    Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonColor: confirmBtnColor,
      cancelButtonColor: "#000",
      confirmButtonText: confirmBtn,
      cancelButtonText: "No, cancelar!",
    }).then((result) => {
      if (result.isConfirmed) {
        changeProductAvailability(product_id, location);
      }
    });
  };

  const deactivateBranchHandler = (product_id: any, active: boolean) => {
    const location = "Branch";
    let title: string;
    let text: string;
    let confirmBtn: string;
    let successTitle: string;
    let successText: string;
    let icon: SweetAlertIcon;
    let confirmBtnColor: string;
    if (active === true) {
      icon = "warning";
      title = "Estas seguro(a)?";
      text =
        "¡Estas a punto de desactivar a este producto de la sucursal física y quedara sin acceso!";
      confirmBtn = "¡Sí, desactivar producto!";
      confirmBtnColor = "#CE7E00";
      successTitle = "Desactivar!";
      successText = "El producto ha sido desactivado.";
    } else {
      icon = "success";
      title = "Estas seguro(a)?";
      text = "¡Estas a punto de Activar a este producto a la sucursal física!";
      confirmBtn = "¡Sí, Activar producto!";
      confirmBtnColor = "#228B22";
      successTitle = "Reactivado!";
      successText = "El producto ha sido Activado.";
    }
    Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonColor: confirmBtnColor,
      cancelButtonColor: "#000",
      confirmButtonText: confirmBtn,
      cancelButtonText: "No, cancelar!",
    }).then((result) => {
      if (result.isConfirmed) {
        changeProductAvailability(product_id, location);
      }
    });
  };

  const deactivateMercadoLibreHandler = (product_id: any, active: boolean) => {
    const location = "MercadoLibre";
    let title;
    let text;
    let confirmBtn;
    let successTitle;
    let successText;
    let icon;
    let confirmBtnColor;
    if (active === true) {
      icon = "warning";
      title = "Estas seguro(a)?";
      text = "¡Estas a punto de desactivar a este producto en MercadoLibre!";
      confirmBtn = "¡Sí, desactivar producto!";
      confirmBtnColor = "#CE7E00";
      successTitle = "Desactivar!";
      successText = "El producto ha sido desactivado en MercadoLibre.";
    } else {
      icon = "success";
      title = "Estas seguro(a)?";
      text = "¡Estas a punto de Activar a este producto en MercadoLibre!";
      confirmBtn = "¡Sí, Activar producto en MercadoLibre!";
      confirmBtnColor = "#228B22";
      successTitle = "Reactivado!";
      successText = "El producto ha sido Activado en MercadoLibre.";
    }
    Swal.fire({
      title: title,
      text: text,
      imageUrl: "/icons/mercadolibre-white.svg",
      imageWidth: 100,
      imageHeight: 100,
      showCancelButton: true,
      confirmButtonColor: confirmBtnColor,
      cancelButtonColor: "#000",
      confirmButtonText: confirmBtn,
      cancelButtonText: "No, cancelar!",
    }).then((result) => {
      if (result.isConfirmed) {
        changeProductAvailability(product_id, location);
      }
    });
  };

  return (
    <>
      <hr className="my-4 maxsm:my-1" />
      <div className="relative min-h-full shadow-md sm:rounded-xl">
        {/* Filter loading overlay */}
        {isPending && (
          <div className="absolute inset-0 z-40 flex items-start justify-center bg-background/50 rounded-xl backdrop-blur-sm">
            <div className="flex flex-col items-start gap-3">
              <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">
                Cargando filtros...
              </p>
            </div>
          </div>
        )}
        <div className=" flex flex-col  maxsm:items-start items-start justify-between pr-4">
          <h1 className="text-3xl maxsm:text-base mb-2 maxsm:mb-1 ml-4 maxsm:ml-0 font-bold font-EB_Garamond w-1/2">
            {`${filteredProductsCount} Productos `}
          </h1>
          {/* On product out of total */}
          <p className="text-sm text-muted-foreground w-1/2 text-left ml-4 mb-2">
            {(() => {
              const page = parseInt(searchValue || "1", 10) || 1;
              const startItem = (page - 1) * perPage + 1;
              const endItem = Math.min(page * perPage, filteredProductsCount);
              return `Mostrando ${startItem} a ${endItem} de ${filteredProductsCount.toLocaleString()} producto(s)`;
            })()}
          </p>
        </div>
        <div className="flex flex-col maxsm:flex-col-reverse gap-2 maxsm:gap-1 items-center justify-between mb-4">
          <div className="flex gap-2 items-center w-full">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded-xl transition-colors text-sm"
              title="Escanear código de barras/QR para buscar"
            >
              <MdQrCodeScanner size={20} />
            </button>
            <SearchProducts search={search} />
          </div>
        </div>

        {/* Bulk action bar */}
        {(selectedProducts.size > 0 || selectAllInSearch) && (
          <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 bg-muted rounded-xl border">
            <p className="text-sm font-medium shrink-0">
              {selectAllInSearch
                ? `${filteredProductsCount} producto(s) de búsqueda seleccionado(s)`
                : `${selectedProducts.size} producto(s) seleccionado(s)`}
            </p>

            {/* Toggle: Select page or all in search */}
            {filteredProductsCount > products.length && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border">
                <label className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllInSearch}
                    onChange={(e) => handleSelectAllInSearch(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  Seleccionar todos en búsqueda ({filteredProductsCount})
                </label>
              </div>
            )}

            {/* Category select */}
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="">— Categoría —</option>
              {categoryOptions.map((c) => (
                <option key={c._id} value={c.catTitle}>
                  {c.catTitle}
                </option>
              ))}
            </select>

            {/* Gender select */}
            <select
              value={bulkGender}
              onChange={(e) => setBulkGender(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="">— Género —</option>
              {genderOptions.map((g) => (
                <option key={g._id} value={g.catTitle}>
                  {g.catTitle}
                </option>
              ))}
            </select>

            {/* Brand select */}
            <select
              value={bulkBrand}
              onChange={(e) => setBulkBrand(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="">— Cert —</option>
              {brandOptions.map((b) => (
                <option key={b._id} value={b.catTitle}>
                  {b.catTitle}
                </option>
              ))}
            </select>

            {/* Dimension inputs */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground shrink-0">
                Dims (cm):
              </span>
              <input
                type="number"
                min={0}
                placeholder="L"
                value={bulkLength}
                onChange={(e) => setBulkLength(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1.5 bg-background w-16"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                min={0}
                placeholder="An"
                value={bulkWidth}
                onChange={(e) => setBulkWidth(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1.5 bg-background w-16"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                min={0}
                placeholder="Al"
                value={bulkHeight}
                onChange={(e) => setBulkHeight(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1.5 bg-background w-16"
              />
            </div>

            {/* Weight input */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground shrink-0">
                Peso:
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="kg"
                value={bulkWeight}
                onChange={(e) => setBulkWeight(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1.5 bg-background w-20"
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>

            <button
              onClick={handleBulkUpdate}
              disabled={
                isBulkLoading ||
                (!bulkCategory &&
                  !bulkGender &&
                  !bulkBrand &&
                  !bulkWeight &&
                  !bulkLength &&
                  !bulkWidth &&
                  !bulkHeight)
              }
              className="text-sm px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBulkLoading ? "Guardando..." : "Aplicar cambios"}
            </button>

            {/* <div className="ml-auto">
              <ExportToTikTokButton
                selectedProductIds={Array.from(selectedProducts)}
                onExportComplete={() => setSelectedProducts(new Set())}
              />
            </div> */}
          </div>
        )}

        <table className="w-full text-sm  text-left h-full">
          <thead className="text-l dark:text-slate-300 text-gray-700 capitalize border-b dark:border-slate-200 border-gray-300">
            <tr className="flex flex-row items-center">
              <th scope="col" className="w-fit px-2 py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedProducts.size === products.length &&
                    products.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-fit h-4 cursor-pointer"
                  aria-label="Seleccionar todos"
                />
              </th>
              <th scope="col" className="w-full py-3 maxsm:hidden">
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-semibold"
                >
                  *Titulo
                  {sortKey === "title" && (sortDir === "asc" ? "▲" : "▼")}
                </button>
              </th>
              <th scope="col" className="w-full py-3 ">
                <button
                  type="button"
                  onClick={() => toggleSort("category")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-semibold"
                >
                  *Categoría
                  {sortKey === "category" && (sortDir === "asc" ? "▲" : "▼")}
                </button>
              </th>
              <th scope="col" className="w-full py-3 ">
                Imagen
              </th>
              <th scope="col" className="w-full py-3 ">
                <button
                  type="button"
                  onClick={() => toggleSort("gender")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-semibold"
                >
                  *Género
                  {sortKey === "gender" && (sortDir === "asc" ? "▲" : "▼")}
                </button>
              </th>
              <th scope="col" className="w-full py-3 ">
                <button
                  type="button"
                  onClick={() => toggleSort("brand")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-semibold"
                >
                  *Cert.
                  {sortKey === "brand" && (sortDir === "asc" ? "▲" : "▼")}
                </button>
              </th>
              {/* <th scope="col" className="w-full py-3 ">
                Linea
              </th> */}
              <th scope="col" className="w-full py-3 ">
                ASIN
              </th>
              <th scope="col" className="w-full py-3 ">
                <button
                  type="button"
                  onClick={() => toggleSort("price")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-semibold"
                >
                  *Precio
                  {sortKey === "price" && (sortDir === "asc" ? "▲" : "▼")}
                </button>
              </th>
              <th scope="col" className="w-full px-1 py-3 ">
                <button
                  type="button"
                  onClick={() => toggleSort("stock")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-semibold"
                >
                  *Exst.
                  {sortKey === "stock" && (sortDir === "asc" ? "▲" : "▼")}
                </button>
              </th>
              <th scope="col" className="w-full px-1 py-3 maxsm:hidden">
                Dims
              </th>
              <th scope="col" className="w-full px-1 py-3 text-center">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {products?.map((product: any, index: any) => (
              <tr
                className={`flex flex-row items-center ${
                  product?.active === true
                    ? "bg-background"
                    : "bg-card text-card-foreground"
                }`}
                key={product?._id}
              >
                <td className="w-fit px-2 py-0">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product._id)}
                    onChange={(e) =>
                      handleSelectProduct(product._id, e.target.checked)
                    }
                    className="w-4 h-4 cursor-pointer"
                    aria-label={`Seleccionar ${product.title}`}
                  />
                </td>
                <td
                  className={`w-full py-0 px-2 font-bold maxsm:hidden text-[12px]`}
                >
                  {product?.title?.substring(0, 30)}
                </td>
                <td
                  className={`w-full py-0 px-2 font-bold maxsm:hidden text-[12px]`}
                >
                  {product?.category}
                </td>
                <td className="w-full px-2 maxsm:px-0 py-0  ">
                  <span className="relative flex items-center justify-center text-foreground w-20 h-20 maxsm:w-8 maxsm:h-8 shadow mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImage({
                          url: product?.images[0]?.url,
                          title: product?.title,
                        })
                      }
                      className="focus:outline-none"
                    >
                      <Image
                        src={product?.images[0]?.url}
                        alt="Title"
                        width={200}
                        height={200}
                        className="w-14 object-cover h-14 maxsm:w-14 rounded-xl hover:opacity-80 transition-opacity cursor-zoom-in"
                      />
                    </button>

                    {product?.featured ? (
                      <span className="absolute -top-3 -right-1 z-20">
                        <FaStar className="text-xl text-amber-600" />
                      </span>
                    ) : (
                      ""
                    )}
                  </span>
                </td>
                <td className="w-full px-1 py-0 ">{product?.gender}</td>
                <td className="w-full px-1 py-0 ">{product?.brand}</td>
                {/* <td className="w-full px-1 py-0 ">{product?.linea}</td> */}
                <td className="w-full px-1 py-0 text-[11px] uppercase">
                  {product?.ASIN || "—"}
                </td>
                <td className="w-full px-6 maxsm:px-0 py-0 ">
                  <b>
                    <FormattedPrice amount={product?.variations[0]?.price} />
                  </b>
                </td>
                {/* Full Stock Preview */}
                <td className="w-full px-1 py-0 ">
                  <button
                    type="button"
                    onClick={() => openStockPreview(product)}
                    className="inline-flex min-w-14 items-center justify-center rounded-[20px] border border-border bg-background px-2 py-1 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                    title="Ver stock por sucursal"
                  >
                    {product.storeInventory &&
                    Array.isArray(product.storeInventory)
                      ? product.storeInventory.reduce(
                          (sum: number, inv: any) => sum + (inv.quantity || 0),
                          0,
                        )
                      : (stockCache[product._id] ?? 0)}
                  </button>
                </td>
                <td className="w-full px-1 py-0 maxsm:hidden text-[11px] text-muted-foreground">
                  {product?.dimensions
                    ? `${product.dimensions.length ?? "—"}×${product.dimensions.width ?? "—"}×${product.dimensions.height ?? "—"}`
                    : "—"}
                </td>
                <td className="w-full px-1 py-0 flex flex-row items-center gap-x-1">
                  <Link
                    href={`/${pathname}/productos/ver/${product?.slug}?&callback=${currentPage}`}
                    className="p-2 inline-block text-foreground hover:text-card-foreground bg-background shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer "
                  >
                    <FaEye className="maxsm:text-[10px]" />
                  </Link>
                  <Link
                    href={`/${pathname}/productos/variacion/${product?.slug}?&callback=${currentPage}`}
                    className="p-2 inline-block text-foreground hover:text-card-foreground bg-background shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer "
                  >
                    <FaPencilAlt className="maxsm:text-[10px]" />
                  </Link>

                  <button
                    onClick={() =>
                      deactivateOnlineHandler(
                        product?._id,
                        product?.availability?.online,
                      )
                    }
                    className="p-2 inline-block text-foreground hover:text-card-foreground bg-background shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer "
                  >
                    <TbWorldWww
                      className={` ${
                        product?.availability?.online === true
                          ? "text-green-800 maxsm:text-[10px]"
                          : "text-slate-400 maxsm:text-[10px]"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteHandler(product?._id)}
                    className="p-2 inline-block text-foreground hover:text-card-foreground bg-background shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={!isSuperAdmin}
                    title={
                      !isSuperAdmin
                        ? "Solo super_admin puede eliminar productos"
                        : "Eliminar producto"
                    }
                  >
                    <FaExclamationCircle
                      className={`text-red-500 maxsm:text-[10px]`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="my-4" />

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={closePreview}
        >
          <div
            className="relative max-w-3xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePreview}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl leading-none"
              aria-label="Cerrar"
            >
              &times;
            </button>
            <p className="text-white text-sm text-center mb-2 truncate px-2">
              {previewImage.title}
            </p>
            <div className="relative w-full flex items-center justify-center">
              <Image
                src={previewImage.url}
                alt={previewImage.title}
                width={900}
                height={900}
                className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stock preview modal */}
      {stockPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={closeStockPreview}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-background shadow-2xl border border-muted overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-muted">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Existencias por sucursal
                </p>
                <h3 className="text-lg font-bold">{stockPreview.title}</h3>
              </div>
              <button
                onClick={closeStockPreview}
                className="rounded-lg p-2 hover:bg-muted transition-colors"
                aria-label="Cerrar"
              >
                <MdClose size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <MdStorefront size={18} />
                <span>
                  Total en inventario:{" "}
                  <strong className="text-foreground">
                    {stockPreviewRows.reduce(
                      (sum, branch) => sum + branch.total,
                      0,
                    )}
                  </strong>
                </span>
              </div>

              {stockPreviewLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Cargando stock...
                </p>
              ) : stockPreviewRows.length > 0 ? (
                <div className="space-y-4">
                  {stockPreviewRows.map((branch) => (
                    <div
                      key={branch.storeName}
                      className="border border-muted rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
                        <div>
                          <p className="font-semibold">{branch.storeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Variaciones: {branch.details.length}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Stock total
                          </p>
                          <p className="text-lg font-bold text-emerald-600">
                            {branch.total}
                          </p>
                        </div>
                      </div>

                      <table className="w-full text-sm">
                        <thead className="bg-background text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="px-4 py-2 text-left">Variación</th>
                            <th className="px-4 py-2 text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branch.details.map((detail, idx) => (
                            <tr
                              key={`${branch.storeName}-${idx}`}
                              className="border-t border-muted/50"
                            >
                              <td className="px-4 py-2">{detail.label}</td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {detail.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No hay registros de inventario para este producto.
                </p>
              )}
            </div>

            {/* Summary footer */}
            {stockPreviewRows.length > 0 && (
              <div className="border-t border-muted bg-muted/30 px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Stock Total Combinado
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {stockPreviewRows.reduce(
                      (sum, branch) => sum + branch.total,
                      0,
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScannerModal
          onScan={(value) => {
            // Navigate to search with scanned barcode value
            router.push(`/${pathname}/productos?keyword=${value}`);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
};

export default AdminProducts;
