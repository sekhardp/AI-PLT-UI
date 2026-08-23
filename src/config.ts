/** Runtime app config. */
export interface AppConfig {
  apiBaseUrl: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL. Add it to your .env file before running the app.');
}

const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl,
};

export async function initConfig(): Promise<AppConfig> {
  return DEFAULT_CONFIG;
}

export function getConfig(): AppConfig {
  return DEFAULT_CONFIG;
}
