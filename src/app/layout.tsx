import type { Metadata, Viewport } from "next";
import { Big_Shoulders, M_PLUS_1_Code } from "next/font/google";
import "./globals.css";

// Display: condensada e industrial. El eje óptico se incluye para que el
// titular use el dibujo pensado para tamaños grandes.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Mono con kana y kanji nativos: los títulos en japonés no caen en otra letra.
const mplusCode = M_PLUS_1_Code({
  variable: "--font-mplus-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "slicelist",
  description:
    "Pega una playlist de YouTube Music y mira qué canciones tienen mapa en Beat Saber.",
};

export const viewport: Viewport = {
  themeColor: "#0c0b0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bigShoulders.variable} ${mplusCode.variable} antialiased`}>
      <body>
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
