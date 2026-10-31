/// <reference lib="webworker" />
import { simulate, type Graph, type SimConfig } from "@sdp/sim-engine";

// A simulação roda fora da thread principal para não travar o canvas.
self.onmessage = (ev: MessageEvent<{ graph: Graph; config: SimConfig }>) => {
  try {
    self.postMessage({ ok: true, result: simulate(ev.data.graph, ev.data.config) });
  } catch (e) {
    self.postMessage({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
