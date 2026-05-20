import Link from "next/link";
import React from "react";

const NoAutorizadoPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div
        className={
          "bg-background h-[80vh] flex items-center justify-center text-center mx-auto"
        }
      >
        <div>
          <h2 className="text-7xl font-EB_Garamond">No Autorizado</h2>
          <h3 className="font-bodyFont text-2xl mt-3">
            oh oh parece ser que no tienes permiso para continuar...
          </h3>
          <p className="text-lg">Explorando nuestros productos.</p>
          <div className="flex items-center gap-x-5 justify-center mt-10">
            <Link href={"/tienda"}>
              <button className="bg-black text-slate-100 w-44 h-12 rounded-full text-base font-semibold hover:bg-background hover:text-slate-900 duration-500">
                Ir a Tienda
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAutorizadoPage;
