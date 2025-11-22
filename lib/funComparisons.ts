
// Fun value comparisons to make prices relatable and shareable

interface Comparison {
  emoji: string;
  text: string;
  value: number;
}

const COMPARISONS: Comparison[] = [
  { emoji: '☕', text: 'cups of coffee', value: 5 },
  { emoji: '🍕', text: 'pizzas', value: 15 },
  { emoji: '🎬', text: 'movie tickets', value: 12 },
  { emoji: '📚', text: 'books', value: 20 },
  { emoji: '🎮', text: 'video games', value: 60 },
  { emoji: '👟', text: 'pairs of sneakers', value: 100 },
  { emoji: '📱', text: 'phone cases', value: 25 },
  { emoji: '🍔', text: 'fancy burgers', value: 18 },
  { emoji: '💅', text: 'manicures', value: 40 },
  { emoji: '🎧', text: 'AirPods', value: 180 },
  { emoji: '🛒', text: 'grocery trips', value: 150 },
  { emoji: '⛽', text: 'tanks of gas', value: 50 },
  { emoji: '🎸', text: 'guitar lessons', value: 75 },
  { emoji: '🧘', text: 'yoga classes', value: 20 },
  { emoji: '💇', text: 'haircuts', value: 35 },
];

const VALUE_REACTIONS = [
  { min: 0, max: 10, emoji: '🤷', text: "It's the thought that counts!" },
  { min: 10, max: 50, emoji: '👍', text: 'Nice little find!' },
  { min: 50, max: 100, emoji: '😊', text: 'Not bad at all!' },
  { min: 100, max: 250, emoji: '🎉', text: 'Great discovery!' },
  { min: 250, max: 500, emoji: '🔥', text: 'Now we\'re talking!' },
  { min: 500, max: 1000, emoji: '💰', text: 'Impressive find!' },
  { min: 1000, max: 2500, emoji: '🤑', text: 'Wow, jackpot!' },
  { min: 2500, max: 5000, emoji: '💎', text: 'Hidden treasure!' },
  { min: 5000, max: 10000, emoji: '🏆', text: 'Incredible discovery!' },
  { min: 10000, max: Infinity, emoji: '👑', text: 'Legendary find!' },
];

export function getValueReaction(value: number): { emoji: string; text: string } {
  const reaction = VALUE_REACTIONS.find(r => value >= r.min && value < r.max);
  return reaction || VALUE_REACTIONS[0];
}

export function getFunComparison(value: number): { emoji: string; text: string; count: number } {
  // Pick a comparison that gives a nice round-ish number
  const suitable = COMPARISONS.filter(c => {
    const count = value / c.value;
    return count >= 1 && count <= 500;
  });

  if (suitable.length === 0) {
    return { emoji: '💵', text: 'dollars', count: Math.round(value) };
  }

  // Pick a random suitable comparison
  const comparison = suitable[Math.floor(Math.random() * suitable.length)];
  const count = Math.round(value / comparison.value);

  return {
    emoji: comparison.emoji,
    text: comparison.text,
    count,
  };
}

export function getShareText(itemName: string, value: number): string {
  const reaction = getValueReaction(value);
  const comparison = getFunComparison(value);

  return `${reaction.emoji} Just discovered my ${itemName} is worth $${Math.round(value)}! That's ${comparison.count} ${comparison.text}! ${comparison.emoji}\n\nFind your hidden treasures at RealWorth.ai`;
}

export function shouldCelebrate(value: number): boolean {
  return value >= 100;
}

export function getCelebrationLevel(value: number): 'small' | 'medium' | 'large' | 'epic' {
  if (value >= 5000) return 'epic';
  if (value >= 1000) return 'large';
  if (value >= 500) return 'medium';
  return 'small';
}
