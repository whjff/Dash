export const GAME_DEFINITIONS = [
  {
    id: "valorant",
    name: "Valorant",
  },
  {
    id: "warframe",
    name: "Warframe",
  },
  {
    id: "fortnite",
    name: "Fortnite",
  },
  {
    id: "rust",
    name: "Rust",
  },
  {
    id: "roblox",
    name: "Roblox",
  },
  {
    id: "destiny2",
    name: "Destiny 2",
  },
] as const;

export type GameId = typeof GAME_DEFINITIONS[number]["id"];
