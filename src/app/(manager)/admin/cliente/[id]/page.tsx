import { getAllCustomerOrders } from "@/app/_actions";
import { removeUndefinedAndPageKeys } from "@/backend/helpers";
import AdminUserOrders from "../_components/AdminUserOrders";
import ServerPagination from "@/components/layouts/ServerPagination";

const ClientDetailsPage = async ({
  searchParams,
  params,
}: {
  searchParams: any;
  params: any;
}) => {
  const urlParams = {
    keyword: searchParams.keyword,
    page: searchParams.page,
  };
  const filteredUrlParams = Object.fromEntries(
    Object.entries(urlParams).filter(([key, value]) => value !== undefined)
  );
  const searchQuery = new URLSearchParams(filteredUrlParams).toString();

  const queryUrlParams = removeUndefinedAndPageKeys(urlParams);
  const keywordQuery = new URLSearchParams(queryUrlParams).toString();

  const data = await getAllCustomerOrders(searchQuery, params.id);
  const orders = JSON.parse(data.orders);
  const client = JSON.parse(data.client);
  const filteredOrdersCount = data?.itemCount;
  //Pagination
  let page = parseInt(searchParams.page, 10);
  page = !page || page < 1 ? 1 : page;
  const perPage = 5;
  const totalPages = Math.ceil(data.itemCount / perPage);
  const prevPage = page - 1 > 0 ? page - 1 : 1;
  const nextPage = page + 1;
  const isPageOutOfRange = page > totalPages;
  const pageNumbers = [];
  const offsetNumber = 1;
  for (let i = page - offsetNumber; i <= page + offsetNumber; i++) {
    if (i >= 1 && i <= totalPages) {
      pageNumbers.push(i);
    }
  }

  return (
    <>
      <AdminUserOrders
        orders={orders}
        client={client}
        filteredOrdersCount={filteredOrdersCount}
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

export default ClientDetailsPage;
