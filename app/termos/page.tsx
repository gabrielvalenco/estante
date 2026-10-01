import type { Metadata } from "next";
import Link from "next/link";

import { ContactLine, LegalPage, List } from "@/components/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Termos de uso", description: `Regras de uso da ${SITE.name}.` };

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      intro={
        <p>
          Ao criar uma conta na {SITE.name}, você concorda com estes termos. Eles são curtos de propósito. Como tratamos seus dados está na{" "}
          <Link href="/privacidade" className="font-medium text-anil hover:text-anil-hover">
            política de privacidade
          </Link>
          .
        </p>
      }
      sections={[
        {
          id: "servico",
          title: "O serviço",
          body: (
            <p>
              A {SITE.name} é um diário de leitura social mantido como projeto independente, com um plano gratuito (Brochura) e um plano pago opcional (Capa Dura). Informações de livros e capas vêm da Open
              Library. Os leitores marcados como &ldquo;de demonstração&rdquo; são fictícios. O serviço é oferecido como está e pode mudar ou sair do ar.
            </p>
          ),
        },
        {
          id: "conta",
          title: "Sua conta",
          body: (
            <List>
              <li>É preciso ter pelo menos 13 anos; menores de 18, com autorização de um responsável.</li>
              <li>Uma pessoa, uma conta. Não finja ser outra pessoa, marca ou instituição.</li>
              <li>Nome e @ são únicos. Podemos pedir a troca de um nome ou @ que engane, ofenda ou imite outra pessoa.</li>
              <li>Você é responsável por manter sua senha em segredo.</li>
            </List>
          ),
        },
        {
          id: "conteudo",
          title: "O que você publica",
          body: (
            <>
              <p>
                Suas reviews continuam sendo suas. Ao publicar, você permite que a {SITE.name} as exiba no site, no seu perfil e nas páginas dos
                livros (ou só para seus seguidores, se o perfil for privado). Excluir a conta remove tudo.
              </p>
              <p>Não é permitido publicar:</p>
              <List>
                <li>discurso de ódio, assédio, ameaças ou exposição de dados pessoais de terceiros;</li>
                <li>spam, propaganda ou links enganosos;</li>
                <li>conteúdo ilegal ou que viole direitos autorais (como trechos longos de livros).</li>
              </List>
            </>
          ),
        },
        {
          id: "convivencia",
          title: "Convivência",
          body: (
            <p>
              Você pode tornar seu perfil privado, recusar pedidos para seguir e bloquear qualquer pessoa. Quem é bloqueado deixa de seguir você e não
              consegue mais interagir com seu perfil nem com suas reviews.
            </p>
          ),
        },
        {
          id: "planos",
          title: "Planos e pagamento",
          body: (
            <>
              <p>
                O plano Brochura é gratuito. O Capa Dura é uma assinatura mensal ou anual que amplia os limites de citações, notas e discussões; os
                preços e o que cada plano inclui ficam na página de Planos. O pagamento é feito com cartão pelo Stripe, que processa os dados do
                cartão: a {SITE.name} não os vê nem os guarda.
              </p>
              <p>
                A assinatura renova sozinha no fim de cada período, pelo mesmo valor, até você cancelar. Você cancela quando quiser em Gerenciar
                assinatura, e o plano continua valendo até o fim do período já pago, sem cobrança nova.
              </p>
              <p>
                Direito de arrependimento: em até 7 dias da contratação, você pode desistir e recebe o valor pago de volta, pelo mesmo meio de
                pagamento (Código de Defesa do Consumidor, art. 49). Para isso, fale conosco pelo contato abaixo.
              </p>
              <p>
                Se o plano mudar de preço, avisamos antes da próxima renovação. Se uma cobrança falhar, o Stripe tenta de novo por alguns dias; sem
                pagamento, a conta volta ao Brochura, e suas anotações continuam salvas.
              </p>
            </>
          ),
        },
        {
          id: "suspensao",
          title: "Suspensão",
          body: (
            <p>
              Podemos remover conteúdo ou suspender contas que descumpram estes termos. Sempre que possível, avisamos antes e explicamos o motivo.
            </p>
          ),
        },
        {
          id: "contato",
          title: "Contato",
          body: (
            <p>
              Dúvidas, denúncias ou pedidos: use a <Link href="/ajuda" className="font-medium text-anil hover:text-anil-hover">página de Ajuda</Link> ou fale com {SITE.controller} <ContactLine />. Estes termos seguem a lei brasileira.
            </p>
          ),
        },
      ]}
    />
  );
}
