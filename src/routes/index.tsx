import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Database, Download, LogOut, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { buildReportScript, type DbCredentials, type ReportFilters } from "@/lib/report-script";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gerador de Relatório — Mais de 4 Marcações no Dia" },
      {
        name: "description",
        content:
          "Informe suas credenciais do banco e os filtros de período e cliente para gerar o script do relatório de mais de 4 marcações no dia.",
      },
      { property: "og:title", content: "Gerador de Relatório — Mais de 4 Marcações no Dia" },
      {
        property: "og:description",
        content:
          "Tela de filtros e credenciais para emitir o relatório de mais de 4 marcações no dia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EMPTY_CREDS: DbCredentials = {
  user: "",
  password: "",
  host: "db-read-analytics.prod.nexti.com",
  port: "3306",
  database: "nexti",
};

function Index() {
  const [creds, setCreds] = useState<DbCredentials>(EMPTY_CREDS);
  const [connected, setConnected] = useState(false);

  return (
    <main className="min-h-screen">
      <header className="hero-gradient border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-12">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <FileSpreadsheet className="size-3.5" /> Relatório operacional
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">Mais de 4 marcações no dia</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Informe suas credenciais do banco e ajuste os filtros. O script Python é gerado
            pronto para execução, sem precisar editar código.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {connected ? (
          <FiltersPanel
            creds={creds}
            onLogout={() => {
              setCreds(EMPTY_CREDS);
              setConnected(false);
            }}
          />
        ) : (
          <LoginPanel creds={creds} setCreds={setCreds} onDone={() => setConnected(true)} />
        )}
      </div>
    </main>
  );
}

function LoginPanel({
  creds,
  setCreds,
  onDone,
}: {
  creds: DbCredentials;
  setCreds: (c: DbCredentials) => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const set = (k: keyof DbCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setCreds({ ...creds, [k]: e.target.value });
  };

  return (
    <form
      className="panel mx-auto max-w-xl p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const missing = [
          !creds.user.trim() && "usuário",
          !creds.password && "senha",
          !creds.host.trim() && "host",
          !creds.database.trim() && "banco",
        ].filter(Boolean);
        if (missing.length) {
          const msg = `Preencha: ${missing.join(", ")}.`;
          setError(msg);
          toast.error(msg);
          return;
        }
        setError("");
        onDone();
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Database className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Credenciais do banco</h2>
          <p className="text-xs text-muted-foreground">Use seu próprio usuário de leitura.</p>
        </div>
      </div>

      <div className="grid gap-4">
        <Field label="Usuário">
          <Input value={creds.user} onChange={set("user")} autoComplete="username" placeholder="nome.sobrenome" />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            value={creds.password}
            onChange={set("password")}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>
        <Field label="Host">
          <Input value={creds.host} onChange={set("host")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Porta">
            <Input value={creds.port} onChange={set("port")} inputMode="numeric" />
          </Field>
          <Field label="Banco">
            <Input value={creds.database} onChange={set("database")} />
          </Field>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Nada é enviado para servidores: as credenciais ficam apenas nesta aba do navegador e são
        usadas só para montar o script que você baixa.
      </p>

      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}

      <Button type="submit" className="mt-6 w-full" size="lg">
        Entrar
      </Button>
    </form>
  );
}

function FiltersPanel({ creds, onLogout }: { creds: DbCredentials; onLogout: () => void }) {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: "2026-07-28",
    endDate: "2026-08-03",
    customerId: "103",
    outputFile: "4_marcacoes_no_dia.xls",
  });

  const set = (k: keyof ReportFilters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters({ ...filters, [k]: e.target.value });

  const invalid =
    !filters.startDate ||
    !filters.endDate ||
    filters.endDate < filters.startDate ||
    !filters.customerId ||
    !filters.outputFile.trim();

  const script = useMemo(
    () => (invalid ? "" : buildReportScript(creds, filters)),
    [creds, filters, invalid],
  );

  const days = useMemo(() => {
    if (invalid) return 0;
    const a = new Date(filters.startDate).getTime();
    const b = new Date(filters.endDate).getTime();
    return Math.round((b - a) / 86400000) + 1;
  }, [filters, invalid]);

  return (
    <div className="mx-auto max-w-xl">
      <section className="panel h-fit p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Filtros</h2>
            <p className="font-mono text-xs text-muted-foreground">
              {creds.user}@{creds.host}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4">
          <Field label="Data inicial">
            <Input type="date" value={filters.startDate} onChange={set("startDate")} />
          </Field>
          <Field label="Data final">
            <Input type="date" value={filters.endDate} onChange={set("endDate")} />
          </Field>
          <Field label="Customer ID">
            <Input value={filters.customerId} onChange={set("customerId")} inputMode="numeric" />
          </Field>
          <Field label="Arquivo de saída">
            <Input value={filters.outputFile} onChange={set("outputFile")} />
          </Field>
        </div>

        {filters.endDate < filters.startDate && (
          <p className="mt-4 text-xs text-destructive">A data final deve ser após a inicial.</p>
        )}

        <Separator className="my-5" />

        <p className="text-xs text-muted-foreground">
          Período de <span className="text-foreground">{days || 0}</span> dia(s) — uma consulta por
          dia.
        </p>

        <div className="mt-5 grid gap-2">
          <Button
            size="lg"
            disabled={invalid}
            onClick={() => {
              const blob = new Blob([script], { type: "text/x-python;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "relatorio_4_marcacoes.py";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Relatório emitido. Rode com: python relatorio_4_marcacoes.py");
            }}
          >
            <Download className="size-4" /> Emitir relatório
          </Button>
        </div>
      </section>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
