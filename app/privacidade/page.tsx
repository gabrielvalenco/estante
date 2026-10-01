import type { Metadata } from "next";
import Link from "next/link";

import { ContactLine, LegalPage, List } from "@/components/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Estante trata seus dados pessoais, de acordo com a LGPD (Lei 13.709/2018).",
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-anil hover:text-anil-hover">
    {children}
  </Link>
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      intro={
        <p>
          Esta política explica, em português direto, quais dados pessoais a {SITE.name} trata, por quê, com quem compartilha e como você exerce
          seus direitos, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Você pode usar a estante sem conta: nesse caso,
          nada sobre você vai para os nossos servidores.
        </p>
      }
      sections={[
        {
          id: "controlador",
          title: "Quem é o controlador",
          body: (
            <p>
              O controlador dos dados é {SITE.controller}, que também atua como encarregado (art. 41). Para qualquer assunto sobre seus dados,
              fale conosco <ContactLine />.
            </p>
          ),
        },
        {
          id: "dados",
          title: "Quais dados tratamos",
          body: (
            <>
              <p>
                <strong className="text-ink">Sem conta:</strong> sua estante e sua preferência de tema ficam só no seu navegador (armazenamento
                local). Não recebemos esses dados.
              </p>
              <p>
                <strong className="text-ink">Com conta:</strong>
              </p>
              <List>
                <li>Cadastro: nome de exibição, @ e, se você escolher, bio, meta de leitura, cor do avatar, foto de perfil e até 3 redes sociais.</li>
                <li>
                  Foto de perfil: se entrar com Google ou GitHub, copiamos a foto pública dessa conta como sua foto inicial. Você pode trocar ou
                  remover a qualquer momento; removida, ela não volta. Toda foto é reduzida para 256×256 e os metadados do arquivo (como localização
                  e modelo da câmera) são descartados. A foto é pública, mesmo com o perfil privado, como o nome.
                </li>
                <li>
                  Login: se entrar com Google ou GitHub, o identificador da conta nesse serviço, o nome público e a foto. Se entrar com e-mail e senha, o
                  e-mail e a senha guardada com hash (scrypt com salt); nunca guardamos a senha em si.
                </li>
                <li>Uso: livros na estante, notas, curtidas, reviews, datas de leitura, quem você segue, bloqueios, reações e notificações.</li>
                <li>
                  Anotações de leitura: marcador de página, citações e notas que você guarda em cada livro. São privadas: só você vê, e elas
                  não aparecem no seu perfil, nem para seguidores.
                </li>
                <li>
                  Clubes de leitura: se você entrar num clube, os outros membros veem seu nome, sua foto, até que página você leu do livro
                  do clube e o que você escreve nas discussões dele. Suas outras anotações continuam só suas. Sair do clube encerra isso.
                </li>
                <li>
                  Técnicos: um cookie de sessão para manter você conectado e registros de acesso da hospedagem (endereço IP, data e página), usados
                  para segurança.
                </li>
              </List>
              <p>Não coletamos localização, dados sensíveis nem dados de pagamento.</p>
            </>
          ),
        },
        {
          id: "finalidades",
          title: "Para que usamos e com qual base legal",
          body: (
            <List>
              <li>
                <strong className="text-ink">Manter sua conta e sua estante</strong> e mostrar seu perfil: execução do serviço que você pediu
                (art. 7º, V).
              </li>
              <li>
                <strong className="text-ink">Recursos sociais</strong> (seguir, reações, notificações, sugestões de leitores por gosto em comum):
                execução do serviço (art. 7º, V). As sugestões usam só os livros que você marcou, nunca localização.
              </li>
              <li>
                <strong className="text-ink">Segurança</strong> (bloqueio de tentativas de login, prevenção de abuso): legítimo interesse (art. 7º,
                IX) e cumprimento de obrigação legal de guarda de registros de acesso (Marco Civil da Internet, art. 15).
              </li>
            </List>
          ),
        },
        {
          id: "publico",
          title: "O que fica público",
          body: (
            <>
              <p>
                Por padrão, seu perfil, sua estante, suas reviews e seus seguidores são públicos, como numa rede social de leitura. Você pode tornar o
                perfil <strong className="text-ink">privado</strong> em <A href="/conta#privacidade">Configurações</A>: aí só seguidores
                aprovados veem sua estante, seu diário e suas reviews, e elas saem das páginas públicas dos livros. Seu nome e seu @ continuam
                aparecendo na busca, para que as pessoas possam pedir para seguir você.
              </p>
              <p>Seu e-mail nunca aparece para outras pessoas.</p>
            </>
          ),
        },
        {
          id: "compartilhamento",
          title: "Com quem compartilhamos",
          body: (
            <>
              <p>Não vendemos nem alugamos dados. Usamos operadores que tratam dados em nosso nome, só para o serviço funcionar:</p>
              <List>
                <li>Vercel (hospedagem do site, registros de acesso e armazenamento das fotos de perfil).</li>
                <li>
                  Anthropic, só quando você usa a citação por foto: a foto da página é enviada para o Claude ler o texto e não fica
                  guardada na Estante. A Anthropic não usa esses dados para treinar modelos e pode mantê-los por até 30 dias para segurança.
                </li>
                <li>
                  Stripe, se você assinar o Capa Dura: processa o pagamento e guarda os dados do cartão e o e-mail da cobrança. Aqui ficam só o
                  identificador de cliente no Stripe, o plano, a situação e as datas da assinatura.
                </li>
                <li>Neon (banco de dados).</li>
                <li>Google e GitHub, somente se você escolher entrar por eles.</li>
                <li>Open Library, que recebe os termos que você busca (sem qualquer dado da sua conta).</li>
                <li>GitHub e Bluesky, que recebem o @ informado quando conferimos se uma rede social é sua.</li>
              </List>
              <p>
                <strong className="text-ink">Links de compra:</strong> o botão &ldquo;Comprar na Amazon&rdquo; é um link de afiliado. Como
                Associado da Amazon, a {SITE.name} ganha com compras qualificadas, sem custo extra para você. Ao clicar, você vai para o site da
                Amazon, que tem a própria política de privacidade e pode usar cookies próprios. Não enviamos nenhum dado da sua conta à Amazon.
              </p>
              <p>
                Esses serviços podem guardar dados fora do Brasil. A transferência internacional se apoia na execução do serviço que você pediu (art.
                33, IX) e nas garantias contratuais desses fornecedores.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <p>
              Usamos apenas cookies essenciais: o de sessão (para manter você conectado) e os de segurança do login. Não usamos cookies de
              publicidade, de rastreamento nem ferramentas de analytics. Por isso não há banner de consentimento: cookies estritamente necessários
              não dependem dele.
            </p>
          ),
        },
        {
          id: "retencao",
          title: "Por quanto tempo guardamos",
          body: (
            <p>
              Enquanto sua conta existir. Ao excluir a conta, apagamos na hora seu perfil, sua estante, suas reviews, seus seguidores, reações e
              notificações. Registros de acesso da hospedagem ficam pelo prazo exigido por lei (seis meses, Marco Civil da Internet, art. 15) e
              depois são descartados pelo provedor.
            </p>
          ),
        },
        {
          id: "direitos",
          title: "Seus direitos",
          body: (
            <>
              <p>A LGPD (art. 18) garante, e você pode exercer diretamente no site:</p>
              <List>
                <li>
                  <strong className="text-ink">Acesso e portabilidade:</strong> baixe todos os seus dados em JSON em{" "}
                  <A href="/conta#dados">Configurações › Seus dados</A>.
                </li>
                <li>
                  <strong className="text-ink">Correção:</strong> edite nome, @, foto, bio e redes em <A href="/conta">Configurações</A>.
                </li>
                <li>
                  <strong className="text-ink">Eliminação:</strong> exclua a conta em <A href="/conta#dados">Configurações › Seus dados</A>.
                </li>
                <li>
                  <strong className="text-ink">Informação e oposição:</strong> pergunte o que quiser sobre o tratamento <ContactLine />.
                </li>
              </List>
              <p>
                Se achar que seus direitos não foram respeitados, você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
              </p>
            </>
          ),
        },
        {
          id: "seguranca",
          title: "Segurança",
          body: (
            <p>
              Conexão sempre criptografada (HTTPS), senhas com hash scrypt, bloqueio temporário após tentativas erradas de login, e cada pessoa só
              consegue alterar os próprios dados: toda escrita é conferida no servidor contra a sua sessão. Nenhum sistema é infalível; se
              identificarmos um incidente que possa trazer risco a você, avisaremos você e a ANPD (art. 48).
            </p>
          ),
        },
        {
          id: "criancas",
          title: "Crianças e adolescentes",
          body: (
            <p>
              A {SITE.name} não é direcionada a crianças. Para criar uma conta é preciso ter pelo menos 13 anos; menores de 18 devem ter autorização
              de um responsável.
            </p>
          ),
        },
        {
          id: "mudancas",
          title: "Mudanças nesta política",
          body: (
            <p>
              Se mudarmos algo relevante, a data no topo desta página é atualizada e, para mudanças importantes, avisamos no próprio site. Veja
              também os <A href="/termos">termos de uso</A>.
            </p>
          ),
        },
      ]}
    />
  );
}
