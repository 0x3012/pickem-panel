// models/tenant.model.ts

export type Game = 'CS2' | 'LOL';

export interface Tenant {
  id: string;
  slug: string;
  name: string;

  // ✅ from backend
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface TenantFeatures {
  pickemEnabled: boolean;
  minigamesEnabled: boolean;
}

export interface TenantGames {
  enabled: Game[];
  defaultGame: Game;
}

export interface TenantTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface TenantConfig {
  tenant: Tenant;
  features: TenantFeatures;
  games: TenantGames;

  theme: TenantTheme | null;
}
