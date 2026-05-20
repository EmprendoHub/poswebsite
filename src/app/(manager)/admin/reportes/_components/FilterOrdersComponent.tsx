"use client";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AllOrdersFilters from "../../pedidos/_components/AllOrdersFilters";
import { useEffect, useState } from "react";
import AllOrders from "../../pedidos/_components/AllOrders";

const FilterOrdersComponent = ({
  data,
  itemCount,
}: {
  data: any;
  itemCount: any;
}) => {
  const [isActive, SetIsActive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isActive) SetIsActive(false);
    // eslint-disable-next-line
  }, [pathname]);

  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className={` overflow-y-auto px-5 py-5`}>
      <AllOrdersFilters />
      <AllOrders data={data} itemCount={itemCount} />
    </div>
  );
};

export default FilterOrdersComponent;
