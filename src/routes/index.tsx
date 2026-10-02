import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { STYLES, generateDemoVideo, isSupported, type Aspect, type VideoStyle } from "@/lib/demo-video";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Video Spark AI — Gerador de vídeo" },
      { name: "description", content: "Crie vídeos a partir de um prompt com estilos, proporções e duração. Modo demo com MP4 real." },
      { property: "og:title", content: "Video Spark AI — Gerador de vídeo" },
      { property: "og:description", content: "Crie vídeos a partir de um prompt. Modo demo gera MP4 real no navegador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

const ASPECTS: Aspect[] = ["9:16", "16:9", "1:1"];
const DURATIONS = [4, 6, 8, 10];
type Item = { id: number; url: string; prompt: string; style: VideoStyle; aspect: Aspect; seconds: number; size: number };

function Studio() {
  const [prompt, setPrompt] = useState("Uma cidade futurista ao entardecer com carros voadores");
  const [style, setStyle] = useState<VideoStyle>("Cinematográfico");
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [seconds, setSeconds] = useState(6);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [current, setCurrent] = useState<Item | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => setSupported(isSupported()), []);

  async function generate() {
    if (!prompt.trim() || progress !== null) return;
    setError(null);
    setProgress(0);
    try {
      const blob = await generateDemoVideo({ prompt: prompt.trim(), style, aspect, seconds, onProgress: setProgress });
      const it: Item = { id: Date.now(), url: URL.createObjectURL(blob), prompt: prompt.trim(), style, aspect, seconds, size: blob.size };
      setItems((p) => [it, ...p]);
      setCurrent(it);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o vídeo.");
    } finally {
      setProgress(null);
    }
  }

  const ratio = (a: Aspect) => (a === "9:16" ? "aspect-[9/16] max-h-[520px]" : a === "1:1" ? "aspect-square max-h-[520px]" : "aspect-video");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">✦</span>
            Video Spark AI
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">MODO DEMO</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[420px_1fr]">
        <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Novo vídeo</h1>
            <p className="mt-1 text-sm text-muted-foreground">Descreva a cena e ajuste o formato.</p>
          </div>

          <label className="block">
            <span className="label">Prompt</span>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={200}
              className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary" />
            <span className="text-xs text-muted-foreground">{prompt.length}/200</span>
          </label>

          <div>
            <span className="label">Estilo</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button key={s.id} onClick={() => setStyle(s.id)} data-active={style === s.id} className="chip text-left">
                  <span className="mb-1 flex gap-1">{s.colors.map((c) => <i key={c} className="h-2 w-4 rounded-sm" style={{ background: c }} />)}</span>
                  <span className="block text-sm font-semibold">{s.id}</span>
                  <span className="block text-xs text-muted-foreground">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="label">Proporção</span>
              <div className="mt-2 flex gap-2">
                {ASPECTS.map((a) => <button key={a} onClick={() => setAspect(a)} data-active={aspect === a} className="chip flex-1 text-center text-sm">{a}</button>)}
              </div>
            </div>
            <div>
              <span className="label">Duração</span>
              <div className="mt-2 flex gap-1">
                {DURATIONS.map((d) => <button key={d} onClick={() => setSeconds(d)} data-active={seconds === d} className="chip flex-1 px-1 text-center text-sm">{d}s</button>)}
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={progress !== null || !prompt.trim() || !supported}
            className="w-full rounded-xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-50">
            {progress !== null ? `Gerando… ${Math.round(progress * 100)}%` : "Gerar Vídeo"}
          </button>
          {!supported && <p className="text-sm text-destructive">Seu navegador não suporta codificação de vídeo. Use Chrome ou Edge atualizado.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Demo: nenhuma IA de vídeo está conectada ainda. O app cria um MP4 real no seu navegador com animações baseadas no prompt e estilo — não é uma geração por IA.
          </p>
        </section>

        <section className="space-y-6">
          <div className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-card p-6">
            {progress !== null ? (
              <div className="w-full max-w-sm text-center">
                <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="font-display font-semibold">Renderizando quadros…</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{Math.round(progress * seconds * 30)} / {seconds * 30} quadros</p>
              </div>
            ) : current ? (
              <div className="w-full space-y-4">
                <video key={current.url} src={current.url} controls autoPlay loop muted playsInline className={`mx-auto rounded-xl bg-background ${ratio(current.aspect)}`} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-semibold">{current.prompt}</p>
                    <p className="font-mono text-xs text-muted-foreground">{current.style} · {current.aspect} · {current.seconds}s · {(current.size / 1024 / 1024).toFixed(2)} MB · MP4</p>
                  </div>
                  <a href={current.url} download={`video-spark-${current.id}.mp4`} className="rounded-xl bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground">
                    Baixar MP4
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="font-display text-xl text-foreground">Seu vídeo aparece aqui</p>
                <p className="mt-1 text-sm">Escreva um prompt e clique em Gerar Vídeo.</p>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div>
              <h2 className="label mb-3">Histórico desta sessão</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {items.map((it) => (
                  <button key={it.id} onClick={() => setCurrent(it)} data-active={current?.id === it.id} className="chip p-2 text-left">
                    <video src={it.url} muted className="aspect-video w-full rounded-lg object-cover" />
                    <p className="mt-2 truncate text-xs font-semibold">{it.prompt}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{it.style} · {it.aspect}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
