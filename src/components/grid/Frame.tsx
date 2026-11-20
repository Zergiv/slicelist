import type { ComponentProps } from "react";

/** Marco de la rejilla editorial: 12 columnas separadas por líneas de 1px. */
export function Frame({ className = "", ...rest }: ComponentProps<"div">) {
  return <div className={`frame ${className}`} {...rest} />;
}

/**
 * Celda de la rejilla. Por defecto ocupa todo el ancho; el reparto en
 * escritorio se da con clases `lg:col-span-*`.
 */
export function Cell({
  as: Tag = "div",
  className = "",
  ...rest
}: ComponentProps<"div"> & { as?: "div" | "section" | "header" | "aside" | "footer" | "nav" }) {
  return <Tag className={`cell ${className}`} {...rest} />;
}
