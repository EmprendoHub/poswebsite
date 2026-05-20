"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { FaMagnifyingGlass } from "react-icons/fa6";

const SearchProducts = ({ search }: { search: any }) => {
  const getPathname = usePathname();
  let pathname: string;
  if (getPathname.includes("admin")) {
    pathname = "admin";
  } else if (getPathname.includes("puntodeventa")) {
    pathname = "puntodeventa";
  } else if (getPathname.includes("instagram")) {
    pathname = "instagram";
  }
  const router = useRouter();
  const initialRender = useRef(true);

  const [text, setText] = useState(search);
  const [query] = useDebounce(text, 750);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    if (!query) {
      router.push(`/${pathname}/productos`);
    } else {
      router.push(`/${pathname}/productos?keyword=${query}`);
    }
    //eslint-disable-next-line
  }, [query]);

  return (
    <div className="relative  shadow-sm w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <FaMagnifyingGlass className="h-5 w-5 text-gray-400" />
      </div>
      <input
        value={text}
        placeholder="Buscar productos..."
        onChange={(e) => setText(e.target.value)}
        className="block w-full  border-0 py-1.5 pl-10 maxsm:pl-1 text-foreground ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
      />
    </div>
  );
};

export default SearchProducts;
