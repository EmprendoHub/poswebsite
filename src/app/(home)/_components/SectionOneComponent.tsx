import Image from "next/image";
import Link from "next/link";
import React from "react";

const reasons = [
  {
    title: "Gran variedad",
    text: "Contamos con un catálogo extenso de coleccionables seleccionados para todo tipo de coleccionista.",
    imgSrc: "/images/Supecollectibles_Unique_Cards.webp",
    href: "/tienda",
  },
  {
    title: "Garantía de autenticidad",
    text: "Cada artículo o tarjeta es verificado para garantizar que estás adquiriendo piezas genuinas.",
    imgSrc: "/images/Supecollectibles_PSA_Certification.webp",
    href: "/tienda",
  },
  {
    title: "Compra segura y fácil",
    text: "Proceso de compra sencillo, seguro y rápido. Adquiere lo que necesitas sin complicaciones.",
    imgSrc: "/images/card_security_PSA_3.webp",
    href: "/tienda",
  },
];

const SectionOneComponent = () => {
  return (
    <div className="bg-background py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Nuestra promesa
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            ¿Por qué elegirnos?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-sm text-zinc-400 leading-relaxed">
            Disponemos de un catálogo extenso con tarjetas y artículos
            coleccionables cuidadosamente seleccionados, asegurando calidad y
            autenticidad en cada producto.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 maxmd:grid-cols-1 gap-6">
          {reasons.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 hover:border-primary/40 transition"
            >
              <div className="relative h-52 w-full">
                <Image
                  src={item.imgSrc}
                  alt={item.title}
                  fill
                  className="object-cover transition group-hover:scale-105 duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-white text-base mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.text}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link
            href="/tienda"
            className="inline-block rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition"
          >
            Explorar la tienda
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SectionOneComponent;
