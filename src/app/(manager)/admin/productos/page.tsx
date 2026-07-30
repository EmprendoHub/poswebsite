import React from "react";
import ServerPagination from "@/components/layouts/ServerPagination";
import AdminProducts from "./_components/AdminProducts";
import { getAllProduct } from "@/app/_actions";
import { removeUndefinedAndPageKeys } from "@/backend/helpers";

const AdminProductsPage = async ({ searchParams }: { searchParams: any }) => {
  const urlParams = {
    keyword: searchParams.keyword,
    page: searchParams.page,
    sortBy: searchParams.sortBy,
    sortDir: searchParams.sortDir,
  };
  const filteredUrlParams = Object.fromEntries(
    Object.entries(urlParams).filter(([key, value]) => value !== undefined),
  );
  // Add perpage parameter for getAllProduct
  const allParams = new URLSearchParams(filteredUrlParams);
  allParams.set("perpage", "20");
  const searchQuery = allParams.toString();

  const queryUrlParams = removeUndefinedAndPageKeys(urlParams);
  const keywordQuery = new URLSearchParams(queryUrlParams).toString();

  const data = await getAllProduct(searchQuery);

  const products = JSON.parse(data.products);
  // pagination
  let page = parseInt(searchParams.page, 10);
  page = !page || page < 1 ? 1 : page;
  const perPage = 20;
  const itemCount = data?.filteredProductsCount || 0;
  const totalPages = itemCount > 0 ? Math.ceil(itemCount / perPage) : 0;
  const prevPage = page - 1 > 0 ? page - 1 : 1;
  const nextPage = page + 1;
  const isPageOutOfRange = totalPages === 0 || page > totalPages;
  const pageNumbers = [];
  const offsetNumber = 3;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;

  // Build search params for pagination links
  const paginationParams = new URLSearchParams();
  if (searchParams.keyword)
    paginationParams.append("keyword", searchParams.keyword);
  if (searchParams.sortBy)
    paginationParams.append("sortBy", searchParams.sortBy);
  if (searchParams.sortDir)
    paginationParams.append("sortDir", searchParams.sortDir);
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
