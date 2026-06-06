import Image from "next/image";
import Link from "next/link";
import React from "react";

const SectionTwoComponent = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-y border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid grid-cols-2 maxmd:grid-cols-1 items-center gap-10">
        {/* Text side */}
        <div className="space-y-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Amplia selección
          </span>
          <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">
            ¡Comienza tu colección hoy!
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
            Explora miles de piezas verificadas: cartas, figuras y ediciones
            especiales. Todo lo que un coleccionista real necesita, en un solo
            lugar.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/tienda"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition"
            >
              Explorar colección
            </Link>
            <Link
              href="/contacto"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Contactar
            </Link>
          </div>
        </div>

        {/* Image side */}
        <div className="relative group">
          <div className="absolute -inset-2 rounded-2xl bg-primary/20 blur-2xl opacity-40 group-hover:opacity-60 transition" />
          <Image
            src="/covers/Cover_Pokemon_dos.jpg"
            width={700}
            height={700}
            alt="Coleccionables Super Collectibles"
            className="relative rounded-2xl object-cover w-full shadow-2xl border border-white/10"
          />
        </div>
      </div>
    </div>
  );
};

export default SectionTwoComponent;
