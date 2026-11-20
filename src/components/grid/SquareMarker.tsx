export type MarkerState = "idle" | "searching" | "found" | "none" | "error";

/**
 * Marcador cuadrado. Siempre significa lo mismo:
 * hueco = buscando o en espera, azul = con mapa, apagado = sin mapa, rojo = fallo.
 */
export function SquareMarker({
  state = "idle",
  label,
  className = "",
}: {
  state?: MarkerState;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`marker ${className}`}
      data-state={state}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
