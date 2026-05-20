"use client";
import { addAddress } from "@/app/_actions";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ValidationError } from "@/types";

const NewAddress = ({ searchParams }: { searchParams: any }) => {
  const cartUrl = searchParams?.callbackUrl;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);

  async function action(data: any) {
    const result: any = await addAddress(data);

    if (result?.error) {
      setValidationError(result.error);
    } else {
      setValidationError(null);
      //reset the form
      formRef.current?.reset();
      if (cartUrl) {
        router.push(cartUrl);
      } else {
        router.push("/perfil/direcciones");
      }
    }
  }

  const provincias = [
    { clave: "AGS", nombre: "AGUASCALIENTES" },
    { clave: "BC", nombre: "BAJA CALIFORNIA" },
    { clave: "BCS", nombre: "BAJA CALIFORNIA SUR" },
    { clave: "CHI", nombre: "CHIHUAHUA" },
    { clave: "CHS", nombre: "CHIAPAS" },
    { clave: "CMP", nombre: "CAMPECHE" },
    { clave: "CMX", nombre: "CIUDAD DE MEXICO" },
    { clave: "COA", nombre: "COAHUILA" },
    { clave: "COL", nombre: "COLIMA" },
    { clave: "DGO", nombre: "DURANGO" },
    { clave: "GRO", nombre: "GUERRERO" },
    { clave: "GTO", nombre: "GUANAJUATO" },
    { clave: "HGO", nombre: "HIDALGO" },
    { clave: "JAL", nombre: "JALISCO" },
    { clave: "MCH", nombre: "MICHOACAN" },
    { clave: "MEX", nombre: "ESTADO DE MEXICO" },
    { clave: "MOR", nombre: "MORELOS" },
    { clave: "NAY", nombre: "NAYARIT" },
    { clave: "NL", nombre: "NUEVO LEON" },
    { clave: "OAX", nombre: "OAXACA" },
    { clave: "PUE", nombre: "PUEBLA" },
    { clave: "QR", nombre: "QUINTANA ROO" },
    { clave: "QRO", nombre: "QUERETARO" },
    { clave: "SIN", nombre: "SINALOA" },
    { clave: "SLP", nombre: "SAN LUIS POTOSI" },
    { clave: "SON", nombre: "SONORA" },
    { clave: "TAB", nombre: "TABASCO" },
    { clave: "TLX", nombre: "TLAXCALA" },
    { clave: "TMS", nombre: "TAMAULIPAS" },
    { clave: "VER", nombre: "VERACRUZ" },
    { clave: "YUC", nombre: "YUCATAN" },
    { clave: "ZAC", nombre: "ZACATECAS" },
  ];
  const countriesList = [
    { clave: "MEX", name: "Mexico" },
    { clave: "USA", name: "Estados Unidos" },
  ];

  return (
    <>
      <div className=" relative mt-1 mb-20 p-4 md:p-7 mx-auto rounded bg-background shadow-lg ">
        <form ref={formRef} action={action} className="relative w-full">
          <h2 className="mb-5 text-2xl font-semibold font-EB_Garamond">
            Agregar Nueva Dirección
          </h2>

          <div className="mb-4 md:col-span-2">
            <label className="block mb-1"> Calle* </label>
            <input
              className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
              type="text"
              placeholder="Ingresa tu dirección"
              name="street"
            />
            {validationError?.street && (
              <p className="text-sm text-red-400">
                {validationError.street._errors.join(", ")}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-x-3">
            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Ciudad </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="text"
                placeholder="Ingresa tu Ciudad"
                name="city"
              />
              {validationError?.city && (
                <p className="text-sm text-red-400">
                  {validationError.city._errors.join(", ")}
                </p>
              )}
            </div>

            <div className="mb-4 maxmd:col-span-2">
              <label className="block mb-1"> Provincia </label>
              <select
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                name="province"
              >
                {provincias.map((province) => (
                  <option key={province.nombre} value={province.nombre}>
                    {province.nombre}
                  </option>
                ))}
              </select>
              {validationError?.province && (
                <p className="text-sm text-red-400">
                  {validationError.province._errors.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-2">
            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Código Postal </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="number"
                placeholder="Ingresa tu código postal"
                name="zip_code"
              />
              {validationError?.zip_code && (
                <p className="text-sm text-red-400">
                  {validationError.zip_code._errors.join(", ")}
                </p>
              )}
            </div>

            <div className="mb-4 md:col-span-1">
              <label className="block mb-1"> Teléfono </label>
              <input
                className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
                type="tel"
                placeholder="Ingresa tu teléfono"
                name="phone"
              />
              <p className="text-sm text-slate-500">331 235 4455</p>
              {validationError?.phone && (
                <p className="text-sm text-red-400">
                  {validationError.phone._errors.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 md:col-span-2 ">
            <label className="block mb-1"> País </label>
            <select
              className=" appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full "
              name="country"
            >
              {countriesList.map((country) => (
                <option key={country.name} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
            {validationError?.country && (
              <p className="text-sm text-red-400">
                {validationError.country._errors.join(", ")}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="my-2 px-4 py-2 text-center w-full inline-block text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700"
          >
            Agregar Domicilio
          </button>
        </form>
      </div>
    </>
  );
};

export default NewAddress;
