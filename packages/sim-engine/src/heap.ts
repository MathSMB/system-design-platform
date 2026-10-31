/** Fila de prioridade (min-heap) por tempo; empate resolvido pela ordem de inserção. */
export interface SimEvent {
  t: number;
  seq: number;
  run: () => void;
}

export class EventQueue {
  private items: SimEvent[] = [];
  private seq = 0;

  get size(): number {
    return this.items.length;
  }

  push(t: number, run: () => void): void {
    const ev = { t, seq: this.seq++, run };
    const a = this.items;
    a.push(ev);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (less(a[p]!, a[i]!)) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }

  pop(): SimEvent | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && less(a[l]!, a[m]!)) m = l;
        if (r < a.length && less(a[r]!, a[m]!)) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

function less(x: SimEvent, y: SimEvent): boolean {
  return x.t < y.t || (x.t === y.t && x.seq < y.seq);
}
