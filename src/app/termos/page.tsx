import { LegalPage } from "../_site/legal-page";
import { SITE } from "@/lib/site";

export const metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt={SITE.updatedAt}>
      <p>
        Ao usar o {SITE.name}, você concorda com estes termos. O serviço é oferecido por {SITE.legalName}.
      </p>

      <h2>O que o Orbit é</h2>
      <p>
        Uma ferramenta de organização pessoal: ajuda você a acompanhar dinheiro, prazos e hábitos com base nas
        informações que você mesmo lança. O {SITE.name} não é banco, não movimenta dinheiro e não dá recomendação de
        investimento. As decisões sobre o seu dinheiro são suas.
      </p>

      <h2>Fase de lançamento</h2>
      <p>
        O app está em desenvolvimento ativo. Funcionalidades podem mudar, falhar ou ser retiradas. Recomendamos conferir valores
        importantes, como faturas, diretamente no seu banco.
      </p>

      <h2>Sua conta</h2>
      <ul>
        <li>
          Você é responsável pelas informações que lança e pelo acesso ao seu e-mail, que é como você entra no app.
        </li>
        <li>Não use o serviço para atividades ilegais ou para tentar acessar dados de outras pessoas.</li>
        <li>Você pode excluir sua conta quando quiser, escrevendo para {SITE.contactEmail}.</li>
      </ul>

      <h2>Planos pagos</h2>
      <p>
        Quando houver planos pagos, preço, forma de pagamento e regras de cancelamento serão informados antes da
        contratação.
      </p>

      <h2>Contato</h2>
      <p>Dúvidas sobre estes termos: {SITE.contactEmail}.</p>
    </LegalPage>
  );
}
