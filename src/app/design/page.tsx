import type { Metadata } from "next";
import { Cell, Frame } from "@/components/grid/Frame";
import { SquareMarker } from "@/components/grid/SquareMarker";
import { ViewfinderCorners } from "@/components/grid/ViewfinderCorners";
import { SlicedWordmark } from "@/components/hero/SlicedWordmark";
import { Gallery } from "./Gallery";

export const metadata: Metadata = { title: "slicelist / design system" };

const palette: { name: string; hex: string; role: string; light?: boolean }[] = [
  { name: "--ink-0", hex: "#0c0b0a", role: "fondo" },
  { name: "--ink-1", hex: "#141210", role: "celda destacada" },
  { name: "--ink-2", hex: "#1c1916", role: "campos, cursor encima" },
  { name: "--line", hex: "#2a2622", role: "líneas de la rejilla" },
  { name: "--line-strong", hex: "#3d3731", role: "marco exterior" },
  { name: "--edge", hex: "#6f685e", role: "borde de controles" },
  { name: "--smoke", hex: "#8a8277", role: "texto terciario" },
  { name: "--ash", hex: "#a39b8e", role: "texto secundario" },
  { name: "--bone", hex: "#ebe4d8", role: "texto principal", light: true },
  { name: "--saber", hex: "#4aa3ff", role: "acento, el único", light: true },
  { name: "--saber-deep", hex: "#17324f", role: "relleno de selección" },
  { name: "--ember", hex: "#ff5a47", role: "solo fallos", light: true },
];

const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-6 text-meta text-smoke">{children}</h2>;
}

export default function DesignPage() {
  return (
    <main className="mx-auto max-w-[1760px] p-2 md:p-4">
      <Frame>
        <Cell as="header" className="flex items-baseline justify-between gap-4">
          <p className="text-meta text-ash">slicelist / design system</p>
          <a href="/" className="text-meta text-ash underline-offset-4 hover:text-bone hover:underline">
            ir a la web
          </a>
        </Cell>

        <Cell className="hero">
          <div className="saber-light" aria-hidden="true" />
          <div className="relative">
            <SlicedWordmark replayable />
          </div>
        </Cell>

        {/* Color */}
        <Cell as="section" className="lg:col-span-7">
          <Label>color</Label>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
            {palette.map((c) => (
              <li key={c.name}>
                <div
                  className="h-16 rounded-m border border-line-strong"
                  style={{ background: c.hex }}
                />
                <p className="mt-2 text-meta text-bone">{c.name}</p>
                <p className="text-meta text-smoke">
                  {c.hex} / {c.role}
                </p>
              </li>
            ))}
          </ul>
        </Cell>

        {/* Tipografía */}
        <Cell as="section" className="lg:col-span-5">
          <Label>tipografía</Label>
          <p className="font-display text-display font-black text-bone">Big Shoulders 900</p>
          <p className="mt-4 font-display text-num font-extrabold text-bone">37 / 52</p>
          <p className="mt-6 text-title font-medium text-bone">
            M PLUS 1 Code 500, para títulos de canción
          </p>
          <p className="mt-2 text-title font-medium text-bone">夜に駆ける / YOASOBI</p>
          <p className="mt-4 max-w-[68ch] text-lead text-ash">
            Texto de entrada a 16 px. Pega una playlist y te digo qué canciones puedes cortar.
          </p>
          <p className="mt-3 max-w-[68ch] text-body text-ash">
            Texto corrido a 14 px, 68 caracteres como máximo por línea. 0123456789 en cifras
            tabulares para que los contadores no bailen.
          </p>
          <p className="mt-3 text-meta text-smoke">metadatos a 12 px / 94,4 % / 3:44 / 123 bpm</p>
        </Cell>

        {/* Espaciado */}
        <Cell as="section" className="lg:col-span-4">
          <Label>espaciado</Label>
          <ul className="space-y-2">
            {spacing.map((px, i) => (
              <li key={px} className="flex items-center gap-4 text-meta text-smoke">
                <span className="w-[7ch] flex-none text-ash">--s-{i + 1}</span>
                <span className="h-2 rounded-xs bg-edge" style={{ width: px }} />
                <span>{px}</span>
              </li>
            ))}
          </ul>
        </Cell>

        {/* Radios y luz */}
        <Cell as="section" className="lg:col-span-4">
          <Label>radios</Label>
          <ul className="flex flex-wrap items-end gap-6 text-meta text-smoke">
            {[
              ["xs", "2px", "marcadores"],
              ["s", "6px", "botones"],
              ["m", "10px", "portadas"],
              ["l", "16px", "bloques"],
            ].map(([k, v, use]) => (
              <li key={k}>
                <div className="h-16 w-16 border border-edge bg-ink-2" style={{ borderRadius: v }} />
                <p className="mt-2 text-ash">--r-{k}</p>
                <p>
                  {v} / {use}
                </p>
              </li>
            ))}
          </ul>
        </Cell>

        <Cell as="section" className="lg:col-span-4">
          <Label>luz</Label>
          <ul className="flex flex-wrap gap-8 text-meta text-smoke">
            <li>
              <div className="h-16 w-16 rounded-m bg-ink-2 shadow-focus" />
              <p className="mt-3 text-ash">foco</p>
            </li>
            <li>
              <div className="h-16 w-16 rounded-m bg-ink-2 shadow-active" />
              <p className="mt-3 text-ash">activo</p>
            </li>
            <li>
              <div className="h-16 w-16 rounded-m bg-ink-2 shadow-cover" />
              <p className="mt-3 text-ash">portada</p>
            </li>
          </ul>
        </Cell>

        {/* Piezas */}
        <Cell as="section" className="lg:col-span-4">
          <Label>marcador cuadrado</Label>
          <ul className="space-y-3 text-body text-ash">
            <li className="flex items-center gap-3">
              <SquareMarker state="searching" /> buscando
            </li>
            <li className="flex items-center gap-3">
              <SquareMarker state="found" /> con mapa
            </li>
            <li className="flex items-center gap-3">
              <SquareMarker state="none" /> sin mapa
            </li>
            <li className="flex items-center gap-3">
              <SquareMarker state="error" /> fallo
            </li>
          </ul>
        </Cell>

        <Cell as="section" className="lg:col-span-4">
          <Label>esquinas de encuadre</Label>
          <ul className="flex flex-wrap gap-12 text-meta text-smoke">
            <li className="framing-host">
              <ViewfinderCorners>
                <span className="block h-20 w-20 rounded-m bg-ink-2" />
              </ViewfinderCorners>
              <p className="mt-4 text-ash">reposo</p>
              <p>pasa el cursor</p>
            </li>
            <li>
              <ViewfinderCorners active>
                <span className="block h-20 w-20 rounded-m bg-ink-2 shadow-active" />
              </ViewfinderCorners>
              <p className="mt-4 text-ash">abierta o sonando</p>
            </li>
          </ul>
        </Cell>

        <Cell as="section" className="lg:col-span-4">
          <Label>botones</Label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn--solid btn--big">
              Buscar mapas
            </button>
            <button type="button" className="btn">
              Escuchar
            </button>
            <button type="button" className="btn" disabled>
              Descargar
            </button>
            <button type="button" className="btn btn--bare">
              cancelar
            </button>
          </div>
        </Cell>

        <Gallery />
      </Frame>
    </main>
  );
}
