import React from "react";
import Image from "next/image";
import Link from "next/link";

const MainHeroComponent = () => {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Super Collectibles Mx"
          src="/covers/Cover_Pokemon_dos.jpg"
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          quality={90}
        />
      </div>
      {/* Overlay: dark gradient from bottom */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/75 to-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
          Torneos
        </span>
        <Link
          href={"/torneos"}
          className="block w-full max-w-2xl hover:scale-[1.02] transition"
        >
          <Image
            alt="Super Collectibles Mx"
            src="/covers/TorneosPokemon.webp"
            width={1920}
            height={400}
            className="object-cover rounded-xl shadow-2xl border border-white/10"
          />
        </Link>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Torneos Pokémon TCG
        </h2>
        <p className="max-w-xl text-sm text-zinc-300 leading-relaxed">
          Participa, compite y gana premios increíbles. Demuestra que eres el
          mejor entrenador. Plazas limitadas — ¡regístrate hoy!
        </p>
        <Link
          href="/torneos"
          className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition"
        >
          Ver torneos
        </Link>
      </div>
    </div>
  );
};

export default MainHeroComponent;
