// Interactive trivia questions for the appraisal loading screen
// Each question tests knowledge about collectibles, antiques, and valuables

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: 'books' | 'toys' | 'tech' | 'art' | 'coins' | 'fashion' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number; // Points awarded for correct answer
}

export const triviaQuestions: TriviaQuestion[] = [
  // Books & Literature
  {
    id: 'book-1',
    question: 'A first edition Harry Potter book sold at auction for approximately:',
    options: ['$47,000', '$471,000', '$4,700', '$1.2 million'],
    correctIndex: 1,
    explanation: 'A first edition Harry Potter and the Philosopher\'s Stone sold for $471,000! Only 500 copies were printed in the first run.',
    category: 'books',
    difficulty: 'medium',
    points: 10,
  },
  {
    id: 'book-2',
    question: 'Which comic book holds the record for highest sale price?',
    options: ['Batman #1', 'Action Comics #1 (Superman)', 'Amazing Fantasy #15 (Spider-Man)', 'X-Men #1'],
    correctIndex: 1,
    explanation: 'Action Comics #1, featuring Superman\'s first appearance, sold for $3.25 million - the most expensive comic ever!',
    category: 'books',
    difficulty: 'medium',
    points: 10,
  },
  {
    id: 'book-3',
    question: 'Vintage Dr. Seuss books from the 1950s can be worth up to:',
    options: ['$500', '$2,000', '$20,000', '$100,000'],
    correctIndex: 2,
    explanation: 'Early Dr. Seuss first editions, especially "The Cat in the Hat" and "How the Grinch Stole Christmas," can fetch $4,000-$20,000!',
    category: 'books',
    difficulty: 'easy',
    points: 5,
  },

  // Toys & Collectibles
  {
    id: 'toy-1',
    question: 'An original 1959 Barbie doll in good condition is worth approximately:',
    options: ['$500-$1,000', '$8,000-$27,000', '$100-$300', '$50,000+'],
    correctIndex: 1,
    explanation: 'The original 1959 Barbie, especially the #1 Ponytail Barbie, sells for $8,000-$27,000 depending on condition!',
    category: 'toys',
    difficulty: 'medium',
    points: 10,
  },
  {
    id: 'toy-2',
    question: 'The most valuable Beanie Baby ever sold went for:',
    options: ['$5,000', '$50,000', '$500,000', '$5 million'],
    correctIndex: 2,
    explanation: 'Princess Diana Beanie Baby reportedly sold for $500,000! Though most Beanie Babies aren\'t worth much today.',
    category: 'toys',
    difficulty: 'hard',
    points: 15,
  },
  {
    id: 'toy-3',
    question: 'Vintage Star Wars figures from the 1970s-80s can be worth up to:',
    options: ['$100-$500', '$1,000-$5,000', '$10,000-$300,000', '$1 million+'],
    correctIndex: 2,
    explanation: 'Rare Star Wars figures, like the vinyl-cape Jawa or rocket-firing Boba Fett prototype, can fetch $10,000-$300,000!',
    category: 'toys',
    difficulty: 'medium',
    points: 10,
  },

  // Technology & Electronics
  {
    id: 'tech-1',
    question: 'An original Apple-1 computer typically sells for:',
    options: ['$50,000-$100,000', '$400,000-$900,000', '$1-5 million', '$10,000-$50,000'],
    correctIndex: 1,
    explanation: 'Apple-1 computers, with only ~200 ever made, regularly sell for $400,000-$900,000 at auction!',
    category: 'tech',
    difficulty: 'medium',
    points: 10,
  },
  {
    id: 'tech-2',
    question: 'Sealed original iPods in their packaging can sell for:',
    options: ['$50-$100', '$200-$500', '$1,000-$20,000', '$100-$200'],
    correctIndex: 2,
    explanation: 'First-generation iPods still sealed in original packaging have sold for $1,000-$20,000 to collectors!',
    category: 'tech',
    difficulty: 'easy',
    points: 5,
  },
  {
    id: 'tech-3',
    question: 'Rare Nintendo video games have sold for as much as:',
    options: ['$10,000', '$100,000', '$500,000', '$2 million'],
    correctIndex: 3,
    explanation: 'A sealed copy of Super Mario Bros. sold for $2 million in 2021, making it the most expensive video game ever!',
    category: 'tech',
    difficulty: 'hard',
    points: 15,
  },

  // Art & Antiques
  {
    id: 'art-1',
    question: 'A painting bought at a thrift store for $4 turned out to be worth:',
    options: ['$400', '$4,000', '$400,000', '$1 million+'],
    correctIndex: 3,
    explanation: 'Multiple thrift store paintings have been discovered to be worth millions - including lost works by famous artists!',
    category: 'art',
    difficulty: 'medium',
    points: 10,
  },
  {
    id: 'art-2',
    question: 'Vintage movie posters from the 1930s-50s can sell for up to:',
    options: ['$1,000-$5,000', '$10,000-$50,000', '$100,000-$500,000', '$50-$500'],
    correctIndex: 2,
    explanation: 'Rare movie posters, especially for classics like Dracula or Metropolis, have sold for $100,000-$500,000!',
    category: 'art',
    difficulty: 'medium',
    points: 10,
  },

  // Coins & Currency
  {
    id: 'coin-1',
    question: 'The most expensive coin ever sold went for approximately:',
    options: ['$1 million', '$5 million', '$10 million', '$19 million'],
    correctIndex: 3,
    explanation: 'A 1933 Double Eagle gold coin sold for $18.9 million in 2021 - the most expensive coin ever!',
    category: 'coins',
    difficulty: 'hard',
    points: 15,
  },
  {
    id: 'coin-2',
    question: 'A rare 1943 copper penny (instead of steel) is worth:',
    options: ['$100-$500', '$1,000-$5,000', '$10,000-$50,000', '$100,000-$1 million'],
    correctIndex: 3,
    explanation: '1943 copper pennies (minted by mistake in steel shortage year) are worth $100,000-$1 million!',
    category: 'coins',
    difficulty: 'hard',
    points: 15,
  },

  // Fashion & Clothing
  {
    id: 'fashion-1',
    question: 'Vintage Levi\'s 501 jeans from the 1950s can sell for:',
    options: ['$500-$1,000', '$5,000-$100,000', '$100-$500', '$1,000-$3,000'],
    correctIndex: 1,
    explanation: 'Vintage Levi\'s 501s from the 1950s are highly collectible, with rare pairs selling for $5,000-$100,000!',
    category: 'fashion',
    difficulty: 'medium',
    points: 10,
  },
  {
    id: 'fashion-2',
    question: 'Original Air Jordan 1 sneakers from 1985 can be worth:',
    options: ['$500-$1,000', '$1,000-$10,000', '$10,000-$50,000', '$100-$500'],
    correctIndex: 2,
    explanation: 'Original 1985 Air Jordan 1s in good condition regularly sell for $10,000-$50,000 to sneaker collectors!',
    category: 'fashion',
    difficulty: 'medium',
    points: 10,
  },

  // General Knowledge
  {
    id: 'general-1',
    question: 'What percentage of people have at least one $500+ item they don\'t know about?',
    options: ['10%', '30%', '50%', '90%'],
    correctIndex: 3,
    explanation: 'Studies suggest 90% of households have at least one valuable item they don\'t realize is worth $500+!',
    category: 'general',
    difficulty: 'easy',
    points: 5,
  },
  {
    id: 'general-2',
    question: 'The average American household has approximately how much in unused valuables?',
    options: ['$500', '$1,500', '$4,000', '$10,000'],
    correctIndex: 2,
    explanation: 'Research shows the average American household has about $4,000 in unused valuables collecting dust!',
    category: 'general',
    difficulty: 'easy',
    points: 5,
  },
  {
    id: 'general-3',
    question: 'Items in original packaging are typically worth how much more?',
    options: ['10-20% more', '50-100% more', '2-5x more', '10x more'],
    correctIndex: 2,
    explanation: 'Items in original, unopened packaging often sell for 2-5x more than the same item without packaging!',
    category: 'general',
    difficulty: 'easy',
    points: 5,
  },
  {
    id: 'general-4',
    question: 'The vintage Pyrex "Lucky in Love" pattern sells for approximately:',
    options: ['$50-$100', '$200-$500', '$1,000-$2,000', '$3,000-$4,000'],
    correctIndex: 3,
    explanation: 'The rare Pyrex "Lucky in Love" pattern with hearts can sell for $3,000-$4,000 to collectors!',
    category: 'general',
    difficulty: 'hard',
    points: 15,
  },
  {
    id: 'general-5',
    question: 'What fraction of garage sale items is estimated to be worth $10,000+?',
    options: ['1 in 1,000', '1 in 10,000', '1 in 100,000', '1 in 1,000,000'],
    correctIndex: 2,
    explanation: 'Approximately 1 in every 100,000 garage sale items is estimated to be worth $10,000 or more!',
    category: 'general',
    difficulty: 'medium',
    points: 10,
  },
];

// Get random questions
export function getRandomQuestions(count: number): TriviaQuestion[] {
  const shuffled = [...triviaQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, triviaQuestions.length));
}

// Get questions by category
export function getQuestionsByCategory(category: TriviaQuestion['category'], count: number): TriviaQuestion[] {
  const filtered = triviaQuestions.filter(q => q.category === category);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, filtered.length));
}

// Get a single random question
export function getRandomQuestion(): TriviaQuestion {
  return triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
}
