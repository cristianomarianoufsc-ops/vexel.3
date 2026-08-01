import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Scale } from "lucide-react";

type LegalDocument = "terms" | "privacy";

const documents = {
  terms: {
    title: "Termos de Serviço",
    eyebrow: "VexelHub · Termos de Serviço",
    description:
      "Regras para uso do VexelHub e conexão com plataformas de publicação.",
    icon: Scale,
  },
  privacy: {
    title: "Política de Privacidade",
    eyebrow: "VexelHub · Privacidade",
    description:
      "Como o VexelHub coleta, usa, armazena e protege dados da sua conta.",
    icon: ShieldCheck,
  },
} satisfies Record<
  LegalDocument,
  {
    title: string;
    eyebrow: string;
    description: string;
    icon: typeof Scale;
  }
>;

function DocumentHeader({ type }: { type: LegalDocument }) {
  const document = documents[type];
  const Icon = document.icon;

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold text-white">
          <ArrowLeft size={16} className="text-primary" />
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="VexelHub" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Icon size={14} className="text-primary" />
          VexelHub
        </div>
      </div>
    </header>
  );
}

export default function Legal({ type }: { type: LegalDocument }) {
  const document = documents[type];

  if (typeof window !== "undefined") {
    window.document.title = `${document.title} | VexelHub`;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <DocumentHeader type={type} />
      <main className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
            {document.eyebrow}
          </p>
          <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            {document.title}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{document.description}</p>
          <p className="mt-4 text-sm text-muted-foreground">Última atualização: 1º de agosto de 2026</p>
        </div>

        {type === "terms" ? <TermsContent /> : <PrivacyContent />}

        <div className="mt-14 border-t border-border/50 pt-6 text-sm text-muted-foreground">
          <Link href="/" className="text-primary transition-colors hover:text-primary/80">
            Voltar para o VexelHub
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsContent() {
  return (
    <div className="max-w-3xl text-[15px]">
      <Section title="1. Aceitação dos termos">
        <p>
          Ao acessar ou usar o VexelHub, você concorda com estes Termos de Serviço. Se você não
          concordar com alguma parte destes termos, não deverá utilizar o serviço.
        </p>
      </Section>

      <Section title="2. O serviço">
        <p>
          O VexelHub é uma ferramenta para criadores gerenciarem vídeos curtos, conectarem contas
          de plataformas sociais e enviarem conteúdo para publicação nessas plataformas. A
          disponibilidade de cada integração depende das regras, APIs e aprovações da respectiva
          plataforma.
        </p>
      </Section>

      <Section title="3. Sua conta">
        <p>
          Você é responsável por manter a segurança da sua conta do VexelHub e por fornecer
          informações corretas. Cada usuário deve conectar somente contas sociais que possui ou
          está autorizado a administrar.
        </p>
      </Section>

      <Section title="4. Contas de plataformas sociais">
        <p>
          Ao conectar YouTube, Instagram, TikTok ou outra plataforma, você autoriza o VexelHub a
          executar as ações solicitadas dentro das permissões concedidas. As conexões são
          armazenadas por usuário e podem ser removidas na página de configurações.
        </p>
        <p>
          O VexelHub não controla alterações nas APIs, limites, políticas, disponibilidade ou
          decisões de publicação das plataformas externas.
        </p>
      </Section>

      <Section title="5. Conteúdo do usuário">
        <p>
          Você mantém os direitos sobre os vídeos, textos e demais materiais enviados. Você declara
          que possui os direitos e autorizações necessários para usar e publicar esse conteúdo.
          Você não deve usar o VexelHub para distribuir conteúdo ilegal, enganoso, abusivo ou que
          viole direitos de terceiros.
        </p>
      </Section>

      <Section title="6. Uso proibido">
        <p>
          É proibido tentar acessar contas de terceiros, contornar limites de segurança, interferir
          no funcionamento do serviço, enviar malware ou usar o VexelHub para violar leis, políticas
          das plataformas conectadas ou direitos de outras pessoas.
        </p>
      </Section>

      <Section title="7. Disponibilidade e alterações">
        <p>
          Podemos atualizar, suspender ou encerrar funcionalidades do VexelHub para manutenção,
          segurança, conformidade ou evolução do produto. Também podemos atualizar estes termos;
          a versão publicada nesta página será a versão vigente.
        </p>
      </Section>

      <Section title="8. Encerramento">
        <p>
          Você pode deixar de usar o VexelHub e desconectar suas plataformas a qualquer momento.
          O acesso poderá ser suspenso quando necessário para proteger o serviço, os usuários ou
          cumprir obrigações legais.
        </p>
      </Section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="max-w-3xl text-[15px]">
      <Section title="1. Dados que coletamos">
        <p>
          Podemos tratar dados necessários para criar e autenticar sua conta, como identificador
          fornecido pelo provedor de autenticação, nome, e-mail e imagem de perfil. Também tratamos
          os vídeos, títulos, legendas, agendamentos e resultados de publicação que você cria no
          VexelHub.
        </p>
      </Section>

      <Section title="2. Dados das plataformas conectadas">
        <p>
          Quando você conecta uma plataforma, recebemos os dados necessários para identificar a
          conta conectada e publicar o conteúdo autorizado, como identificador da conta, nome
          público, tokens de acesso e validade do token. Esses dados ficam associados ao seu
          usuário do VexelHub e não são compartilhados com outros usuários.
        </p>
      </Section>

      <Section title="3. Como usamos os dados">
        <p>
          Usamos os dados para autenticar você, manter sua conta, armazenar seus posts e arquivos,
          executar publicações solicitadas, renovar autorizações quando permitido e mostrar os
          resultados de cada plataforma.
        </p>
      </Section>

      <Section title="4. Armazenamento e segurança">
        <p>
          Os dados da aplicação são armazenados em serviços de banco de dados e armazenamento
          configurados para o VexelHub. Tokens de plataformas são tratados como credenciais
          sensíveis e não devem ser expostos em telas públicas, logs ou mensagens.
        </p>
        <p>
          Nenhum método de transmissão ou armazenamento é completamente infalível, mas adotamos
          medidas razoáveis para reduzir acesso não autorizado e proteger os dados tratados pelo
          serviço.
        </p>
      </Section>

      <Section title="5. Compartilhamento">
        <p>
          Compartilhamos dados com uma plataforma social somente quando você conecta essa
          plataforma e solicita uma ação, como publicar um vídeo. Também podemos usar provedores
          técnicos necessários para autenticação, banco de dados, armazenamento e hospedagem.
        </p>
        <p>
          Não vendemos seus dados pessoais. Podemos divulgar informações quando exigido por lei ou
          para proteger o serviço, os usuários e terceiros.
        </p>
      </Section>

      <Section title="6. Retenção e exclusão">
        <p>
          Mantemos os dados enquanto sua conta estiver ativa ou enquanto forem necessários para
          fornecer o serviço e cumprir obrigações legais. Você pode desconectar uma plataforma
          pelas configurações; essa ação remove os dados de autorização armazenados para aquela
          conexão no VexelHub.
        </p>
      </Section>

      <Section title="7. Serviços de terceiros">
        <p>
          YouTube, Instagram, TikTok, Clerk, Vercel, Fly.io, Neon e Supabase possuem termos e
          políticas próprias. O uso desses serviços também está sujeito às regras e políticas de
          privacidade de cada provedor.
        </p>
      </Section>

      <Section title="8. Atualizações e contato">
        <p>
          Podemos atualizar esta política para refletir mudanças no produto, na legislação ou nos
          provedores utilizados. A data no topo indica a versão vigente publicada nesta página.
          Solicitações relacionadas à privacidade podem ser feitas pelo canal de suporte disponível
          no VexelHub.
        </p>
      </Section>
    </div>
  );
}