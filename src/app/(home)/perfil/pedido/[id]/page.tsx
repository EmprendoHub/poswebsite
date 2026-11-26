import OneOrder from "../../_components/OneOrder";
import React from "react";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { getOneOrder } from "@/app/_actions";

const UserOneOrderPage = async ({ params }: { params: any }) => {
  const { id } = await params;
  const session = await getServerSession(options);
  const data = await getOneOrder(id);
  const order = JSON.parse(data.order);
  const deliveryAddress = JSON.parse(data.deliveryAddress);
  return (
    <div>
      <OneOrder
        order={order}
        id={id}
        session={session}
        deliveryAddress={deliveryAddress}
      />
    </div>
  );
};

export default UserOneOrderPage;
