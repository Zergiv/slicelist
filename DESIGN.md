# slicelist: design system

Referencia de diseño del proyecto. Los tokens viven en `src/app/globals.css`; si cambia uno,
cambian los dos sitios. La muestra viva está en `/design`.

## Para quién y para qué

- **Quién**: gente que juega a Beat Saber con mapas de la comunidad y tiene su música en YouTube Music o Spotify.
- **Trabajo de la página**: pegar un enlace, ver qué canciones tienen mapa, escuchar, y añadirlas
  al visor o descargarlas.
- **De dónde sale la identidad**: del propio juego (el brillo del sable, los bloques cuadrados, el
  corte) y del catálogo real de BeatSaver, lleno de títulos en japonés.

## Color

Un solo acento. El rojo existe solo para fallos (es el otro sable: el del "miss").

```css
:root {
  --ink-0: #0c0b0a;        /* fondo */
  --ink-1: #141210;        /* celda destacada */
  --ink-2: #1c1916;        /* superficie al pasar el cursor, campos */
  --line: #2a2622;         /* líneas de la rejilla */
  --line-strong: #3d3731;  /* marco exterior */
  --edge: #6f685e;         /* borde de controles (3,57:1 sobre el fondo) */
  --bone: #ebe4d8;         /* texto principal (15,56:1) */
  --ash: #a39b8e;          /* texto secundario (7,15:1) */
  --smoke: #8a8277;        /* texto terciario (5,19:1; 4,62:1 sobre --ink-2) */
  --saber: #4aa3ff;        /* acento (7,47:1); el texto encima va en --ink-0 */
  --saber-deep: #17324f;   /* relleno de selección */
  --saber-glow: rgba(74, 163, 255, 0.28);
  --ember: #ff5a47;        /* solo errores (6,37:1) */
  --diff-easy: #3cb371;
  --diff-normal: #59b0f4;
  --diff-hard: #f0c400;
  --diff-expert: #ff6a3d;
  --diff-expert-plus: #bf2aee;
}
```

Las etiquetas de dificultad usan esos cinco colores (borde, texto y un tinte de fondo). La
puntuación del mapa se pinta en sable si es alta (≥90 %), en hueso si es media y en ember si
es baja. En Tailwind solo existen estos colores (`bg-ink-1`, `text-ash`, `border-line`...). La
paleta por defecto está desactivada.

## Tipografía

Dos familias, muy distintas entre sí.

- **Display: Big Shoulders**, peso 900, en minúsculas. Condensada e industrial, con curvas
  cuadradas. Se usa en el titular y en los números grandes.
- **Texto y metadatos: M PLUS 1 Code**, pesos 400, 500 y 700. Mono con kana y kanji nativos: un
  título en japonés queda en la misma letra que "Daft Punk".
- **Reglas**: etiquetas en minúsculas, nunca en mayúsculas sostenidas; texto corrido a 68
  caracteres como máximo; cifras tabulares en todo.

| Token | Tamaño | Interlineado | Uso |
| --- | --- | --- | --- |
| `--text-meta` | 12px | 1.5, tracking 0.02em | metadatos, etiquetas, botones |
| `--text-body` | 14px | 1.65 | texto corrido |
| `--text-lead` | 16px | 1.6 | entrada, campo de enlace |
| `--text-title` | 21px | 1.3, peso 500 | título de canción abierta |
| `--text-num` | 48px | 1, display 800 | contadores |
| `--text-display` | 72px | 0.9, display 900 | titulares secundarios |
| `--text-hero` | `clamp(88px, 35cqw + 0.35 × margen de celda, 600px)` | 0.82, display 900 | el titular |

El titular se mide contra el ancho de su celda (`.hero`), no contra la ventana, para que se salga
por la derecha lo mismo en móvil que en escritorio: pierde el brazo derecho de la última "t".

## Espaciado y rejilla

`--s-1` a `--s-10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px. En Tailwind son los pasos
1, 2, 3, 4, 6, 8, 12, 16, 24 y 32. El margen interior de celda (`--cell-pad`) es 16 px en móvil
y 24 px desde 768 px.

- Rejilla de 12 columnas con cortes desiguales (7/5 y 3/9). Las líneas son el hueco de 1 px entre
  celdas (`.frame` y `.cell`), así que solo aparecen en bordes de celda reales.
- Todo alineado a la izquierda.
- En móvil pasa a una columna y las líneas quedan como reglas horizontales.

## Radios

Las líneas son estructura y van en ángulo recto; los objetos que viven dentro de las celdas son
material y van redondeados.

| Token | Valor | Uso |
| --- | --- | --- |
| `--r-xs` | 2px | marcadores cuadrados, etiquetas de dificultad |
| `--r-s` | 6px | botones, campo de enlace |
| `--r-m` | 10px | portadas |
| `--r-l` | 16px | bloque de estado, "ahora suena" |

## Luz y grano

Sin sombras duras: la profundidad es luz.

```css
:root {
  --glow-focus: 0 0 0 1px var(--saber), 0 0 24px var(--saber-glow);
  --glow-active: 0 0 0 1px var(--saber), 0 0 28px var(--saber-glow),
                 0 0 90px rgba(74, 163, 255, 0.12);
  --glow-cover: 0 0 60px rgba(235, 228, 216, 0.04);
  --lift: 0 24px 60px -30px rgba(0, 0, 0, 0.8);
}
```

- **Luz de sable** (`.saber-light`): un único resplandor grande, fuera de eje, detrás del titular.
- **Grano** (`.grain`): ruido generado en SVG, fijo y estático, opacidad 0.07.

## Movimiento

Rápido cuando responde a la persona, lento cuando es ambiente.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-spring: linear(...);          /* muelle suave, para la inercia del encuadre */
--t-press: 140ms;  --t-hover: 200ms;  --t-open: 260ms;
--t-cut: 900ms;    --t-marquee: 80s;
```

- **El corte** (único momento orquestado): al cargar, una línea de luz cruza el titular en
  diagonal y las dos mitades quedan desplazadas. Ocurre una vez.
- **Encuadre**: las esquinas de la portada se cierran sobre ella con inercia al pasar el cursor.
- **Envío al visor**: el botón se rellena de izquierda a derecha según el avance real.
- **Carrusel de portadas**: lineal y lento; se detiene al pasar el cursor, al enfocar o con su
  control de pausa.
- **Abrir una canción**: 260 ms; los mapas entran escalonados cada 40 ms.
- **Contador**: cambia cuando una canción encuentra mapa; es un cambio de estado real.
- **Botones**: `scale(0.97)` al pulsar.
- **`prefers-reduced-motion`**: el titular aparece ya cortado, el carrusel queda quieto y
  desplazable a mano, y solo se conservan cambios de opacidad y color.

## Piezas propias (cada una lleva información)

- **Marcador cuadrado**: hueco = buscando, azul = con mapa, apagado = sin mapa, rojo = fallo.
- **Esquinas de encuadre**: tenues en todas las portadas; azules y cerradas en la que está
  abierta o sonando.
- **Bloque de estado**: un mosaico con un cuadrado por canción (azul con mapa, apagado sin mapa,
  hueco pendiente, latiendo mientras se busca) que siempre ocupa lo mismo: pocas canciones,
  cuadrados grandes; muchas, pequeños. Al lado, playlist, canciones, con mapa, sin mapa, mapas en
  total, cuánto tardó y el visor. Abajo, la fila de muestras de color.
- **Filtro**: "con mapa / sin mapa" con su número en la tipografía del titular. Es lo único,
  junto al titular, que usa ese tamaño.
- **Canción y mapa**: filas separadas por líneas, sin tarjetas. En un mapa, "Escuchar" y
  "Añadir al visor" llevan borde; "Descargar" y "Ver mapa" son solo texto.
- **Botón de envío**: un solo control con sus estados: "Añadir al visor", "Enviando" con su
  avance, "En tu visor".
- **Ahora suena**: la vista previa que estés escuchando, fija en su celda; en pantallas pequeñas
  es una barra abajo que solo aparece cuando suena algo.
- **Numeración**: solo la posición de cada canción en la playlist, porque sí es una secuencia.
- **Glifos**: sin librería; unos pocos dibujados sobre cuadrícula en `src/components/Glyphs.tsx`.

## Voz (español e inglés)

Cercana y con humor, sin explicar cómo funciona por dentro. Todos los textos están en
`src/lib/i18n/`.

- Campo: "Pega aquí el enlace de tu playlist". Botón: "Buscar mapas".
- Vacío: "Aquí aparecerán tus canciones. De momento, silencio."
- Sin mapa: "Nadie las ha mapeado. Todavía."
- Fallo: "Esa playlist es privada o no existe. Hazla pública y vuelve a pegarla."
- Visor: "Conecta tu Quest con el cable y lo mando directo al juego."
- Al terminar: "Listo. Reinicia Beat Saber y a cortar."

## Lo que no se hace

Gradientes morados, tarjetas idénticas con sombra, etiquetas en mayúsculas sobre cada título,
metadatos unidos con puntos, flechas pegadas a los botones, iconos de librería, entradas con
deslizamiento en cada sección.
