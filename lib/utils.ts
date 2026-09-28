import { createCn } from "cn/config";

/**
 * Merge de classes com os tokens do projeto registrados.
 * Sem isso, `cn("text-hero text-ink")` descarta o tamanho achando que as duas classes são cor.
 * Todo tamanho de texto ou sombra novo do globals.css precisa entrar aqui.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "title", "section"] }],
      shadow: [{ shadow: ["cover", "cover-hover", "card"] }],
    },
  },
});
