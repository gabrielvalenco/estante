"use client";

import { Camera, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { toast } from "sonner";

import { removeAvatarAction, uploadAvatarAction } from "@/app/account-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { updateProfile, useAuthFlags, type Profile } from "@/lib/auth";

/** Lado do recorte na tela e da imagem enviada. O servidor refaz em 256px WebP de qualquer jeito. */
const VIEW = 256;
const OUT = 256;
const MAX_ZOOM = 4;
/** Fotos de celular passam fácil de 10 MB; o arquivo original nunca sai do navegador. */
const MAX_FILE = 25 * 1024 * 1024;

type Crop = { x: number; y: number; zoom: number };

/**
 * Foto do perfil nas configurações: avatar grande com "Trocar foto" e "Remover".
 * O recorte e a redução acontecem no navegador (canvas), então só uns 20 KB sobem para o servidor,
 * mesmo quando a foto original tem 12 MB.
 */
export function AvatarEditor({ profile, preview }: { profile: Profile; preview: Pick<Profile, "name" | "tone"> }) {
  const { avatars } = useAuthFlags();
  const input = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem");
    if (file.size > MAX_FILE) return toast.error("Imagem grande demais", { description: "Escolha uma com até 25 MB." });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Não deu para abrir essa imagem", { description: "Tente uma foto em JPG, PNG ou WebP." });
    };
    img.src = url;
  }

  function close() {
    if (image) URL.revokeObjectURL(image.src);
    setImage(null);
  }

  async function save(blob: Blob) {
    setBusy(true);
    const form = new FormData();
    form.append("file", blob, "avatar.webp");
    const result = await uploadAvatarAction(form).catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setBusy(false);
    if (!result.ok) {
      toast.error("Não foi possível trocar a foto", {
        description: result.error === "invalid" ? "O arquivo não parece uma imagem válida." : "Tente de novo em instantes.",
      });
      return;
    }
    updateProfile(result.profile);
    close();
    toast("Foto atualizada");
  }

  async function remove() {
    setBusy(true);
    const result = await removeAvatarAction().catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!result.ok) return toast.error("Não foi possível remover a foto");
    updateProfile(result.profile);
    toast("Foto removida", { description: "Seu avatar voltou a mostrar as iniciais." });
  }

  const avatar = <UserAvatar user={{ ...preview, handle: profile.handle, avatarUrl: profile.avatarUrl }} size={64} href={false} />;
  if (!avatars) return avatar;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={profile.avatarUrl ? "Trocar foto do perfil" : "Adicionar foto ao perfil"}
        className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-anil focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {avatar}
        <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-ink text-canvas ring-2 ring-canvas transition-transform group-hover:scale-110">
          <Camera className="size-3.5" aria-hidden />
        </span>
      </button>
      {profile.avatarUrl && (
        <button type="button" onClick={remove} disabled={busy} className="text-xs text-ink-4 transition-colors hover:text-ink disabled:opacity-50">
          Remover
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = ""; // permite escolher o mesmo arquivo de novo
        }}
      />
      <Dialog open={Boolean(image)} onOpenChange={(open) => !open && !busy && close()}>
        <DialogContent className="gap-0 rounded-3xl p-5 sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold tracking-tight">Ajustar foto</DialogTitle>
          <DialogDescription className="mt-0.5 text-ink-3">Arraste para posicionar e use o zoom para enquadrar.</DialogDescription>
          {image && <Cropper image={image} busy={busy} onCancel={close} onSave={save} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Cropper({ image, busy, onCancel, onSave }: { image: HTMLImageElement; busy: boolean; onCancel: () => void; onSave: (blob: Blob) => void }) {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const base = VIEW / Math.min(w, h); // escala em que a imagem cobre o quadrado inteiro

  const clamp = (c: Crop): Crop => {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom));
    const s = base * zoom;
    return { zoom, x: Math.min(0, Math.max(VIEW - w * s, c.x)), y: Math.min(0, Math.max(VIEW - h * s, c.y)) };
  };
  const [crop, setCrop] = useState<Crop>(() => clamp({ zoom: 1, x: (VIEW - w * base) / 2, y: (VIEW - h * base) / 2 }));
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const area = useRef<HTMLDivElement>(null);

  /** Zoom mantendo fixo o centro do recorte. */
  function zoomTo(zoom: number) {
    setCrop((c) => {
      const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
      const k = next / c.zoom;
      return clamp({ zoom: next, x: VIEW / 2 - (VIEW / 2 - c.x) * k, y: VIEW / 2 - (VIEW / 2 - c.y) * k });
    });
  }

  // Roda do mouse / pinça do trackpad: precisa de listener não passivo para evitar rolar a página.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCrop((c) => {
        const next = Math.min(MAX_ZOOM, Math.max(1, c.zoom * Math.exp(-e.deltaY / 400)));
        const k = next / c.zoom;
        return clamp({ zoom: next, x: VIEW / 2 - (VIEW / 2 - c.x) * k, y: VIEW / 2 - (VIEW / 2 - c.y) * k });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // clamp só depende do tamanho da imagem, que não muda enquanto o recorte está aberto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    setCrop((c) => clamp({ ...c, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }));
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      setCrop((c) => clamp({ ...c, x: c.x + m[0], y: c.y + m[1] }));
    } else if (e.key === "+" || e.key === "=") zoomTo(crop.zoom * 1.15);
    else if (e.key === "-") zoomTo(crop.zoom / 1.15);
  }

  async function confirm() {
    const s = base * crop.zoom;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, -crop.x / s, -crop.y / s, VIEW / s, VIEW / s, 0, 0, OUT, OUT);
    const encode = (type: string, quality: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
    // Safari antigo não gera WebP e devolve PNG: nesse caso, JPEG (bem menor).
    let blob = await encode("image/webp", 0.9);
    if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.92);
    if (blob) onSave(blob);
  }

  const s = base * crop.zoom;
  return (
    <>
      <div className="mt-4 flex justify-center">
        <div
          ref={area}
          role="img"
          aria-label="Recorte da foto. Use as setas para mover e + ou - para o zoom."
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          className="relative cursor-grab touch-none overflow-hidden rounded-2xl bg-sunken outline-none select-none focus-visible:ring-2 focus-visible:ring-anil active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- arquivo local, ainda não enviado */}
          <img
            src={image.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
            style={{ width: w, height: h, transform: `translate(${crop.x}px, ${crop.y}px) scale(${s})` }}
          />
          {/* Máscara: escurece fora do círculo, que é como a foto aparece no site */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0/0.5)] ring-2 ring-white/80" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => zoomTo(crop.zoom / 1.25)} aria-label="Diminuir zoom" className="rounded-full p-1 text-ink-3 hover:text-ink">
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(e) => zoomTo(Number(e.target.value))}
          aria-label="Zoom"
          className="h-1 flex-1 cursor-pointer accent-anil"
        />
        <button type="button" onClick={() => zoomTo(crop.zoom * 1.25)} aria-label="Aumentar zoom" className="rounded-full p-1 text-ink-3 hover:text-ink">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={confirm} disabled={busy}>
          {busy ? "Enviando..." : "Salvar foto"}
        </Button>
      </div>
    </>
  );
}
