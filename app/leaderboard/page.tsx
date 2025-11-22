
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import Link from 'next/link';
import { LogoIcon, DollarSignIcon, GemIcon, FlameIcon, TrophyIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Leaderboard | RealWorth.ai',
  description: 'See who\'s finding the most valuable treasures! Compete for the top spots.',
};

export const revalidate = 300; // Revalidate every 5 minutes

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  user_picture: string;
  value: number;
  count?: number;
}

async function getTopByTotalValue(): Promise<LeaderboardEntry[]> {
  const { data } = await supabase
    .from('appraisals')
    .select(`
      user_id,
      price_low,
      price_high,
      users:user_id (name, picture)
    `)
    .eq('is_public', true);

  if (!data) return [];

  // Aggregate by user
  const userTotals = data.reduce((acc, item) => {
    const userId = item.user_id;
    const avgValue = (item.price_low + item.price_high) / 2;

    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        user_name: (item.users as any)?.name || 'Anonymous',
        user_picture: (item.users as any)?.picture || '',
        value: 0,
        count: 0,
      };
    }
    acc[userId].value += avgValue;
    acc[userId].count! += 1;
    return acc;
  }, {} as Record<string, LeaderboardEntry>);

  return Object.values(userTotals)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

async function getTopSingleFind(): Promise<LeaderboardEntry[]> {
  const { data } = await supabase
    .from('appraisals')
    .select(`
      user_id,
      item_name,
      price_low,
      price_high,
      users:user_id (name, picture)
    `)
    .eq('is_public', true)
    .order('price_high', { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map(item => ({
    user_id: item.user_id,
    user_name: (item.users as any)?.name || 'Anonymous',
    user_picture: (item.users as any)?.picture || '',
    value: (item.price_low + item.price_high) / 2,
  }));
}

async function getTopStreaks(): Promise<{ user_id: string; name: string; picture: string; streak: number }[]> {
  const { data } = await supabase
    .from('users')
    .select('id, name, picture, longest_streak')
    .order('longest_streak', { ascending: false })
    .limit(10);

  if (!data) return [];

  return data
    .filter(u => u.longest_streak > 0)
    .map(u => ({
      user_id: u.id,
      name: u.name || 'Anonymous',
      picture: u.picture || '',
      streak: u.longest_streak,
    }));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function LeaderboardPage() {
  const [topByValue, topSingleFind, topStreaks] = await Promise.all([
    getTopByTotalValue(),
    getTopSingleFind(),
    getTopStreaks(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-xl text-slate-900">RealWorth<span className="font-light text-slate-500">.ai</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/discover" className="text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm">
              Discover
            </Link>
            <Link href="/leaderboard" className="text-teal-600 font-medium text-sm">
              Leaderboard
            </Link>
            <Link
              href="/"
              className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              Appraise
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <TrophyIcon className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Leaderboard
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            See who's finding the most valuable treasures.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Top by Total Value */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSignIcon className="w-4 h-4 text-emerald-500" /> Top Treasure Vaults
            </h2>
            {topByValue.length > 0 ? (
              <ol className="space-y-3">
                {topByValue.map((entry, index) => (
                  <li key={entry.user_id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-100 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    {entry.user_picture ? (
                      <img src={entry.user_picture} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{entry.user_name}</p>
                      <p className="text-xs text-slate-500">{entry.count} treasures</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(entry.value)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No public treasures yet!</p>
            )}
          </div>

          {/* Top Single Find */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <GemIcon className="w-4 h-4 text-teal-500" /> Biggest Single Finds
            </h2>
            {topSingleFind.length > 0 ? (
              <ol className="space-y-3">
                {topSingleFind.map((entry, index) => (
                  <li key={`${entry.user_id}-${index}`} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-100 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    {entry.user_picture ? (
                      <img src={entry.user_picture} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{entry.user_name}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(entry.value)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No public treasures yet!</p>
            )}
          </div>

          {/* Top Streaks */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FlameIcon className="w-4 h-4 text-orange-500" /> Longest Streaks
            </h2>
            {topStreaks.length > 0 ? (
              <ol className="space-y-3">
                {topStreaks.map((entry, index) => (
                  <li key={entry.user_id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-100 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    {entry.picture ? (
                      <img src={entry.picture} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{entry.name}</p>
                    </div>
                    <span className="text-sm font-bold text-orange-500">{entry.streak} days</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No streaks yet!</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 mb-4 text-sm">Want to climb the leaderboard?</p>
          <Link
            href="/"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Start Finding Treasures
          </Link>
        </div>
      </main>

      <footer className="text-center p-6 text-slate-400 text-xs">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai</p>
      </footer>
    </div>
  );
}
