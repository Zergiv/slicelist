// Formatos de cara a quien usa la web. Sin dependencias.

/** 224 -> "3:44" */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** 0.9442 -> "94,4 %" (según idioma) */
export function percent(score: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(score);
}

/** 18990 -> "18.990" (según idioma) */
export function count(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** 4210 ms -> "4,2" */
export function seconds(ms: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ms / 1000);
}

/** 123.5 -> "124 bpm" */
export function bpm(value: number): string {
  return `${Math.round(value)} bpm`;
}
