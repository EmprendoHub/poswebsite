"use client";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";

const AdminOrderSearch = () => {
  const pathname = usePathname();
  const [keyword, setKeyword] = useState("");
  const router = useRouter();
  const submitHandler = (e: any) => {
    e.preventDefault();

    if (pathname.includes("admin")) {
      if (keyword) {
        router.push(`/admin/pedidos/?keyword=${keyword}`);
      } else {
        router.push("/admin/pedidos");
      }
    } else {
      if (keyword) {
        router.push(`/puntodeventa/pedidos/?keyword=${keyword}`);
      } else {
        router.push("/puntodeventa/pedidos");
      }
    }
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
