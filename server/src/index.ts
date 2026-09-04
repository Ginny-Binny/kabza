import { PORT } from "./config";
import { createGrid } from "./game/grid";
import { createBroadcast } from "./broadcast";
import { createHttp } from "./http";
import { attachWs } from "./ws";

const grid = createGrid();
const bcast = createBroadcast(grid);
const server = createHttp(grid);
attachWs(server, grid, bcast);

server.listen(PORT, () => console.log(`kabza server on :${PORT}`));
