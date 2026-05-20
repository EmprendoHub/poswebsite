"use client";
import React, { useEffect, useState } from "react";
import { countries } from "countries-list";
import Swal from "sweetalert2";
import { useSession } from "next-auth/react";
import { deleteAddress, getOneAddress, updateAddress } from "@/app/_actions";

const UpdateAddress = ({ id }: { id: string }) => {
  const session: any = useSession();
  const user = session?.data?.user;
  const [address, setAddress] = useState<HTMLFormElement>();

  useEffect(() => {
    async function getAddress() {
      const addressGet: any = await getOneAddress(id);
      const currentAddress = JSON.parse(addressGet);
      setAddress(currentAddress);
      setStreet(currentAddress.street);
      setCity(currentAddress.city);
      setProvince(currentAddress.province);
      setCountry(currentAddress.country);
      setZipcode(currentAddress.zip_code);
      setPhone(currentAddress.phone);
    }
    getAddress();
    // eslint-disable-next-line
  }, [getOneAddress]);

  const countriesList: any = Object.values(countries);
  const [street, setStreet] = useState(address?.street);
  const [city, setCity] = useState(address?.city);
  const [province, setProvince] = useState(address?.province);
  const [country, setCountry] = useState(address?.country);
  const [zipcode, setZipcode] = useState(address?.zip_code);
  const [phone, setPhone] = useState(address?.phone);

  const address_id = address?._id;

  const deleteHandler = (e: any) => {
    e.preventDefault();
    Swal.fire({
      title: "Estas seguro(a)?",
      text: "¡No podrás revertir esta acción!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#000",
      confirmButtonText: "¡Sí, eliminar!",
      cancelButtonText: "No, cancelar!",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Eliminado!",
          text: "El Domicilio ha sido eliminado.",
          icon: "success",
        });
        deleteAddress(address_id);
      }
    });
  };

  const submitHandler = (e: any) => {
    e.preventDefault();

    const upAddress = {
      address_id,
      street,
      city,
      province,
      zipcode,
      country,
      phone,
      user,
    };
    updateAddress(upAddress);
  };

  return (
    <>
      <div className="mt-1 mb-20 p-4 md:p-7 mx-auto rounded bg-background shadow-lg max-w-[580px]">
        <form onSubmit={submitHandler}>
          <h2 className="mb-5 text-2xl font-semibold  font-EB_Garamond">
            Actualizar Dirección
          </h2>

          <div className="mb-4 md:col-span-2">
            <label className="block mb-1"> Calle* </label>
            <input
              className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
              type="text"
              placeholder="Ingresa tu domicilio"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-x-3">
            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Ciudad </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="text"
                placeholder="Ingresa tu Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Estado </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="text"
                placeholder="Ingresa tu Estado"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-2">
            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Código Postal </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="number"
                placeholder="Ingresa tu código postal"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
              />
            </div>

            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Teléfono </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="tel"
                placeholder="Ingresa tu teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 md:col-span-2">
            <label className="block mb-1"> País </label>
            <select
              className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {countriesList.map((country: any) => (
                <option key={country.name} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-row justify-between items-center gap-x-6">
            <button
              type="submit"
              className="my-2 px-4 py-2 text-center w-full inline-block text-white bg-secondary border border-transparent rounded-xl hover:bg-secondary/50"
            >
              Actualizar
            </button>
            <button
              onClick={deleteHandler}
              className="my-2 px-4 py-2 text-center w-full inline-block text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700"
            >
              Borrar
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UpdateAddress;
