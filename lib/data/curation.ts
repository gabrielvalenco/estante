/**
 * Curadoria manual por cima de books.json (gerado da Open Library).
 * A Open Library traz sinopses em várias línguas e às vezes o ano de uma edição,
 * não o da primeira publicação. Aqui ficam a sinopse em português, os gêneros,
 * o ano correto e a cor quando a capa é preto e branco.
 */
export type Curation = {
  synopsis: string;
  genres: string[];
  year?: number;
  color?: string;
};

export const CURATION: Record<string, Curation> = {
  OL1003040W: {
    year: 1899,
    genres: ["Clássico", "Literatura brasileira"],
    synopsis:
      "Bentinho, já velho, tenta reconstruir a própria vida e acaba num processo contra Capitu. Ela traiu ou não? Machado deixa a dúvida com você, e ela nunca mais vai embora.",
  },
  OL1003017W: {
    color: "#7d8b5a",
    genres: ["Clássico", "Literatura brasileira"],
    synopsis:
      "Um defunto autor conta a própria vida com ironia, digressões e nenhuma pressa. O livro que inaugurou o Realismo no Brasil e ainda parece escrito ontem.",
  },
  OL1002120W: {
    color: "#55555f",
    genres: ["Literatura brasileira", "Romance curto"],
    synopsis:
      "Macabéa, alagoana no Rio de Janeiro, vive sem saber que existe. Um narrador inquieto tenta contar a história dela e se desmonta no caminho.",
  },
  OL1756937W: {
    color: "#4f7a3a",
    genres: ["Clássico", "Literatura brasileira"],
    synopsis:
      "Riobaldo, ex-jagunço, conta sua travessia pelo sertão, o amor impossível por Diadorim e o pacto que talvez tenha feito com o diabo. Uma língua inventada que vira música.",
  },
  OL2900596W: {
    year: 1938,
    genres: ["Clássico", "Literatura brasileira"],
    synopsis:
      "Fabiano, Sinhá Vitória, os dois meninos e a cachorra Baleia fogem da seca pelo sertão. Pouca palavra, frase seca, e um soco no estômago a cada capítulo.",
  },
  OL1248157W: {
    color: "#c9a227",
    genres: ["Literatura brasileira", "Romance social"],
    synopsis:
      "Pedro Bala e um bando de meninos de rua vivem num trapiche em Salvador, entre pequenos furtos, liberdade e muita ternura escondida.",
  },
  OL24141556W: {
    genres: ["Literatura brasileira", "Contemporâneo"],
    synopsis:
      "Duas irmãs no sertão baiano, unidas por um acidente de infância com uma faca. Terra, herança da escravidão e a voz de mulheres que não se calam.",
  },
  OL796465W: {
    genres: ["Fábula", "Autoajuda"],
    synopsis:
      "Santiago, um pastor andaluz, sonha com um tesouro nas pirâmides do Egito e atravessa o deserto atrás dele. O livro brasileiro mais traduzido do mundo.",
  },
  OL1168083W: {
    genres: ["Distopia", "Clássico"],
    synopsis:
      "Winston Smith trabalha reescrevendo a história para o Partido, sob o olhar constante do Grande Irmão. Até que decide pensar por conta própria.",
  },
  OL10263W: {
    genres: ["Fábula", "Clássico"],
    synopsis:
      "Um aviador cai no deserto e encontra um principezinho vindo de um asteroide. Um livro infantil que só se entende de verdade depois de adulto.",
  },
  OL274505W: {
    genres: ["Realismo mágico", "Clássico"],
    synopsis:
      "Sete gerações da família Buendía em Macondo, onde chove por quatro anos e ninguém estranha. Tenha papel e caneta para a árvore genealógica.",
  },
  OL82563W: {
    genres: ["Fantasia", "Juvenil"],
    synopsis:
      "No aniversário de onze anos, Harry descobre que é bruxo e ganha uma vaga em Hogwarts. O começo de uma geração inteira de leitores.",
  },
  OL27482W: {
    genres: ["Fantasia", "Aventura"],
    synopsis:
      "Bilbo Bolseiro só queria seu chá, mas treze anões e um mago o arrastam para roubar o tesouro de um dragão.",
  },
  OL893414W: {
    color: "#b0762f",
    genres: ["Ficção científica", "Clássico"],
    synopsis:
      "Paul Atreides chega a Arrakis, o planeta de areia que produz a especiaria mais valiosa do universo. Política, religião, ecologia e vermes gigantes.",
  },
  OL66554W: {
    genres: ["Romance", "Clássico"],
    synopsis:
      "Elizabeth Bennet e o Sr. Darcy se detestam à primeira vista. Ironia fina, bailes e o romance que definiu o gênero.",
  },
  OL17075811W: {
    genres: ["Não ficção", "História"],
    synopsis:
      "Como uma espécie de macaco sem importância passou a dominar o planeta. História da humanidade contada como se fosse um thriller.",
  },
  OL24823017W: {
    year: 1915,
    genres: ["Clássico", "Novela"],
    synopsis:
      "Gregor Samsa acorda transformado num inseto monstruoso e sua maior preocupação é faltar ao trabalho. Curto, estranho e perturbadoramente atual.",
  },
  OL8479867W: {
    genres: ["Fantasia"],
    synopsis:
      "Kvothe, lenda viva, conta a um cronista a verdade sobre a própria história: a trupe, a universidade, a música e o nome do vento.",
  },
  OL21745884W: {
    genres: ["Ficção científica"],
    synopsis:
      "Ryland Grace acorda sozinho numa nave, sem memória, com a missão de salvar a Terra. Ciência, humor e uma amizade que você não vai esquecer.",
  },
  OL468431W: {
    year: 1925,
    genres: ["Clássico", "Romance"],
    synopsis:
      "Nick Carraway observa as festas de Jay Gatsby, o milionário misterioso que só quer reconquistar Daisy. O sonho americano em ressaca.",
  },
  OL27420W: {
    color: "#2f7fb0",
    genres: ["Literatura portuguesa", "Distopia"],
    synopsis:
      "Uma cegueira branca se espalha por uma cidade inteira e os primeiros infectados são isolados num manicômio. Só uma mulher continua enxergando.",
  },
  OL2625457W: {
    genres: ["Romance", "Literatura japonesa"],
    synopsis:
      "Uma música dos Beatles leva Toru Watanabe de volta a Tóquio nos anos 60, entre Naoko, frágil, e Midori, cheia de vida.",
  },
  OL20965973W: {
    genres: ["Ficção", "Fantasia"],
    synopsis:
      "Entre a vida e a morte há uma biblioteca, e cada livro é uma vida que Nora poderia ter vivido. Qual delas vale a pena?",
  },
  OL32525579W: {
    year: 1866,
    genres: ["Clássico", "Literatura russa"],
    synopsis:
      "Raskólnikov, estudante pobre em São Petersburgo, comete um assassinato para provar uma teoria. O castigo vem de dentro.",
  },
  OL3140822W: {
    genres: ["Clássico", "Romance"],
    synopsis:
      "No sul dos Estados Unidos dos anos 30, Scout acompanha o pai, o advogado Atticus Finch, defender um homem negro acusado injustamente.",
  },
  OL18203673W: {
    genres: ["Romance", "Contemporâneo"],
    synopsis:
      "A lendária Evelyn Hugo decide finalmente contar tudo, sete casamentos e um grande amor, para uma jornalista desconhecida. Por que ela?",
  },
  OL450063W: {
    genres: ["Clássico", "Terror"],
    synopsis:
      "Victor Frankenstein dá vida a uma criatura e foge dela no mesmo instante. Escrito por Mary Shelley aos 18 anos, inventou a ficção científica.",
  },
  OL64365W: {
    genres: ["Distopia", "Clássico"],
    synopsis:
      "Num futuro em que todos são felizes por decreto, fabricados em série e dopados de soma, um selvagem chega para perguntar o preço disso.",
  },
};
