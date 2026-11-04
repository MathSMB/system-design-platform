"use client";

import { PARTS, type Board as BoardState } from "@sdp/habit";
import { useEffect, useMemo, useRef } from "react";
import { boardSvg } from "./board";
import { BoardFx, PART_AT, WEAR_AT, WEAR_HIT } from "./boardFx";

const KEY = (profileId: string) => `sdp-placa-${profileId}`;
function loadSeen(profileId: string): BoardState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(profileId)) ?? "null");
    return v && typeof v.parts === "number" ? v : null;
  } catch {
    return null;
  }
}
function saveSeen(profileId: string, b: BoardState) {
  try {
    localStorage.setItem(KEY(profileId), JSON.stringify(b));
  } catch {}
}

/**
 * A placa-mãe do perfil. Guarda no navegador o último estado que você viu e,
 * ao abrir (ou ao cumprir a meta), anima o que mudou desde então:
 * peças novas caindo, consertos com as ventoinhas voltando, desgaste novo ou o recomeço.
 */
export function Board({ board, profileId }: { board: BoardState; profileId: string }) {
  const html = useMemo(() => boardSvg(), []);
  const box = useRef<HTMLDivElement>(null);
  const fx = useRef<BoardFx | null>(null);
  // último estado mostrado (vem do navegador na primeira vez); a limpeza devolve o anterior, para o StrictMode não pular a animação
  const shown = useRef<{ pid: string; v: BoardState | null } | null>(null);

  useEffect(() => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    fx.current = new BoardFx(svg);
    return () => fx.current?.dispose();
  }, []);

  useEffect(() => {
    const f = fx.current;
    if (!f) return;
    if (shown.current?.pid !== profileId) shown.current = { pid: profileId, v: loadSeen(profileId) };
    const from = shown.current.v;
    shown.current = { pid: profileId, v: board };
    saveSeen(profileId, board);
    const still = (b: BoardState) => {
      f.setParts(b.parts);
      f.setWear(b.wear, b.parts);
      f.setOverclock(b.overclock);
      f.scorches(b.reboots);
    };
    if (!from || from.reboots > board.reboots) {
      still(board);
      return () => {
        shown.current = { pid: profileId, v: from };
      };
    }
    still(from);

    const steps: (() => void)[] = [];
    let cur = { ...from };
    const toward = (to: BoardState) => {
      for (let L = cur.wear + 1; L <= to.wear; L++)
        steps.push(() => {
          f.setWear(L, cur.parts);
          const [x, y] = WEAR_AT[L - 1]!;
          f.sparks(x, y, "#ff7a1f", 10, 26);
          f.label(x, y - 20, WEAR_HIT[L - 1]!, "#ff4d6d");
        });
      for (let L = cur.wear; L > to.wear; L--)
        steps.push(() => {
          f.setWear(L - 1, cur.parts);
          const [x, y] = WEAR_AT[L - 1]!;
          f.repair(x, y);
          f.label(x, y - 26, "consertado", "#39ff8f");
          f.spinUp(L, cur.parts);
        });
      // muitas peças de uma vez: as mais antigas entram direto, as últimas 5 com animação
      const first = Math.max(cur.parts, to.parts - 5);
      if (first > cur.parts) steps.push(() => f.setParts(first));
      for (let i = first; i < to.parts; i++) steps.push(() => f.install(i));
      if (to.overclock > cur.overclock)
        steps.push(() => {
          f.setOverclock(to.overclock);
          f.label(310, 170, `overclock +${to.overclock}`, "#39ff8f");
        });
      steps.push(() => f.setWear(to.wear, to.parts));
      cur = { ...to };
    };

    const timers: number[] = [];
    const play = () => steps.forEach((s, i) => timers.push(window.setTimeout(s, 400 + i * 1000)));
    if (board.reboots > from.reboots) {
      // queimou desde a última visita: fogo, peças saindo e a montagem recomeçando
      f.label(PART_AT.vrm[0], PART_AT.vrm[1] - 30, "a máquina queimou", "#ff4d6d");
      f.burn(from.parts, () => {
        f.scorches(board.reboots);
        cur = { parts: 0, wear: 0, overclock: 0, reboots: board.reboots };
        f.setParts(0);
        f.setOverclock(0);
        f.setWear(0, 0);
        toward(board);
        play();
      });
    } else {
      toward(board);
      play();
    }
    return () => {
      timers.forEach(clearTimeout);
      shown.current = { pid: profileId, v: from };
    };
  }, [board, profileId]);

  const total = PARTS.length;
  return (
    <div className="mobo panel overflow-hidden p-2">
      <div ref={box} dangerouslySetInnerHTML={{ __html: html }} className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full" aria-label={`Placa-mãe com ${Math.min(board.parts, total)} de ${total} peças`} />
    </div>
  );
}
