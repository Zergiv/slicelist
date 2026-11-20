"use client";

import { useState } from "react";

/** Portada cuadrada. Si no hay imagen (o falla), enseña la inicial del título. */
export function Cover({
  src,
  title,
  size,
  className = "",
}: {
  src?: string;
  title: string;
  size: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initial = [...title.trim()][0]?.toUpperCase() ?? "";

  return (
    <span
      className={`cover ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-display font-black text-edge"
          style={{ fontSize: Math.round(size * 0.55), lineHeight: 1 }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
