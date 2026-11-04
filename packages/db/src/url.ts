/** O Postgres do docker-compose da raiz. Troque com DATABASE_URL no .env da raiz. */
export const DEFAULT_DATABASE_URL = "postgres://sdp:sdp@localhost:5432/sdp";

export const databaseUrl = () => process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
