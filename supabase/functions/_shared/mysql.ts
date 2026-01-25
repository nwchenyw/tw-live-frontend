// Shared MySQL connection utility
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

export interface MySQLConfig {
  hostname: string;
  port: number;
  username: string;
  password: string;
  db: string;
}

export function getMySQLConfig(): MySQLConfig {
  return {
    hostname: Deno.env.get("MYSQL_HOST") || "localhost",
    port: parseInt(Deno.env.get("MYSQL_PORT") || "3306"),
    username: Deno.env.get("MYSQL_USERNAME") || "",
    password: Deno.env.get("MYSQL_PASSWORD") || "",
    db: Deno.env.get("MYSQL_DATABASE") || "",
  };
}

export async function createMySQLClient(): Promise<Client> {
  const config = getMySQLConfig();
  const client = await new Client().connect(config);
  return client;
}

// Simple hash function using Web Crypto API
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a simple session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
