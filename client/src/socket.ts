import type { C2S } from "@kabza/shared";
import { getState, handle, setStatus } from "./store";

const userId = localStorage.getItem("kabza:userId") ?? crypto.randomUUID();
localStorage.setItem("kabza:userId", userId);

let ws: WebSocket | null = null;
let seq = 1;

export function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => send({ type: "hello", userId });
  ws.onmessage = (e) => handle(JSON.parse(e.data));
  ws.onclose = () => {
    setStatus("reconnecting");
    setTimeout(connect, 1000); // TODO: real backoff
  };
}

function send(msg: C2S) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function claim(cellId: number) {
  const { cells, status } = getState();
  if (status !== "online" || cells[cellId]?.owner) return;
  send({ type: "claim", cellId, clientSeq: seq++ });
}
