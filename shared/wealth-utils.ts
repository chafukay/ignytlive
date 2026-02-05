// Wealth level calculation based on total coins spent
// Similar to level system but for spending

export const WEALTH_LEVELS = [
  { level: 0, name: "Newcomer", emoji: "🌱", minSpent: 0, color: "text-gray-400" },
  { level: 1, name: "Supporter", emoji: "⭐", minSpent: 100, color: "text-yellow-400" },
  { level: 2, name: "Contributor", emoji: "🌟", minSpent: 500, color: "text-yellow-500" },
  { level: 3, name: "Patron", emoji: "💫", minSpent: 2000, color: "text-orange-400" },
  { level: 4, name: "Benefactor", emoji: "✨", minSpent: 5000, color: "text-orange-500" },
  { level: 5, name: "Champion", emoji: "🏆", minSpent: 15000, color: "text-amber-500" },
  { level: 6, name: "Legend", emoji: "👑", minSpent: 50000, color: "text-purple-500" },
  { level: 7, name: "Tycoon", emoji: "💎", minSpent: 150000, color: "text-cyan-400" },
  { level: 8, name: "Mogul", emoji: "🔱", minSpent: 500000, color: "text-blue-500" },
  { level: 9, name: "Titan", emoji: "🌈", minSpent: 1000000, color: "text-pink-500" },
];

export function getWealthLevel(totalSpent: number): typeof WEALTH_LEVELS[0] {
  for (let i = WEALTH_LEVELS.length - 1; i >= 0; i--) {
    if (totalSpent >= WEALTH_LEVELS[i].minSpent) {
      return WEALTH_LEVELS[i];
    }
  }
  return WEALTH_LEVELS[0];
}

export function getNextWealthLevel(totalSpent: number): typeof WEALTH_LEVELS[0] | null {
  const currentLevel = getWealthLevel(totalSpent);
  const nextIndex = currentLevel.level + 1;
  if (nextIndex < WEALTH_LEVELS.length) {
    return WEALTH_LEVELS[nextIndex];
  }
  return null;
}

export function getWealthProgress(totalSpent: number): { current: number; required: number; percentage: number } {
  const currentLevel = getWealthLevel(totalSpent);
  const nextLevel = getNextWealthLevel(totalSpent);
  
  if (!nextLevel) {
    return { current: totalSpent, required: currentLevel.minSpent, percentage: 100 };
  }
  
  const currentLevelMin = currentLevel.minSpent;
  const nextLevelMin = nextLevel.minSpent;
  const progressInLevel = totalSpent - currentLevelMin;
  const levelRange = nextLevelMin - currentLevelMin;
  
  return {
    current: progressInLevel,
    required: levelRange,
    percentage: Math.min(100, Math.round((progressInLevel / levelRange) * 100)),
  };
}
