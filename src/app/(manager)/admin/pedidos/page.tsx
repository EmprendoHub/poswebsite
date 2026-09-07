import { getAllOrder } from "@/app/_actions";
import { removeUndefinedAndPageKeys } from "@/backend/helpers";
import AdminOrders from "./_components/AdminOrders";
import ServerPagination from "@/components/layouts/ServerPagination";

const AdminOrdersPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const resolvedSearchParams = await searchParams;
  const urlParams = {
    keyword: resolvedSearchParams.keyword,
    page: resolvedSearchParams.page,
    orderStatus: resolvedSearchParams.orderStatus,
    branch: resolvedSearchParams.branch,
  };
  const filteredUrlParams = Object.fromEntries(
    Object.entries(urlParams).filter(([key, value]) => value !== undefined)
  );

  const queryUrlParams = removeUndefinedAndPageKeys(urlParams);
  const keywordQuery = new URLSearchParams(queryUrlParams).toString();

  const searchQuery = new URLSearchParams(filteredUrlParams).toString();
  const data = await getAllOrder(searchQuery);
  const orders = JSON.parse(data.orders);
  const filteredOrdersCount = data?.itemCount;
  const branchOptions = data?.branchOptions ? JSON.parse(data.branchOptions) : [];

  // pagination
  let page = parseInt(resolvedSearchParams.page, 10);
  page = !page || page < 1 ? 1 : page;
  const perPage = Number(data?.resPerPage);
  const totalPages = Math.ceil(data.itemCount / perPage);
  const prevPage = page - 1 > 0 ? page - 1 : 1;
  const nextPage = page + 1;
  const isPageOutOfRange = page > totalPages;
  const pageNumbers = [];
  const offsetNumber = 2;
  for (let i = page - offsetNumber; i <= page + offsetNumber; i++) {
    if (i >= 1 && i <= totalPages) {
      pageNumbers.push(i);
    }
  }

  return (
    <>
      <AdminOrders
        orders={orders}
        filteredOrdersCount={filteredOrdersCount}
        branchOptions={branchOptions}
      />

      <ServerPagination
        isPageOutOfRange={isPageOutOfRange}
        page={page}
        pageNumbers={pageNumbers}
        prevPage={prevPage}
        nextPage={nextPage}
        totalPages={totalPages}
        searchParams={keywordQuery}
      />
    </>
  );
};

export default AdminOrdersPage;
