"use client";
import { changeOrderNoteStatus, updateOneOrder } from "@/app/_actions";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

const UpdateOrderComp = ({
  setShowModal,
  order,
}: {
  setShowModal: any;
  order: any;
}) => {
  const pathname = usePathname();
  const [orderStatus, setOrderStatus] = useState(order?.orderStatus);
  const [note, setNote] = useState(order?.comment);
  const [notification, setNotification] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const formData = new FormData();
    formData.set("orderStatus", orderStatus);
    formData.set("orderId", order?._id);
    formData.set("note", note);

    try {
      const res = await changeOrderNoteStatus(formData);
      if (res.ok) {
        setError("El pedido se actualizo exitosamente");
        setShowModal(false);
        return;
      }
    } catch (error) {
      console.log(error);
      setError("Error actualizando pedido. Por favor Intenta de nuevo.");
    }
  };
  return (
    <form
      onSubmit={handleSubmit}
      className=" flex flex-col w-full min-w-full min-h-full items-center justify-center"
    >
      {notification && <p className="text-sm text-blue-600">{notification}</p>}
      <div className="maxsm:w-[90%]  flex flex-col items-center justify-center gap-3 p-7 maxsm:p-4 bg-slate-200">
        <h2 className="font-bold font-EB_Garamond">Actualizar Pedido</h2>
        <label className=" text-xs">Nota</label>
        <textarea
          rows={4}
          className="focus:outline-none focus:border-gray-400 focus:bg-gray-300 text-center py-2 active:border-gray-300 w-full"
          value={note}
          placeholder="Nota"
          onChange={(e) => setNote(e.target.value)}
        />
        {pathname.includes("admin") && (
          <div className="relative w-full text-center">
            <label className="block mb-1 text-xs">Estado</label>
            <select
              className="block appearance-none border border-gray-200 bg-gray-100 rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full text-center"
              name="orderStatus"
              required
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              {[
                "Apartado",
                "Pagado",
                "Procesando",
                "En Camino",
                "Entregado",
                "Cancelado",
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
              <svg
                width="22"
                height="22"
                className="fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M7 10l5 5 5-5H7z"></path>
              </svg>
            </i>
          </div>
        )}

        <div className="flex items-center gap-3 ">
          <div
            onClick={() => setShowModal(false)}
            className={`bg-red-700 text-white py-2 px-8 text-xl hover:bg-slate-200 hover:text-red-900 ease-in-out duration-700 rounded-xl cursor-pointer`}
          >
            Cancelar
          </div>
          <button
            type="submit"
            className={`bg-black text-white py-2 px-8 text-xl hover:bg-slate-200 hover:text-foreground ease-in-out duration-700 rounded-xl`}
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
};
export default UpdateOrderComp;
