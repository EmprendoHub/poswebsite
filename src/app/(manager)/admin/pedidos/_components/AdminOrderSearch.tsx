"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";

const AdminOrderSearch = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const router = useRouter();
  const submitHandler = (e: any) => {
    e.preventDefault();

    const basePath = pathname.includes("admin")
      ? "/admin/pedidos"
      : "/puntodeventa/pedidos";

    // Preserve existing filters (orderStatus, branch) while updating the keyword
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (keyword) {
      params.set("keyword", keyword);
    } else {
      params.delete("keyword");
    }
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };
  return (
    <form
      onSubmit={submitHandler}
      className="flex flex-row items-center w-full order-last maxmd:order-none my-5 maxmd:my-0 "
    >
      <input
        className="flex-grow text-foreground appearance-none border border-gray-200 bg-background rounded-xl mr-2 py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-40"
        type="text"
        placeholder="búsqueda"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <button
        type="button"
        className="px-4 py-2 text-white border border-transparent rounded-xl bg-black flex-row flex items-center gap-x-3"
        onClick={submitHandler}
      >
        <span className="maxsm:hidden"> Buscar</span> <FaSearch />
      </button>
    </form>
  );
};

export default AdminOrderSearch;
