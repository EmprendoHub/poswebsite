import React from "react";
import ServerPagination from "@/components/layouts/ServerPagination";
import AdminProducts from "./_components/AdminProducts";
import { getAllProduct } from "@/app/_actions";
import { removeUndefinedAndPageKeys } from "@/backend/helpers";

const AdminProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const resolvedSearchParams = await searchParams;
  const urlParams = {
    keyword: resolvedSearchParams.keyword,
    page: resolvedSearchParams.page,
    sorts: resolvedSearchParams.sorts, // Format: "brand:asc,price:desc"
    filterTitle: resolvedSearchParams.filterTitle,
    filterMainCategories: resolvedSearchParams.filterMainCategories,
    filterSubCategories: resolvedSearchParams.filterSubCategories,
    filterAttributes: resolvedSearchParams.filterAttributes,
    filterBrands: resolvedSearchParams.filterBrands,
    filterPriceMin: resolvedSearchParams.filterPriceMin,
    filterPriceMax: resolvedSearchParams.filterPriceMax,
    filterStockMin: resolvedSearchParams.filterStockMin,
    filterStockMax: resolvedSearchParams.filterStockMax,
  };
  const filteredUrlParams = Object.fromEntries(
    Object.entries(urlParams).filter(([key, value]) => value !== undefined),
  );
  // Add perpage parameter for getAllProduct
  const allParams = new URLSearchParams(filteredUrlParams);
  allParams.set("perpage", "40");
  const searchQuery = allParams.toString();

  const queryUrlParams = removeUndefinedAndPageKeys(urlParams);
  const keywordQuery = new URLSearchParams(queryUrlParams).toString();

  const data = await getAllProduct(searchQuery);

  const products = JSON.parse(data.products);
  // pagination
  let page = parseInt(resolvedSearchParams.page, 10);
  page = !page || page < 1 ? 1 : page;
  const perPage = 40;
  const itemCount = data?.filteredProductsCount || 0;
  const totalPages = itemCount > 0 ? Math.ceil(itemCount / perPage) : 0;
  const prevPage = page - 1 > 0 ? page - 1 : 1;
  const nextPage = page + 1;
  const isPageOutOfRange = totalPages === 0 || page > totalPages;
  const pageNumbers = [];
  const offsetNumber = 3;
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;

  // Build search params for pagination links
  const paginationParams = new URLSearchParams();
  if (resolvedSearchParams.keyword)
    paginationParams.append("keyword", resolvedSearchParams.keyword);
  if (resolvedSearchParams.sorts)
    paginationParams.append("sorts", resolvedSearchParams.sorts);
  if (resolvedSearchParams.filterTitle)
    paginationParams.append("filterTitle", resolvedSearchParams.filterTitle);
  if (resolvedSearchParams.filterMainCategories)
    paginationParams.append("filterMainCategories", resolvedSearchParams.filterMainCategories);
  if (resolvedSearchParams.filterSubCategories)
    paginationParams.append("filterSubCategories", resolvedSearchParams.filterSubCategories);
  if (resolvedSearchParams.filterAttributes)
    paginationParams.append("filterAttributes", resolvedSearchParams.filterAttributes);
  if (resolvedSearchParams.filterBrands)
    paginationParams.append("filterBrands", resolvedSearchParams.filterBrands);
  if (resolvedSearchParams.filterPriceMin)
    paginationParams.append("filterPriceMin", resolvedSearchParams.filterPriceMin);
  if (resolvedSearchParams.filterPriceMax)
    paginationParams.append("filterPriceMax", resolvedSearchParams.filterPriceMax);
  if (resolvedSearchParams.filterStockMin)
    paginationParams.append("filterStockMin", resolvedSearchParams.filterStockMin);
  if (resolvedSearchParams.filterStockMax)
    paginationParams.append("filterStockMax", resolvedSearchParams.filterStockMax);
  const allSearchParams = paginationParams.toString();

  for (let i = page - offsetNumber; i <= page + offsetNumber; i++) {
    if (i >= 1 && i <= totalPages) {
      pageNumbers.push(i);
    }
  }

  return (
    <>
      <AdminProducts
        products={products}
        search={search}
        filteredProductsCount={itemCount}
        perPage={perPage}
      />
      <ServerPagination
        isPageOutOfRange={isPageOutOfRange}
        page={page}
        pageNumbers={pageNumbers}
        prevPage={prevPage}
        nextPage={nextPage}
        totalPages={totalPages}
        searchParams={allSearchParams}
      />
    </>
  );
};

export default AdminProductsPage;
