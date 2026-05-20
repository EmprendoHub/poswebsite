"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TiCancel } from "react-icons/ti";
import { FaPencilAlt } from "react-icons/fa";
import Swal, { SweetAlertIcon } from "sweetalert2";
import AdminClientSearch from "@/components/layouts/AdminClientSearch";
import { useDispatch, useSelector } from "react-redux";
import { saveEmailReceiver } from "@/redux/shoppingSlice";
import { changeClientStatus } from "@/app/_actions";
import { AiOutlineMail } from "react-icons/ai";
import { FaCheck } from "react-icons/fa6";

interface ClientProps {
  active: boolean;
  _id: string | undefined;
  isSelected: boolean | undefined;
  name: string;
  phone:
    | string
    | number
    | bigint
    | boolean
    | React.ReactElement<any, string | React.JSXElementConstructor<any>>
    | Iterable<React.ReactNode>
    | React.ReactPortal
    | Promise<React.AwaitedReactNode>
    | null
    | undefined;
  email: string;
}

const AllClientsComponent = ({
  clients,
  filteredClientsCount,
}: {
  clients: any;
  filteredClientsCount: any;
}) => {
  const dispatch = useDispatch();
  const { emailListData } = useSelector((state: any) => state.compras);
  const [selectedClients, setSelectedClients]: any = useState([]);
  const [selectAll, setSelectAll] = useState(false); // New state to track select all
  useEffect(() => {
    // Map through emailListData and extract only the ids
    const emailIds = emailListData.map((data: any) => data.id);

    // Filter through clients and update the selectedClients state array
    const updatedSelectedClients = clients.map((client: any) => ({
      ...client,
      isSelected: emailIds.includes(client._id),
    }));

    setSelectedClients(updatedSelectedClients);
  }, [emailListData, clients]);

  useEffect(() => {
    // Set selectAll based on whether all displayed products are selected
    const areAllSelected = selectedClients.every(
      (client: any) => client.isSelected,
    );
    setSelectAll(areAllSelected);
  }, [selectedClients]); // Runs whenever selectedProducts changes

  const deactivateHandler = (client_id: any, active: boolean) => {
    let title: string;
    let text: string;
    let confirmBtn: string;
    let successTitle: string;
    let successText: string;
    let icon: SweetAlertIcon;
    let confirmBtnColor: string;
    if (active === true) {
      icon = "warning";
      title = "Estas seguro(a)?";
      text =
        "¡Estas a punto de desactivar a este cliente y quedara sin acceso!";
      confirmBtn = "¡Sí, desactivar cliente!";
      confirmBtnColor = "#CE7E00";
      successTitle = "Desactivar!";
      successText = "El cliente ha sido desactivado.";
    } else {
      icon = "success";
      title = "Estas seguro(a)?";
      text = "¡Estas a punto de reactivar a este cliente!";
      confirmBtn = "¡Sí, reactivar cliente!";
      confirmBtnColor = "#228B22";
      successTitle = "Reactivado!";
      successText = "El cliente ha sido reactivado.";
    }
    Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonColor: confirmBtnColor,
      cancelButtonColor: "#000",
      confirmButtonText: confirmBtn,
      cancelButtonText: "No, cancelar!",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: successTitle,
          text: successText,
          icon: icon,
        });
        changeClientStatus(client_id);
      }
    });
  };
  const handleCheckBox = (client: any) => {
    // If the client with the same ID doesn't exist, add it to the list
    const receiver: any = {
      id: client?._id,
      email: client?.email,
      name: client?.name,
    };
    dispatch(saveEmailReceiver(receiver));
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);

    setSelectedClients(
      selectedClients.map((client: any) => {
        const receiver: any = {
          id: client?._id,
          email: client?.email,
          name: client?.name,
        };
        dispatch(saveEmailReceiver(receiver));
        return {
          ...client,
          isSelected: !selectAll,
        };
      }),
    );
  };

  return (
    <>
      <hr className="my-4" />
      <div className="pl-5 maxsm:pl-3 relative overflow-x-auto shadow-md sm:rounded-xl">
        <div className=" flex flex-row maxsm:flex-col maxsm:items-start items-center justify-between">
          <h1 className="text-2xl mb-5 ml-4 font-bold font-EB_Garamond w-full ">
            {`${filteredClientsCount} Clientes `}
          </h1>
          <AdminClientSearch />
        </div>
        <div className="flex relative mb-2">
          {emailListData?.length > 0 && (
            <Link href={"/admin/correos"}>
              <div className="relative flex items-center justify-start ">
                <div className="bg-black text-white flex items-center justify-center gap-3 pl-4 pr-6 py-3 rounded-xl">
                  Enviar Correo
                  <div className="relative">
                    <AiOutlineMail className="text-2xl absolute -top-2" />
                    <span className=" rounded-full font-bold text-xs relative -right-3 -top-3 flex items-center justify-center w-3 h-3 shadow-xl ">
                      {emailListData ? emailListData?.length : 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
        <table className="w-full text-sm  text-left">
          <thead className="text-l text-gray-700 uppercase pl-2">
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-background border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                />
              </th>
              <th scope="col" className="px-6 maxsm:px-0 py-3 maxmd:hidden">
                Nombre
              </th>
              <th scope="col" className="px-6 maxsm:px-0 py-3 ">
                Teléfono
              </th>

              <th scope="col" className="px-1 py-3 ">
                Email
              </th>
              <th scope="col" className="w-5 px-1 py-3 text-center">
                ...
              </th>
            </tr>
          </thead>
          <tbody>
            {selectedClients?.map(
              (client: ClientProps, index: React.Key | null | undefined) => (
                <tr
                  className={` ml-10 ${
                    client?.active === true ? "bg-slate-900" : "text-slate-400"
                  }`}
                  key={index}
                >
                  {client?.active}
                  <td>
                    <input
                      type="checkbox"
                      id={client._id}
                      checked={client.isSelected} // Bind the checked attribute based on isSelected
                      onChange={() => handleCheckBox(client)}
                      className="w-4 h-4 text-blue-600 bg-background border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 maxsm:px-2 py-2 maxmd:hidden">
                    <Link key={index} href={`/admin/cliente/${client._id}`}>
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-6 maxsm:px-0 py-2">
                    <b>{client.phone}</b>
                  </td>

                  <td className="px-1 py-2">
                    {client.email.substring(0, 12)}...
                  </td>
                  <td className="px-1 py-2  w-24 flex flex-row">
                    <div>
                      <Link
                        href={`/admin/cliente/${client._id}`}
                        className="px-2 py-2 inline-block text-white hover:text-foreground bg-black shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                      >
                        <FaPencilAlt className="" />
                      </Link>
                    </div>
                    <div>
                      {client?.active === true ? (
                        <button
                          onClick={() =>
                            deactivateHandler(client._id, client?.active)
                          }
                          className="px-2 py-2 inline-block text-white hover:text-foreground bg-slate-400 shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                        >
                          <TiCancel className="" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            deactivateHandler(client._id, client?.active)
                          }
                          className="px-2 py-2 inline-block text-green-800 hover:text-foreground bg-slate-200 shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                        >
                          <FaCheck className="" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <hr className="my-4" />
    </>
  );
};

export default AllClientsComponent;
