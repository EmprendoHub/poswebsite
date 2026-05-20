"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";

const AdminClientSearch = () => {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();
  const submitHandler = (e: any) => {
    e.preventDefault();

    if (keyword) {
      router.push(`/admin/clientes/?keyword=${keyword}`);
    } else {
      router.push("/admin/clientes");
    }
  };
  return (
    <form
      onSubmit={submitHandler}
      className="relative flex flex-row maxsm:flex-col items-center w-full order-last maxmd:order-none my-5 maxmd:mt-0 "
    >
      <input
        className="flex-grow appearance-none border border-gray-200 bg-background rounded-xl mr-2 py-2 px-3 maxsm:px-0 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-3/4"
        type="text"
        placeholder="búsqueda"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <button
        type="button"
        className="px-4 py-2 flex flex-row items-center text-white border border-transparent  rounded-xl bg-black w-auto"
        onClick={submitHandler}
      >
        <FaMagnifyingGlass className="text-white" />
      </button>
    </form>
  );
};

export default AdminClientSearch;
