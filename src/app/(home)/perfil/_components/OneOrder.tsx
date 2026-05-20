"use client";
import Image from "next/image";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { getOrderItemsQuantities, getTotalFromItems } from "@/backend/helpers";
import { loadStripe } from "@stripe/stripe-js";
import { useSelector } from "react-redux";

const OneOrder = ({
  order,
  id,
  session,
  deliveryAddress,
}: {
  order: any;
  id: string;
  session: any;
  deliveryAddress: any;
}) => {
  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE__KEY!);
  const { affiliateInfo } = useSelector((state: any) => state.compras);

  const handleCheckout = async () => {
    const stripe = await stripePromise;
    const stringSession = JSON.stringify(session);
    const response = await fetch(`/api/layaway`, {
      method: "POST",
      headers: {
        Session: stringSession,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        order: order,
        items: order?.orderItems,
        email: session?.user?.email,
        user: session?.user,
        shipping: order?.deliveryAddress,
        affiliateInfo: affiliateInfo,
      }),
    });

    try {
      const data = await response.json();
      stripe?.redirectToCheckout({ sessionId: data.id });
    } catch (error) {
      console.log(error);
    }
  };

  function checkIfPaid(orderItems: any, orderAmountPaid: any) {
    // Use reduce to sum up the 'total' field
    const totalAmount = orderItems?.reduce(
      (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
      0,
    );

    if (Number(orderAmountPaid) >= Number(totalAmount)) {
      return "pagado";
    } else return "pendiente de pago";
  }

  function getPendingTotal(orderItems: any, orderAmountPaid: any) {
    // Use reduce to sum up the 'total' field
    const totalAmount = orderItems?.reduce(
      (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
      0,
    );
    const pendingAmount = totalAmount - orderAmountPaid;
    return pendingAmount;
  }

  function subtotal() {
    let sub = getTotalFromItems(order?.orderItems);
    return sub;
  }
  return (
    <>
      <div className="relative overflow-x-auto shadow-md sm:rounded-xl p-5">
        <div className="flex flex-row maxsm:flex-col items-start justify-start gap-x-5">
          <h2 className="text-3xl mb-8 ml-4 font-bold ">
            Pedido #{order?.orderId}
          </h2>
          <h2
            className={`text-3xl mb-8 ml-4 font-bold uppercase ${
              order && order?.orderStatus === "Apartado"
                ? "text-amber-700"
                : order.orderStatus === "En Camino"
                  ? "text-blue-700"
                  : order.orderStatus === "Entregado"
                    ? "text-green-700"
                    : "text-muted"
            }`}
          >
            {order?.orderStatus}
          </h2>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="text-l text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-6 py-3">
                Nombre
              </th>
              <th scope="col" className="px-6 py-3">
                Domicilio
              </th>
              <th scope="col" className="px-6 py-3">
                Ciudad
              </th>
              <th scope="col" className="px-6 py-3">
                Entidad
              </th>
              <th scope="col" className="px-6 py-3">
                Código Postal
              </th>
              <th scope="col" className="px-6 py-3">
                Tel
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-background">
              <td className="px-6 py-2">
                {deliveryAddress?.name ||
                  order?.shippingInfo?.name ||
                  order?.customerName ||
                  "N/A"}
              </td>
              <td className="px-6 py-2">
                {deliveryAddress?.street ||
                  order?.shippingInfo?.street ||
                  "N/A"}
              </td>
              <td className="px-6 py-2">
                {deliveryAddress?.city || order?.shippingInfo?.city || "N/A"}
              </td>
              <td className="px-6 py-2">
                {deliveryAddress?.province ||
                  order?.shippingInfo?.province ||
                  order?.shippingInfo?.state ||
                  "N/A"}
              </td>
              <td className="px-6 py-2">
                {deliveryAddress?.zip_code ||
                  order?.shippingInfo?.zip_code ||
                  order?.shippingInfo?.zipCode ||
                  "N/A"}
              </td>
              <td className="px-6 py-2">
                {deliveryAddress?.phone ||
                  order?.shippingInfo?.phone ||
                  order?.phone ||
                  "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="relative overflow-x-auto shadow-md sm:rounded-xl p-5">
        <table className="w-full text-sm text-left">
          <thead className="text-l text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-6 py-3">
                SKU
              </th>
              <th scope="col" className="px-6 py-3">
                Cant.
              </th>
              <th scope="col" className="px-6 py-3">
                Nombre
              </th>
              {/* <th scope="col" className="px-6 py-3">
                Color
              </th> */}
              <th scope="col" className="px-6 py-3">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3">
                Precio
              </th>
              <th scope="col" className="px-6 py-3">
                Img
              </th>
            </tr>
          </thead>
          <tbody>
            {order?.orderItems?.map((item: any, index: number) => (
              <tr className="bg-background" key={index}>
                <td className="px-6 py-2">
                  {item.product.substring(0, 10) || item._id.substring(0, 10)}
                  ...
                </td>
                <td className="px-6 py-2">{item.quantity}</td>
                <td className="px-6 py-2">{item.name}</td>
                {/* <td className="px-6 py-2">{item.color}</td> */}
                <td className="px-6 py-2">{item.size}</td>
                <td className="px-6 py-2">
                  <FormattedPrice amount={item?.price || 0} />
                </td>
                <td className="px-6 py-2">
                  <Image
                    alt="producto"
                    src={item.image}
                    width={50}
                    height={50}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order?.orderStatus === "Apartado" ? (
        <div className="relative flex fle-row maxmd:flex-col overflow-x-auto shadow-md sm:rounded-xl p-5">
          <div className="w-1/3 maxmd:w-full">
            <div className=" max-w-screen-xl mx-auto bg-background flex flex-col p-2">
              <h2 className="text-2xl">Totales</h2>
              <ul className="mb-5">
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Total de Artículos:</span>
                  <span className="text-green-700">
                    {getOrderItemsQuantities(order?.orderItems)} (Artículos)
                  </span>
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Sub-Total:</span>
                  <FormattedPrice amount={subtotal() || 0} />
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Total:</span>
                  <FormattedPrice
                    amount={getTotalFromItems(order?.orderItems) || 0}
                  />
                </li>
                <li className="text-xl font-bold border-t flex justify-between gap-x-5  pt-3">
                  <span>Abono:</span>
                  -<FormattedPrice amount={order?.paymentInfo?.amountPaid} />
                </li>

                <li className="text-xl text-amber-700 font-bold border-t flex justify-between gap-x-5  pt-1">
                  <span>Pendiente:</span>
                  <span>
                    <FormattedPrice
                      amount={
                        getPendingTotal(
                          order?.orderItems,
                          order?.paymentInfo?.amountPaid,
                        ) || 0
                      }
                    />
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div className="w-2/3 maxmd:w-full flex flex-col justify-center items-center">
            <h3
              className={`text-4xl font-raleway font-bold uppercase  ${
                checkIfPaid(
                  order?.orderItems,
                  order?.paymentInfo?.amountPaid,
                ) === "pagado"
                  ? "text-green-700"
                  : "text-amber-700"
              } `}
            >
              {checkIfPaid(order?.orderItems, order?.paymentInfo?.amountPaid)}
            </h3>

            <button
              onClick={() => handleCheckout()}
              className="bg-black w-1/2 text-slate-100 mt-4 py-3 px-6 hover:bg-slate-200 hover:text-foreground duration-300 ease-in-out cursor-pointer"
            >
              Pagar Total{" "}
            </button>
            <p className="pt-5">
              Si realizaste un pago por Oxxo o Transferencia Bancaria
            </p>
            <p>
              Permite hasta 24 horas después de tu pago para que se refleje en
              tu cuenta.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex fle-row maxmd:flex-col overflow-x-auto shadow-md sm:rounded-xl p-5">
          <div className="w-1/3 maxmd:w-full">
            <div className="container max-w-screen-xl mx-auto bg-background flex flex-col  p-2">
              <ul className="mb-5">
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Sub-Total:</span>
                  <FormattedPrice amount={subtotal() || 0} />
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Total de Artículos:</span>
                  <span className="text-green-700">
                    {getOrderItemsQuantities(order?.orderItems)} (Artículos)
                  </span>
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Envió:</span>
                  <FormattedPrice amount={order?.ship_cost || 0} />
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Total:</span>
                  <FormattedPrice
                    amount={getTotalFromItems(order?.orderItems) || 0}
                  />
                </li>
                <li className="text-xl font-bold text-green-700 border-t flex justify-between gap-x-5  pt-3">
                  <span>Pagado:</span>
                  <FormattedPrice
                    amount={order?.paymentInfo?.amountPaid || 0}
                  />
                </li>
              </ul>
            </div>
          </div>
          <div className="w-2/3 maxmd:w-full flex justify-center items-center">
            <h3
              className={`text-5xl font-EB_Garamond uppercase  -rotate-12 ${
                checkIfPaid(
                  order?.orderItems,
                  order?.paymentInfo?.amountPaid,
                ) === "pagado"
                  ? "text-green-700"
                  : "text-amber-700"
              } `}
            >
              {checkIfPaid(order?.orderItems, order?.paymentInfo?.amountPaid)}
            </h3>
          </div>
        </div>
      )}
    </>
  );
};

export default OneOrder;
