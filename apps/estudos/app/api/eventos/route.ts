// API de eventos: POST grava um evento na outbox em nome de quem está usando; GET lista os últimos do perfil.
import { eventosHandlers } from "@sdp/auth/routes/eventos";

const h = eventosHandlers("estudos");
export const GET = h.GET;
export const POST = h.POST;
