import { LegalPage } from "../_site/legal-page";
import { SITE } from "@/lib/site";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt={SITE.updatedAt}>
      <p>
        Esta política explica quais dados o {SITE.name} coleta, para que usa e quais são os seus direitos, de acordo com
        a Lei Geral de Proteção de Dados (Lei 13.709/2018). Responsável pelo tratamento: {SITE.legalName}. Contato:{" "}
        <a className="text-cobalt underline" href={`mailto:${SITE.contactEmail}`}>
          {SITE.contactEmail}
        </a>
        .
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Conta no app:</strong> e-mail, nome que você escolher e as informações que você mesmo lançar
          (entradas, gastos, cartões, contas, metas, prazos e hábitos).
        </li>
        <li>
          <strong>Uso do site:</strong> estatísticas de visitas sem identificar você pessoalmente (páginas vistas, tipo
          de aparelho, país).
        </li>
        <li>
          <strong>Assinatura:</strong> nome e CPF são enviados direto ao Asaas, que processa o pagamento. O {SITE.name}
          guarda só a situação da assinatura e os códigos de cliente e de assinatura do Asaas, sem o CPF.
        </li>
        <li>
          <strong>Voz:</strong> quando você usa o microfone, o trecho da sua fala é enviado à Groq só para virar texto.
          O {SITE.name} guarda só o texto do que você lançou, nunca o áudio.
        </li>
      </ul>
      <p>O {SITE.name} não pede senha de banco nem número de cartão.</p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Entrar na sua conta, cobrar a assinatura e mandar avisos importantes e os lembretes que você ligar.</li>
        <li>Fazer o app funcionar: calcular seu ciclo, faturas e o valor livre para gastar.</li>
        <li>Entender como o site é usado, para melhorar o produto.</li>
      </ul>
      <p>Não vendemos nem compartilhamos seus dados para publicidade de terceiros.</p>

      <h2>Onde os dados ficam</h2>
      <p>
        Os dados ficam em provedores contratados para isso: Supabase (banco de dados), Vercel (hospedagem), Groq (leitura
        das frases que você escreve e transcrição do que você fala) e Asaas (pagamento). Alguns podem armazenar os dados fora do Brasil. Cada
        conta só acessa os próprios dados.
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Mantemos os dados enquanto sua conta existir, inclusive com a assinatura pausada. A exclusão pela tela de Perfil
        apaga na hora. Pedidos por e-mail são atendidos em até 15 dias, exceto o que a lei exigir guardar (como registros
        de pagamento).
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode ver, corrigir, exportar (Perfil &gt; Exportar meus dados) e excluir (Perfil &gt; Excluir conta) seus
        dados quando quiser. Para qualquer outro pedido, escreva para {SITE.contactEmail}.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>Se esta política mudar, a data no topo da página será atualizada.</p>
    </LegalPage>
  );
}
