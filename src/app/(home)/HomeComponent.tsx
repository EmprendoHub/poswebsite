import React from "react";
import Link from "next/link";
import {
  MdAutoAwesome,
  MdVerified,
  MdInventory2,
  MdLocalShipping,
} from "react-icons/md";
import SectionOneComponent from "./_components/SectionOneComponent";
import SectionTwoComponent from "./_components/SectionTwoComponent";
import SectionFourComponent from "./_components/SectionFourComponent";
import MainHeroComponent from "./_components/MainHeroComponent";
import TestimonialComponent from "./_components/TestimonialComponent";
import HomeHeader from "./_components/HomeHeader";
import { getHomeProductsData } from "../_actions";
import HeaderProducts from "./_components/HeaderProducts";
import CategoryStack from "./_components/CategoryStack";

const valuePillars = [
  {
    icon: <MdVerified size={22} />,
    title: "Piezas auténticas",
    description:
      "Curaduría real de artículos verificados y en excelente estado.",
  },
  {
    icon: <MdInventory2 size={22} />,
    title: "Inventario activo",
    description: "Novedades y reposiciones frecuentes para tu colección.",
  },
  {
    icon: <MdLocalShipping size={22} />,
    title: "Envío protegido",
    description:
      "Empaque especializado para que tus piezas lleguen impecables.",
  },
];

const HomeComponent = async () => {
  const data = await getHomeProductsData();
  const editorsProducts = JSON.parse(data.editorsProducts);
  return (
    <div className="w-full bg-background text-foreground">
      {/* ── Hero carousel ── */}
      <HomeHeader />

      {/* ── Collector statement + value pillars ── */}
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-950 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
                <MdAutoAwesome size={14} /> Universo coleccionable
              </span>
              <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                Artículos coleccionables para quienes viven la historia de cada
                pieza.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Figuras, cartas, ediciones especiales y accesorios con curaduría
                pensada para coleccionistas reales. Desde Pokémon hasta Star
                Wars.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/tienda"
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Explorar catálogo
                </Link>
                <Link
                  href="/contacto"
                  className="rounded-xl border border-white/25 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Hablar con asesor
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {valuePillars.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <span className="mt-0.5 flex-shrink-0 text-primary">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Category grid ── */}
      <section className="py-10">
        <CategoryStack />
      </section>

      {/* ── New arrivals ── */}
      <section className="border-y border-white/10 bg-zinc-950 py-12">
        <HeaderProducts editorsProducts={editorsProducts} />
      </section>

      {/* ── Tournament hero banner ── */}
      <section>
        <MainHeroComponent />
      </section>

      {/* ── Explore CTA strip ── */}
      <section>
        <SectionTwoComponent />
      </section>

      {/* ── Testimonials ── */}
      <section className="border-t border-white/10 bg-zinc-950 py-14">
        <TestimonialComponent />
      </section>

      {/* ── Location / Contact ── */}
      <section>
        <SectionFourComponent />
      </section>

      {/* ── Why choose us ── */}
      <section className="bg-background">
        <SectionOneComponent />
      </section>
    </div>
  );
};

export default HomeComponent;
