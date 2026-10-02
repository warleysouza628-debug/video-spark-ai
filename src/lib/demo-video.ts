import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export type VideoStyle = "Realista" | "Cinematográfico" | "Gamer" | "Anime" | "ASMR" | "Comercial";
export type Aspect = "9:16" | "16:9" | "1:1";

export const STYLES: { id: VideoStyle; desc: string; colors: [string, string, string] }[] = [
  { id: "Realista", desc: "Tons naturais, luz suave", colors: ["#1f2a24", "#6b8f71", "#e8e2d0"] },
  { id: "Cinematográfico", desc: "Letterbox, teal & orange", colors: ["#0b1a24", "#1d5c6b", "#f29a4a"] },
  { id: "Gamer", desc: "Alto contraste, glitch", colors: ["#07080c", "#19e68c", "#ff3d5a"] },
  { id: "Anime", desc: "Céu pastel, brilhos", colors: ["#ffb3c7", "#7ec8ff", "#fff6d6"] },
  { id: "ASMR", desc: "Lento, orgânico, calmo", colors: ["#2b2420", "#a8857a", "#f3e6dc"] },
  { id: "Comercial", desc: "Limpo, tipografia forte", colors: ["#111111", "#f5c518", "#ffffff"] },
];

const SIZES: Record<Aspect, [number, number]> = {
  "9:16": [720, 1280],
  "16:9": [1280, 720],
  "1:1": [720, 720],
};

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function wrap(ctx: OffscreenCanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export function isSupported() {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoFrame" in window;
}

export async function generateDemoVideo(opts: {
  prompt: string;
  style: VideoStyle;
  aspect: Aspect;
  seconds: number;
  onProgress: (p: number) => void;
}): Promise<Blob> {
  const [W, H] = SIZES[opts.aspect];
  const fps = 30;
  const total = opts.seconds * fps;
  const style = STYLES.find((s) => s.id === opts.style)!;
  const [c0, c1, c2] = style.colors;

  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  let codec = "avc1.42001f";
  const base = { width: W, height: H, bitrate: 4_000_000, framerate: fps };
  if (!(await VideoEncoder.isConfigSupported({ ...base, codec })).supported) codec = "avc1.4d0028";

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width: W, height: H }, fastStart: "in-memory" });
  let error: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (error = e),
  });
  encoder.configure({ ...base, codec });

  const r = rng(opts.prompt.length * 97 + opts.style.length * 13 + 7);
  const parts = Array.from({ length: 60 }, () => ({
    x: r() * W, y: r() * H, s: 2 + r() * 8, v: 0.3 + r() * 1.5, p: r() * Math.PI * 2,
  }));
  const slow = opts.style === "ASMR" ? 0.35 : opts.style === "Gamer" ? 1.8 : 1;
  const minSide = Math.min(W, H);

  for (let f = 0; f < total; f++) {
    if (error) throw error;
    const t = f / fps;
    const k = f / total;
    // background
    const g = ctx.createLinearGradient(0, 0, W * Math.cos(t * 0.2 * slow) + W, H);
    g.addColorStop(0, c0);
    g.addColorStop(0.6 + 0.2 * Math.sin(t * slow), c1);
    g.addColorStop(1, c0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // orb
    const ox = W / 2 + Math.sin(t * 0.7 * slow) * W * 0.2;
    const oy = H * 0.42 + Math.cos(t * 0.5 * slow) * H * 0.08;
    const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, minSide * 0.45);
    rg.addColorStop(0, c2 + "cc");
    rg.addColorStop(1, c2 + "00");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // particles
    ctx.fillStyle = c2;
    for (const p of parts) {
      const y = (p.y - t * 40 * p.v * slow + H * 10) % H;
      const x = p.x + Math.sin(t * slow + p.p) * 20;
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * slow + p.p));
      if (opts.style === "Gamer") ctx.fillRect(x, y, p.s * 2, p.s / 2);
      else { ctx.beginPath(); ctx.arc(x, y, p.s / 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    if (opts.style === "Gamer" && f % 23 < 2) {
      ctx.fillStyle = "#ff3d5a55";
      ctx.fillRect(0, r() * H, W, 10 + r() * 40);
    }

    // text
    const appear = Math.min(1, t / 0.8);
    ctx.globalAlpha = appear;
    ctx.fillStyle = opts.style === "Anime" ? "#2b2140" : "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(minSide * 0.028)}px sans-serif`;
    ctx.fillText(opts.style.toUpperCase(), W / 2, H * 0.68 - 20 * (1 - appear));
    ctx.font = `600 ${Math.round(minSide * 0.055)}px sans-serif`;
    const lines = wrap(ctx, opts.prompt, W * 0.82);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.68 + (i + 1) * minSide * 0.07 + 20 * (1 - appear)));
    ctx.globalAlpha = 1;

    if (opts.style === "Cinematográfico") {
      ctx.fillStyle = "#000";
      const bar = H * 0.1;
      ctx.fillRect(0, 0, W, bar);
      ctx.fillRect(0, H - bar, W, bar);
    }

    // watermark + progress line
    ctx.font = `600 ${Math.round(minSide * 0.022)}px monospace`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffffaa";
    ctx.fillText("VIDEO SPARK AI · DEMO", 24, 40);
    ctx.fillStyle = c2;
    ctx.fillRect(0, H - 6, W * k, 6);

    const frame = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
    encoder.encode(frame, { keyFrame: f % 60 === 0 });
    frame.close();
    if (encoder.encodeQueueSize > 8) await new Promise((res) => setTimeout(res, 0));
    if (f % 5 === 0) {
      opts.onProgress(f / total);
      await new Promise((res) => setTimeout(res, 0));
    }
  }
  await encoder.flush();
  encoder.close();
  muxer.finalize();
  opts.onProgress(1);
  return new Blob([target.buffer], { type: "video/mp4" });
}
