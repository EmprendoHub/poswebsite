import React from "react";
import PedidoCancelado from "./_components/PedidoCancelado";
import axios from "axios";
import { getCookiesName } from "@/backend/helpers";
import { cookies } from "next/headers";

const deleteOrder = async (id: string) => {
  const nextCookies = cookies();
  const cookieName = getCookiesName();
  const nextAuthSessionToken = nextCookies.get(cookieName);
  const URL = `${process.env.NEXTAUTH_URL}/api/order?${id}`;
  try {
    const { data } = await axios.delete(URL, {
      headers: {
        Cookie: `${cookieName}=${nextAuthSessionToken?.value}`,
      },
    });
    return data;
  } catch (error) {
    console.log(error);
  }
};

const PedidoCanceladoPage = async ({ searchParams }: { searchParams: any }) => {
  await deleteOrder(searchParams.id);
  return <PedidoCancelado />;
};

export default PedidoCanceladoPage;
