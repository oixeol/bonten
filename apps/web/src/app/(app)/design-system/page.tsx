import { BontenLogo, BontenMark } from '@/components/brand/bonten-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge, StatusDot } from '@/components/ui/badge';

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Cabeçalho / marca */}
      <header className="flex items-center justify-between border-b border-border pb-6">
        <BontenLogo size={30} />
        <span className="text-sm text-fg-muted">Design System — v0.1</span>
      </header>

      <section className="mt-10 space-y-4">
        <h1 className="text-2xl font-semibold">Identidade</h1>
        <p className="max-w-2xl text-fg-muted">
          Visual sutil e profissional. Preto e grafite como base, laranja para
          ações e destaques. Sem neon, sem roxo/azul.
        </p>

        {/* Símbolo em variações */}
        <div className="flex items-center gap-8 pt-4">
          <div className="flex flex-col items-center gap-2">
            <BontenMark size={56} className="text-brand" />
            <span className="text-xs text-fg-subtle">Símbolo</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-fg">
              <BontenMark size={40} className="text-base" />
            </div>
            <span className="text-xs text-fg-subtle">Sobre fundo claro</span>
          </div>
        </div>
      </section>

      {/* Paleta */}
      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Paleta</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="base" hex="#090909" className="bg-base" />
          <Swatch name="surface" hex="#171717" className="bg-surface" />
          <Swatch name="raised" hex="#242424" className="bg-raised" />
          <Swatch name="brand" hex="#FF7900" className="bg-brand" />
          <Swatch name="brand-hover" hex="#FF9D42" className="bg-brand-hover" />
          <Swatch name="fg" hex="#F5F5F5" className="bg-fg" />
          <Swatch name="fg-muted" hex="#A3A3A3" className="bg-fg-muted" />
        </div>
      </section>

      {/* Tipografia */}
      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Tipografia — Inter</h2>
        <div className="space-y-1">
          <p className="text-3xl font-semibold">Título 3xl semibold</p>
          <p className="text-2xl font-semibold">Título 2xl semibold</p>
          <p className="text-xl font-semibold">Título xl semibold</p>
          <p className="text-base">Corpo base regular</p>
          <p className="text-sm text-fg-muted">Corpo sm muted</p>
          <p className="text-xs text-fg-subtle">Legenda xs subtle</p>
        </div>
      </section>

      {/* Componentes */}
      <section className="mt-12 space-y-6">
        <h2 className="text-xl font-semibold">Componentes</h2>

        <Row label="Botões">
          <Button variant="primary">Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Perigo</Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
        </Row>

        <Row label="Tamanhos">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>

        <Row label="Inputs">
          <div className="w-64">
            <Input placeholder="Digite algo..." />
          </div>
          <div className="w-64">
            <Input invalid defaultValue="inválido" />
          </div>
        </Row>

        <Row label="Badges">
          <Badge tone="neutral">Neutro</Badge>
          <Badge tone="brand">Marca</Badge>
          <Badge tone="success">Sucesso</Badge>
          <Badge tone="warning">Aviso</Badge>
          <Badge tone="danger">Erro</Badge>
        </Row>

        <Row label="Status">
          <StatusDot status="online" />
          <StatusDot status="idle" />
          <StatusDot status="dnd" />
          <StatusDot status="offline" />
        </Row>

        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card padrão</CardTitle>
                <CardDescription>
                  Superfície discreta, borda sutil, raio 12px.
                </CardDescription>
              </CardHeader>
              <CardBody>
                <Button variant="secondary" size="sm">
                  Ação
                </Button>
              </CardBody>
            </Card>
            <Card className="bg-brand-dim">
              <CardHeader>
                <CardTitle>Card destacado</CardTitle>
                <CardDescription>
                  Fundo de destaque sutil em laranja.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-sm text-fg-subtle">
        CONNECT. PLAY. EVOLVE.
      </footer>
    </main>
  );
}

function Swatch({
  name,
  hex,
  className,
}: {
  name: string;
  hex: string;
  className: string;
}) {
  return (
    <div>
      <div
        className={`h-16 rounded-md border border-border ${className}`}
        style={{ backgroundColor: hex }}
      />
      <p className="mt-2 text-sm text-fg">{name}</p>
      <p className="text-xs text-fg-subtle">{hex}</p>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-fg-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}