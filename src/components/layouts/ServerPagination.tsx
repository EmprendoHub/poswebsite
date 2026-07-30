"use client";
import Link from "next/link";
import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";

const ServerPagination = ({
  isPageOutOfRange,
  page,
  pageNumbers,
  prevPage,
  nextPage,
  totalPages,
  searchParams,
}: {
  isPageOutOfRange: boolean;
  page: number;
  pageNumbers: number[];
  prevPage: number;
  nextPage: number;
  totalPages: number;
  searchParams: string;
}) => {
  let newParams = "";
  if (searchParams) {
    newParams = "&" + searchParams;
  }
  return (
    <>
      {isPageOutOfRange ? (
        <div>No mas resultados...</div>
      ) : (
        <div className="flex justify-center items-center mt-10 maxlg:mt-5">
          <div className="flex border-[1px] gap-2 rounded-[10px] border-light-green p-2">
            {/* First Page Button */}
            {page === 1 ? (
              <div
                aria-disabled="true"
                className="opacity-60 bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs"
                title="First Page"
              >
                <MdKeyboardDoubleArrowLeft />
              </div>
            ) : (
              <Link
                href={`?${searchParams}&page=1`}
                aria-label="First Page"
                className="bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs hover:bg-slate-700"
                title="First Page"
              >
                <MdKeyboardDoubleArrowLeft />
              </Link>
            )}

            {/* Previous Button */}
            {page === 1 ? (
              <div
                aria-disabled="true"
                className="opacity-60 bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs"
                title="Previous Page"
              >
                <FiChevronLeft />
              </div>
            ) : (
              <Link
                href={`?${searchParams}&page=${prevPage}`}
                aria-label="Previous Page"
                className="bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs hover:bg-slate-700"
                title="Previous Page"
              >
                <FiChevronLeft />
              </Link>
            )}

            {/* Page Numbers */}
            {pageNumbers.map((pageNumber, index) => (
              <Link
                key={index}
                className={
                  page === pageNumber
                    ? "bg-black font-bold px-2 w-8 h-8 flex justify-center items-center text-white rounded-full text-xs"
                    : "hover:bg-black px-1 rounded-full w-8 h-8 flex justify-center items-center hover:text-white text-xs"
                }
                href={`?${searchParams}&page=${pageNumber}`}
              >
                {pageNumber}
              </Link>
            ))}

            {/* Next Button */}
            {page === totalPages ? (
              <div
                className="opacity-60 bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs"
                aria-disabled="true"
                title="Next Page"
              >
                <FiChevronRight />
              </div>
            ) : (
              <Link
                href={`?${searchParams}&page=${nextPage}`}
                aria-label="Next Page"
                className="bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-xl maxmd:text-xs hover:bg-slate-700"
                title="Next Page"
              >
                <FiChevronRight />
              </Link>
            )}

            {/* Last Page Button */}
            {page === totalPages ? (
              <div
                className="opacity-60 bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs"
                aria-disabled="true"
                title="Last Page"
              >
                <MdKeyboardDoubleArrowRight />
              </div>
            ) : (
              <Link
                href={`?${searchParams}&page=${totalPages}`}
                aria-label="Last Page"
                className="bg-black w-8 h-8 flex justify-center items-center disabled:bg-slate-300 text-white p-2 rounded-full text-md maxmd:text-xs hover:bg-slate-700"
                title="Last Page"
              >
                <MdKeyboardDoubleArrowRight />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ServerPagination;
