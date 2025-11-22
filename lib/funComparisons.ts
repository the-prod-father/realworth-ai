
// Fun value comparisons to make prices relatable and shareable

interface Comparison {
  text: string;
  value: number;
}

const COMPARISONS: Comparison[] = [
  { text: 'cups of coffee', value: 5 },
  { text: 'pizzas', value: 15 },
  { text: 'movie tickets', value: 12 },
  { text: 'books', value: 20 },
  { text: 'video games', value: 60 },
  { text: 'pairs of sneakers', value: 100 },
  { text: 'phone cases', value: 25 },
  { text: 'fancy meals', value: 50 },
  { text: 'concert tickets', value: 80 },
  { text: 'monthly subscriptions', value: 15 },
  { text: 'tanks of gas', value: 50 },
  { text: 'yoga classes', value: 20 },
  { text: 'haircuts', value: 35 },
];

const VALUE_REACTIONS = [
  { min: 0, max: 10, text: "Every dollar counts" },
  { min: 10, max: 50, text: 'Nice little find' },
  { min: 50, max: 100, text: 'Not bad at all' },
  { min: 100, max: 250, text: 'Great discovery' },
  { min: 250, max: 500, text: 'Solid find' },
  { min: 500, max: 1000, text: 'Impressive' },
  { min: 1000, max: 2500, text: 'Excellent find' },
  { min: 2500, max: 5000, text: 'Hidden treasure' },
  { min: 5000, max: 10000, text: 'Incredible discovery' },
  { min: 10000, max: Infinity, text: 'Legendary find' },
];

export function getValueReaction(value: number): { text: string } {
  const reaction = VALUE_REACTIONS.find(r => value >= r.min && value < r.max);
  return reaction || VALUE_REACTIONS[0];
}

export function getFunComparison(value: number): { text: string; count: number } {
  // Pick a comparison that gives a nice round-ish number
  const suitable = COMPARISONS.filter(c => {
    const count = value / c.value;
    return count >= 1 && count <= 500;
  });

  if (suitable.length === 0) {
    return { text: 'dollars', count: Math.round(value) };
  }

  // Pick a random suitable comparison
  const comparison = suitable[Math.floor(Math.random() * suitable.length)];
  const count = Math.round(value / comparison.value);

  return {
    text: comparison.text,
    count,
  };
}

export function getShareText(itemName: string, value: number): string {
  const comparison = getFunComparison(value);

  return `Just discovered my ${itemName} is worth $${Math.round(value).toLocaleString()}! That's ${comparison.count} ${comparison.text}.\n\nFind your hidden treasures at RealWorth.ai`;
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
