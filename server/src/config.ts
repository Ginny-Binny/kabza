export const PORT = Number(process.env.PORT) || 8090;
export const DB_PATH = process.env.DB_PATH ?? "./data/kabza.db";
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-token";

if (ADMIN_TOKEN === "dev-token") {
  console.warn("ADMIN_TOKEN not set, using the dev default — set it in prod");
}
