"use client";
import React, { useState } from "react";
import { FaCircleCheck, FaCircleExclamation } from "react-icons/fa6";
import { newCSTDate } from "@/backend/helpers";
import { toast } from "sonner";
import { runRevalidationTo } from "@/app/_actions";

const PayOrderComp = ({
  pathname,
  setShowModal,
  orderId,
  isPaid,
  pendingTotal,
}: {
  pathname: string;
  setShowModal: any;
  orderId: string;
  isPaid: boolean;
  pendingTotal: number;
}) => {
  const [transactionNo, setTransactionNo] = useState("EFECTIVO");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (Number(amount) <= 0) {
      toast.error("Por favor agrega la cantidad del pedido para continuar.");
      return;
    }

    if (transactionNo === "") {
      toast.error("Por favor agregar una referencia de pago para continuar.");
      return;
    }
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.set("transactionNo", transactionNo);
      formData.set("paidOn", newCSTDate().toDateString());
      formData.set("amount", amount.toString());
      formData.set("note", note);
      formData.set("orderId", orderId);
      try {
        const res = await fetch(`/api/order`, {
          method: "PUT",
          body: formData,
        });
        await runRevalidationTo(`/${pathname}/pedidos`);
        setShowModal(false);
      } catch (error) {
        toast.error(
          "Error actualizando el pedido. Por favor Intenta de nuevo."
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col w-full h-full items-center justify-center">
      <div className="w-1/2 maxmd:w-5/6 bg-background pl-4">
        <section className=" p-6 w-full">
          <h2 className="text-xl maxmd:text-5xl font-semibold text-foreground mb-8 font-EB_Garamond">
            Recibir Pago
          </h2>
          <div className="w-ful flex flex-col items-center justify-center">
            <p>Pendiente:</p>
            <p className="text-4xl">{pendingTotal}</p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-start gap-5 justify-start w-full "
          >
            <div className="flex-col flex justify-start px-2 gap-y-5 w-full">
              <div className="gap-y-5 flex-col flex px-2 w-full">
                <div className="mb-4">
                  <label className="block mb-1"> Numero de Transacción </label>
                  <input
                    type="text"
                    className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="No de Transacción"
                    onChange={(e) => setTransactionNo(e.target.value)}
                    name="transactionNo"
                  />
                </div>
              </div>
              <div className="gap-y-5 flex-col flex px-2 w-full">
                <div className="mb-4">
                  <label className="block mb-1"> Cantidad </label>
                  <input
                    type="text"
                    className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e: any) => setAmount(e.target.value)}
                    name="amount"
                  />
                </div>
              </div>
              <div className="gap-y-5 flex-col flex px-2 w-full">
                <div className="mb-4">
                  <label className="block mb-1"> Nota </label>
                  <input
                    type="text"
                    className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="Nota"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    name="note"
                  />
                </div>
              </div>
            </div>
            {/* Buttons */}

            {!isSending ? (
              <div className="flex flex-row items-center justify-between w-full gap-2">
                <div
                  onClick={() => setShowModal(false)}
                  className="my-2 px-4 py-2 text-center text-white bg-red-700 border border-transparent rounded-xl hover:bg-red-800 w-full flex flex-row items-center justify-center gap-1 cursor-pointer"
                >
                  <FaCircleExclamation className="text-xl" />
                  Cancelar
                </div>
                <button
                  type="submit"
                  className="my-2 px-4 py-2 text-center text-white bg-emerald-700 border border-transparent rounded-xl hover:bg-emerald-900 w-full flex flex-row items-center justify-center gap-1"
                >
                  <FaCircleCheck className="text-xl" /> Aceptar
                </button>
              </div>
            ) : (
              <div className="flex flex-row items-center justify-center w-full gap-2">
                <div className="loader flex self-center" />
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};

export default PayOrderComp;
