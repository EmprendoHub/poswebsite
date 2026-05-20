import OneOrder from "../../_components/OneOrder";
import React from "react";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { getOneOrder } from "@/app/_actions";

const UserOneOrderPage = async ({ params }: { params: any }) => {
  const session = await getServerSession(options);
  const data = await getOneOrder(params.id);
  const order = JSON.parse(data.order);
  const deliveryAddress = JSON.parse(data.deliveryAddress);
  return (
    <div>
      <OneOrder
        order={order}
        id={params?.id}
        session={session}
        deliveryAddress={deliveryAddress}
      />
    </div>
  );
};

export default UserOneOrderPage;
