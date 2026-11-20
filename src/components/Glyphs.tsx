// Glifos propios, dibujados sobre una cuadrícula de 12 con las mismas formas
// rectas que los marcadores. No se usa ninguna librería de iconos.

import type { ReactNode } from "react";

function Glyph({ children, size = 12 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="flex-none"
    >
      {children}
    </svg>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};

export function PlayGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <polygon points="3,1.5 10.5,6 3,10.5" />
    </Glyph>
  );
}

export function PauseGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <rect x="2.5" y="2" width="2.5" height="8" />
      <rect x="7" y="2" width="2.5" height="8" />
    </Glyph>
  );
}

export function DownloadGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <rect x="5.1" y="1" width="1.8" height="4.5" />
      <polygon points="2.2,5 9.8,5 6,8.8" />
      <rect x="1.5" y="9.7" width="9" height="1.5" />
    </Glyph>
  );
}

export function OutGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M4.5 2.5H2.5v7h7v-2" {...stroke} />
      <path d="M7 2.5h2.5V5" {...stroke} />
      <path d="M9.5 2.5 5.5 6.5" {...stroke} />
    </Glyph>
  );
}

/** Silueta de visor, con la muesca de la nariz. */
export function HeadsetGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M1 3.5h10v5.5H7.6L6 7.2 4.4 9H1z" />
    </Glyph>
  );
}

export function CheckGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M2 6.4 4.7 9 10 3.4" {...stroke} strokeWidth={1.8} />
    </Glyph>
  );
}

export function ChevronGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M2.8 4.4 6 7.6l3.2-3.2" {...stroke} />
    </Glyph>
  );
}

export function UpGlyph({ size = 9 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <polygon points="6,2.5 10.5,9.5 1.5,9.5" />
    </Glyph>
  );
}

export function DownGlyph({ size = 9 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <polygon points="1.5,2.5 10.5,2.5 6,9.5" />
    </Glyph>
  );
}

/** Altavoz: tres barritas de volumen. */
export function VolumeGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <rect x="1.5" y="4" width="2" height="4" />
      <rect x="4.5" y="2.5" width="2" height="7" />
      <rect x="7.5" y="1" width="2" height="10" />
    </Glyph>
  );
}

/** Estrella de cinco puntas, para el enlace de GitHub. */
export function StarGlyph({ size }: { size?: number }) {
  return (
    <Glyph size={size}>
      <polygon points="6,1 7.4,4.6 11.2,4.8 8.2,7.2 9.2,10.8 6,8.8 2.8,10.8 3.8,7.2 0.8,4.8 4.6,4.6" />
    </Glyph>
  );
}
