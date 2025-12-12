import { Database } from "duckdb-async";
import { getMotherDuckToken } from "@/lib/email/vault";

let dbInstance: Database | null = null;

export class MotherDuckService {
  private static async matchToken(token: string): Promise<string> {
    return `md:?motherduck_token=${token}`;
  }

  static async getConnection(): Promise<Database> {
    if (dbInstance) return dbInstance;

    const token = await getMotherDuckToken();

    if (!token) {
      throw new Error("MotherDuck token not found in Vault. Please configure MOTHERDUCK_TOKEN.");
    }

    // "md:" connects to MotherDuck. If no token is provided in the connection string,
    // it looks for the environment variable MOTHERDUCK_TOKEN, but since we are handling
    // it explicitly from the vault, we pass it in.
    const connectionString = `md:?motherduck_token=${token}`;

    // Create simple connection
    // Note: In serverless environments, we might need to be careful about connection
    // pooling or reuse, but for now a singleton is a good starting point for
    // persistent containers or long-running processes.
    try {
      dbInstance = await Database.create(connectionString);
      return dbInstance;
    } catch (error) {
      console.error("Failed to connect to MotherDuck:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async runQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    const db = await this.getConnection();
    // duckdb-async 'all' returns a promise
    return (await db.all(query, ...params)) as T[];
  }
}
