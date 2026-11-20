import type { ReactNode } from "react";

/**
 * Esquinas de encuadre sobre una portada. En reposo quedan abiertas y tenues;
 * se cierran al pasar el cursor por el elemento con clase `framing-host` que
 * las contenga, y quedan cerradas y azules cuando `active` (abierta o sonando).
 */
export function ViewfinderCorners({
  active = false,
  className = "",
  children,
}: {
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`framing ${className}`} data-active={active}>
      {children}
      <span className="framing__corner framing__corner--tl" aria-hidden="true" />
      <span className="framing__corner framing__corner--tr" aria-hidden="true" />
      <span className="framing__corner framing__corner--bl" aria-hidden="true" />
      <span className="framing__corner framing__corner--br" aria-hidden="true" />
    </span>
  );
}
