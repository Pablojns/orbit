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
          <strong>Lista de espera:</strong> seu e-mail, se você aceitou receber novidades e de onde veio o acesso (por
          exemplo, um link do Instagram).
        </li>
        <li>
          <strong>Conta no app:</strong> e-mail, nome que você escolher e as informações que você mesmo lançar
          (entradas, gastos, cartões, contas, metas, prazos e hábitos).
        </li>
        <li>
          <strong>Uso do site:</strong> estatísticas de visitas sem identificar você pessoalmente (páginas vistas, tipo
          de aparelho, país).
        </li>
      </ul>
      <p>O {SITE.name} não pede senha de banco nem número de cartão.</p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Avisar você quando o app abrir (lista de espera).</li>
        <li>Mandar novidades e ofertas, somente se você marcou essa opção.</li>
        <li>Fazer o app funcionar: calcular seu ciclo, faturas e o valor livre para gastar.</li>
        <li>Entender como o site é usado, para melhorar o produto.</li>
      </ul>
      <p>Não vendemos nem compartilhamos seus dados para publicidade de terceiros.</p>

      <h2>Onde os dados ficam</h2>
      <p>
        Os dados ficam em provedores de infraestrutura contratados para isso (Supabase, para o banco de dados, e Vercel,
        para a hospedagem), que podem armazená-los fora do Brasil. Cada conta só acessa os próprios dados.
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Mantemos os dados enquanto sua inscrição ou sua conta existir. Quando você pede a exclusão, apagamos em até 30
        dias, exceto o que a lei exigir guardar.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção, exclusão dos seus dados ou sair da lista de espera a qualquer momento,
        escrevendo para {SITE.contactEmail}. Também pode retirar o consentimento para receber novidades, sem custo.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>Se esta política mudar, a data no topo da página será atualizada.</p>
    </LegalPage>
  );
}
