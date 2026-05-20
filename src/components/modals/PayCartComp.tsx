"use client";
import React, { useState } from "react";
import { FaCircleCheck, FaCircleExclamation } from "react-icons/fa6";
import { resetPOSCart, savePOSOrder } from "@/redux/shoppingSlice";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ValidationError } from "@/types";

const PayCartComp = ({
  setShowModal,
  payType,
  isPaid,
}: {
  setShowModal: any;
  payType: any;
  isPaid: any;
}) => {
  const getPathname = usePathname();
  let pathname: any;
  // Extract the actual store slug from the URL for puntodeventa paths
  // e.g. /puntodeventa/centro-magno/... → storeSlug = "centro-magno"
  const urlParts = getPathname.split("/").filter(Boolean);
  const storeSlug =
    urlParts[0] === "puntodeventa" && urlParts[1] ? urlParts[1] : null;

  if (getPathname.includes("admin")) {
    pathname = "admin";
  } else if (getPathname.includes("puntodeventa")) {
    pathname = "puntodeventa";
  } else if (getPathname.includes("instagram")) {
    pathname = "instagram";
  }
  const dispatch = useDispatch();
  const router = useRouter();
  const [transactionNo, setTransactionNo] = useState("EFECTIVO");
  const [phone, setPhoneNo] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const { productsPOS } = useSelector((state: any) => state.compras);
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);
  const amountTotal = productsPOS?.reduce(
    (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
    0,
  );

  const layawayAmount = Number(amountTotal) * 0.3;

  const totalAmountCalc = Number(amountTotal);
  let amountPlaceHolder: any;
  if (payType === "layaway") {
    amountPlaceHolder = layawayAmount;
  } else {
    amountPlaceHolder = totalAmountCalc;
  }
  const [amountReceived, setAmountReceived] = useState(amountPlaceHolder);

  const handleAmountReceived = async (inputValue: any) => {
    // Replace any non-digit characters with an empty string
    const sanitizedValue = inputValue.replace(/\D/g, "");
    // Convert the sanitized value to an integer
    const integerValue = parseInt(sanitizedValue);
    // If the input is not empty and the parsed integer is a valid whole number,
    // update the state with the integer value, otherwise update with an empty string
    setAmountReceived(isNaN(integerValue) ? "" : integerValue);
  };

  const handleCheckout = async () => {
    setSavingPayment(true);
    if (payType === "layaway") {
      if (!amountReceived || layawayAmount > amountReceived) {
        setSavingPayment(false);
        toast(
          "La cantidad que recibe es menor al minino de 30% que se require para apartar este pedido",
        );

        return;
      }
      if (!name || !phone) {
        setSavingPayment(false);
        toast(
          "Se requiere un teléfono o correo electrónico para realizar un apartado.",
        );

        return;
      }
    } else {
      if (!amountReceived || totalAmountCalc > amountReceived) {
        setSavingPayment(false);
        toast.error("La cantidad que recibe es menor al total");

        return;
      }
    }

    const formData = new FormData();
    const items = JSON.stringify(productsPOS);
    formData.append("items", items);
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("note", note);
    formData.append("email", email);
    formData.append("transactionNo", transactionNo);
    formData.append("amountReceived", amountReceived.toString());
    formData.append("payType", payType);

    if (pathname.includes("admin")) {
      formData.append("pathname", "Sucursal");
    } else if (pathname.includes("puntodeventa")) {
      // Send the actual store slug so Order.branch stores the real branch identity
      formData.append("pathname", storeSlug ?? "Sucursal");
    } else if (pathname.includes("instagram")) {
      formData.append("pathname", "Instagram");
    }
    const result: any = await fetch(`/api/payment`, {
      method: "POST",
      body: formData,
    });
    if (result?.error) {
      console.log(result?.error);
      setValidationError(result.error);
    } else {
      const data = await result.json();
      const order = JSON.parse(data.newOrder);
      setValidationError(null);
      dispatch(savePOSOrder({ order: order }));
      dispatch(resetPOSCart());
      setAmountReceived(0);
      router.push(`/${pathname}/recibo/${order._id}`);
    }
  };

  const handlePhoneChange = (e: any) => {
    const inputPhone = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    let formattedPhone = "";

    if (inputPhone.length <= 10) {
      formattedPhone = inputPhone.replace(
        /(\d{3})(\d{0,3})(\d{0,4})/,
        "$1$2$3",
      );
    } else {
      // If the phone number exceeds 10 digits, truncate it
      formattedPhone = inputPhone
        .slice(0, 10)
        .replace(/(\d{3})(\d{0,3})(\d{0,4})/, "$1 $2 $3");
    }

    setPhoneNo(formattedPhone);
  };

  return (
    <div className="flex flex-col w-full h-full items-center justify-center">
      <div className="w-1/2 maxmd:w-5/6 bg-background pl-4">
        <section className=" p-6 w-full">
          <h1 className="text-2xl maxmd:text-5xl font-semibold text-foreground mb-4 font-EB_Garamond text-center uppercase">
            {payType === "layaway" ? "Apartar" : "Pagar"}
          </h1>

          <div className="flex flex-col items-center gap-1">
            {validationError?.title && (
              <p className="text-sm text-red-400">
                {validationError.title._errors.join(", ")}
              </p>
            )}
            <div className="mb-4 text-center">
              <label className="block mb-1"> Referencia </label>
              <input
                type="text"
                className="appearance-none border bg-gray-100 rounded-xl py-2 px-3 border-gray-300 focus:outline-none hover:outline-none focus:border-gray-400 hover:border-gray-400 w-full text-center font-bold "
                placeholder="8971654687687"
                onChange={(e) => setTransactionNo(e.target.value)}
                name="transactionNo"
              />
            </div>
            <div className="mb-4 text-center">
              <input
                type="text"
                className="appearance-none border bg-gray-100 rounded-xl py-2 px-3 border-gray-300 focus:outline-none hover:outline-none focus:border-gray-400 hover:border-gray-400 w-full text-center font-bold "
                placeholder="Nombre de Cliente"
                onChange={(e) => setName(e.target.value)}
                name="name"
              />
            </div>
            <div className="mb-4 text-center">
              <input
                type="text"
                value={phone}
                className="appearance-none border bg-gray-100 rounded-xl py-2 px-3 border-gray-300 focus:outline-none hover:outline-none focus:border-gray-400 hover:border-gray-400 w-full text-center font-bold "
                placeholder="333 123 4567"
                onChange={handlePhoneChange}
                name="phone"
              />
            </div>
            <div className="mb-4 text-center">
              <input
                type="text"
                className="appearance-none border bg-gray-100 rounded-xl py-2 px-3 border-gray-300 focus:outline-none hover:outline-none focus:border-gray-400 hover:border-gray-400 w-full text-center font-bold "
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                name="email"
              />
            </div>
            <div className="mb-4 text-center">
              <input
                type="text"
                className="appearance-none border bg-gray-100 rounded-xl py-2 px-3 border-gray-300 focus:outline-none hover:outline-none focus:border-gray-400 hover:border-gray-400 w-full text-center font-bold "
                placeholder="Nota"
                onChange={(e) => setNote(e.target.value)}
                name="note"
              />
            </div>
            <div className="mb-4 text-center">
              <input
                type="text"
                placeholder="$0.00"
                value={amountReceived}
                onChange={(e) => handleAmountReceived(e.target.value)}
                className="text-5xl text-center outline-none w-full appearance-none border bg-gray-100 rounded-xl py-2  border-gray-300 focus:outline-none focus:border-gray-400:outline-none focus:border-gray-400 hover:border-gray-400"
                name="amount"
              />
              {validationError?.amount && (
                <p className="text-sm text-red-400">
                  {validationError.amount._errors.join(", ")}
                </p>
              )}
            </div>
            {!savingPayment && (
              <div className="flex flex-row flex-wrap items-center gap-3 w-full">
                <div
                  onClick={() => setShowModal(false)}
                  className="my-2 px-4 py-2 text-center text-white bg-red-700 border border-transparent rounded-xl hover:bg-red-800 w-[45%] flex flex-row items-center justify-center gap-1 cursor-pointer"
                >
                  <FaCircleExclamation className="text-xl" />
                  Cancelar
                </div>
                <button
                  onClick={() => handleCheckout()}
                  className="my-2 w-[45%] px-4 py-2 text-center text-white bg-emerald-700 border border-transparent rounded-xl hover:bg-emerald-900 flex flex-row items-center justify-center gap-1"
                >
                  <FaCircleCheck className="text-xl" /> Procesar
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PayCartComp;
