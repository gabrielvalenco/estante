
/**
 * Suporte: textos e perguntas frequentes (sem nada de servidor: o app recebe tudo pela API).
 * O e-mail de suporte é público (site, termos e Stripe).
 */

export const SUPPORT_TOPICS = ["conta", "cobranca", "reembolso", "erro", "denuncia", "privacidade", "sugestao"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
export const SUPPORT_STATUSES = ["aberto", "respondido", "resolvido"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportContext = { plan?: string; subscription?: string | null; platform?: "site" | "app"; appVersion?: string | null; page?: string | null };

export type SupportError = "invalid" | "rate_limited" | "not_found" | "unauthenticated" | "forbidden";

export const SUPPORT_EMAIL = "estante.sup.br@gmail.com";

export const TOPIC_LABELS: Record<SupportTopic, string> = {
  conta: "Conta e login",
  cobranca: "Assinatura e cobrança",
  reembolso: "Pedido de reembolso",
  erro: "Problema ou erro",
  denuncia: "Denúncia",
  privacidade: "Privacidade e dados",
  sugestao: "Sugestão",
};

export const STATUS_LABELS: Record<SupportStatus, string> = {
  aberto: "Aguardando resposta",
  respondido: "Respondido",
  resolvido: "Resolvido",
};

export const ticketLabel = (n: number) => `#${String(n).padStart(4, "0")}`;

/** Ator que aparece nas notificações de resposta (nunca o perfil pessoal de quem respondeu). */
export const SUPPORT_ACTOR = { handle: "", name: "Suporte da Estante", tone: "anil", avatarUrl: null, isPrivate: false, founder: false };

export type FaqItem = { q: string; a: string; link?: { label: string; href: string } };
export type FaqGroup = { title: string; items: FaqItem[] };

/** Perguntas frequentes. `href` é um caminho do site; o app troca pelos equivalentes dele quando existem. */
export const FAQ: FaqGroup[] = [
  {
    title: "Conta e login",
    items: [
      {
        q: "Como instalo o app no Android?",
        a: "Baixe o APK pelo link abaixo, no celular. Como o app ainda não está na Play Store, o Android pede para permitir a instalação desse arquivo e pode mostrar um aviso do Play Protect; é só confirmar. Versões novas aparecem em Configurações, no app.",
        link: { label: "Baixar o app", href: "/app/baixar" },
      },
      {
        q: "Criei a conta com Google ou GitHub. Como entro no app?",
        a: "Na tela de entrar do app, toque em “Continuar com Google, GitHub ou o site”. O site abre, você entra como sempre e confirma. É a mesma conta, com a mesma estante.",
      },
      {
        q: "Esqueci minha senha.",
        a: "Por enquanto a troca de senha é feita pelo suporte: mande um pedido com o assunto Conta e login, a partir do e-mail cadastrado. Se você entra com Google ou GitHub, não existe senha para esquecer.",
      },
      {
        q: "Tenho duas contas. Dá para juntar?",
        a: "Contas criadas por caminhos diferentes (Google, GitHub ou e-mail) ficam separadas. Exporte a estante de uma e importe na outra, ou fale com a gente para ajudar.",
        link: { label: "Exportar meus dados", href: "/conta#dados" },
      },
    ],
  },
  {
    title: "Planos e cobrança",
    items: [
      {
        q: "Como cancelo minha assinatura?",
        a: "Em Planos, toque em Gerenciar assinatura e depois em Cancelar. O plano continua valendo até o fim do período já pago e não renova.",
        link: { label: "Ir para Planos", href: "/planos" },
      },
      {
        q: "Posso trocar entre Capa Dura e Ex Libris?",
        a: "Sim, em Gerenciar assinatura. Ao subir de plano você paga só a diferença proporcional; ao descer, a troca vale no fim do período pago.",
        link: { label: "Ir para Planos", href: "/planos" },
      },
      {
        q: "Me arrependi. Tenho reembolso?",
        a: "Em até 7 dias da contratação você pode desistir e recebe o valor de volta (Código de Defesa do Consumidor, art. 49). Mande um pedido com o assunto Pedido de reembolso.",
      },
      {
        q: "A cobrança foi recusada.",
        a: "O plano continua ativo por alguns dias enquanto o cartão é tentado de novo. Atualize o cartão em Gerenciar assinatura.",
        link: { label: "Ir para Planos", href: "/planos" },
      },
    ],
  },
  {
    title: "Leitura",
    items: [
      {
        q: "Como funcionam as discussões sem spoiler?",
        a: "Cada mensagem diz até que página fala. Você só vê o que vem antes do seu marcador de página; o resto aparece como aviso de spoiler, que você pode abrir se quiser.",
      },
      {
        q: "Como entro num clube de leitura?",
        a: "Com o link ou o código de convite de quem criou o clube. Participar é grátis; criar clubes é do plano Ex Libris.",
        link: { label: "Ver clubes", href: "/clubes" },
      },
      {
        q: "A citação por foto não funcionou.",
        a: "Fotografe a página de frente, com boa luz e o texto inteiro aparecendo. Você sempre revisa o trecho antes de salvar.",
      },
    ],
  },
  {
    title: "Privacidade",
    items: [
      {
        q: "Como baixo meus dados?",
        a: "Em Configurações da conta, na seção Seus dados, você baixa tudo em JSON: estante, reviews, notas, clubes e pedidos de suporte.",
        link: { label: "Abrir Configurações", href: "/conta#dados" },
      },
      {
        q: "Como excluo minha conta?",
        a: "Em Configurações da conta, na seção Seus dados. A exclusão apaga a estante, as reviews, as notas e os pedidos de suporte, e não pode ser desfeita.",
        link: { label: "Abrir Configurações", href: "/conta#dados" },
      },
    ],
  },
];
