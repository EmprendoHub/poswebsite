import ServerPagination from "@/components/layouts/ServerPagination";
import UserOrders from "../../_components/UserOrders";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import React from "react";
import { removeUndefinedAndPageKeys } from "@/backend/helpers";
import Image from "next/image";
import { formatDate, formatTime } from "@/backend/helpers";

async function getAllOrders(searchQuery: any, session: any) {
  try {
    const stringSession = JSON.stringify(session);
    const URL = `${process.env.NEXTAUTH_URL}/api/orders?${searchQuery}`;
    const res = await fetch(URL, {
      headers: {
        Session: stringSession,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.log(error.message);
  }
}

const ProfileOrdersInner = async ({ searchParams }: { searchParams: any }) => {
  const urlParams = {
    keyword: searchParams.keyword,
    page: searchParams.page,
  };

  // Filter out undefined values
  const filteredUrlParams = Object.fromEntries(
    Object.entries(urlParams).filter(([key, value]) => value !== undefined)
  );
  const searchQuery = new URLSearchParams(filteredUrlParams).toString();

  const queryUrlParams = removeUndefinedAndPageKeys(urlParams);
  const keywordQuery = new URLSearchParams(queryUrlParams).toString();

  const session = await getServerSession(options);
  const user: any = session?.user;
  const data = await getAllOrders(searchQuery, session);
  const filteredOrdersCount = data?.itemCount;
  const orders = data?.orders.orders;
  let page = parseInt(searchParams.page, 10);
  page = !page || page < 1 ? 1 : page;
  const perPage = Number(data?.resPerPage);
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

  revalidatePath("/perfil/pedidos");
  return (
    <>
      <figure className="flex maxsm:flex-col items-start sm:items-center text-foreground p-5">
        <div className="relative flex ">
          {user?.image ? (
            <Image
              className="w-16 h-16 maxsm:w-10 maxsm:h-10  rounded-full mr-4"
              src={user?.image ? user?.image : "/next.svg"}
              alt={user?.name ? user?.name : "avatar"}
              width={50}
              height={50}
            />
          ) : (
            <div className="w-16 h-16 rounded-full mr-4 bg-black text-white flex items-center justify-center uppercase text-2xl font-EB_Garamond">
              {user?.email.substring(0, 1)}
            </div>
          )}
        </div>
        <figcaption>
          <h5 className="font-semibold text-lg flex items-center maxsm:text-base">
            <span>{user?.name.substring(0, 13)}...</span>
            <span className="text-red-400 text-sm maxsm:text-xs pl-2">
              ( {user?.role} )
            </span>
          </h5>
          <p className="flex items-center maxsm:text-sm">
            {" "}
            <b className="pr-1">Email: </b> <span>{user?.email}</span>
          </p>
          <p className="flex items-center maxsm:text-sm">
            <b className="pr-1">Fecha: </b>
            <span>
              {user?.createdAt &&
                ` ${formatDate(
                  user?.createdAt.substring(0, 24)
                )} a las ${formatTime(user?.createdAt.substring(0, 24))}`}
            </span>
          </p>
        </figcaption>
        <hr className="my-4" />
      </figure>
      <UserOrders orders={orders} filteredOrdersCount={filteredOrdersCount} />
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

export default ProfileOrdersInner;
