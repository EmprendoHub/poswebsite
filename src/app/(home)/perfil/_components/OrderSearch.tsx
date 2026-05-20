"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const OrderSearch = () => {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();
  const submitHandler = (e: any) => {
    e.preventDefault();

    if (keyword) {
      router.push(`/perfil/pedidos/?keyword=${keyword}`);
    } else {
      router.push("/perfil/pedidos");
    }
  };
  return (
    <form
      onSubmit={submitHandler}
      className="flex flex-nowrap items-center w-full order-last maxmd:order-none my-5 maxmd:mt-0 maxmd:w-2/4 lg:w-2/4"
    >
      <input
        className="flex-grow text-foreground appearance-none border border-gray-200 bg-background rounded-xl mr-2 py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400"
        type="text"
        placeholder="búsqueda"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        required
      />
      <button
        type="button"
        className="px-4 py-2 inline-block text-white border border-transparent  rounded-xl bg-black"
        onClick={submitHandler}
      >
        Buscar
      </button>
    </form>
  );
};

export default OrderSearch;
