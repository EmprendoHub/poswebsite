import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const BreadCrumbs = ({ breadCrumbs }: { breadCrumbs: any }) => {
  return (
    <div>
      <section className="py-4 maxsm:py-2 bg-blue-100 w-full absolute left-0 top-0 px-60 maxmd:px-5 z-10">
        <div className="container max-w-screen-xl mx-auto px-4">
          <ol className="inline-flex flex-wrap text-muted space-x-1 maxmd:space-x-3 items-center">
            {breadCrumbs?.map((crumb: any, index: number) => (
              <li key={index} className="inline-flex items-center">
                <Link
                  href={crumb?.url}
                  className="text-muted hover:text-blue-600 tracking-widest maxsm:text-xs"
                >
                  {crumb?.name}
                </Link>
                {breadCrumbs?.length - 1 !== index && (
                  <ChevronRight className="ml-3 " />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};

export default BreadCrumbs;
