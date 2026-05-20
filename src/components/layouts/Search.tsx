"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Search } from "lucide-react";

const ProductSearch = ({ SetIsActive }: { SetIsActive?: any }) => {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();
  const submitHandler = (e: any) => {
    e.preventDefault();
    SetIsActive(false);
    if (keyword) {
      router.push(`/tienda/?keyword=${keyword}`);
    } else {
      router.push("/tienda");
    }
  };
  return (
    <form onSubmit={submitHandler} className="flex  gap-3 items-center w-auto ">
      <input
        className="flex-grow text-foreground text-sm appearance-none border border-gray-200 bg-input rounded-xl mr-2 py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-[95%]"
        type="text"
        placeholder="Palabra clave"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        required
      />
      <Button variant="outline" onClick={submitHandler}>
        <Search />
      </Button>
    </form>
  );
};

export default ProductSearch;
