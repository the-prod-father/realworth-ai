
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import Link from 'next/link';
import { LogoIcon, CompassIcon, GemIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Discover Treasures | RealWorth.ai',
  description: 'See what treasures others are finding! Get inspired and discover hidden value in your own items.',
  openGraph: {
    title: 'Discover Treasures | RealWorth.ai',
    description: 'See what treasures others are finding!',
  },
};

// Revalidate every 60 seconds for fresh content
export const revalidate = 60;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getPublicTreasures() {
  const { data, error } = await supabase
    .from('appraisals')
    .select(`
      *,
      users:user_id (name, picture)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching public treasures:', error);
    return [];
  }

  return data || [];
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default async function DiscoverPage() {
  const treasures = await getPublicTreasures();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-xl text-slate-900">RealWorth<span className="font-light text-slate-500">.ai</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/discover" className="text-teal-600 font-medium text-sm">
              Discover
            </Link>
            <Link href="/leaderboard" className="text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm">
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

      {/* Hero - Mobile optimized */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-8 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-3">
            <CompassIcon className="w-12 h-12 sm:w-10 sm:h-10 text-white/80" />
          </div>
          <h1 className="text-4xl sm:text-3xl md:text-4xl font-bold mb-2">
            Discover Treasures
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto">
            See what amazing finds others are uncovering.
          </p>
        </div>
      </div>

      {/* Feed */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:p-6 md:p-8">
        {treasures.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {treasures.map((treasure) => {
              const avgValue = (treasure.price_low + treasure.price_high) / 2;

              return (
                <Link
                  key={treasure.id}
                  href={`/treasure/${treasure.id}`}
                  className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden group active:scale-[0.98]"
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    {treasure.image_url && (
                      <img
                        src={treasure.image_url}
                        alt={treasure.item_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {/* Value Badge */}
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
                      <span className="text-sm font-bold flex items-center gap-1">
                        <GemIcon className="w-3.5 h-3.5" />
                        {formatCurrency(avgValue, treasure.currency)}
                      </span>
                    </div>

                    {/* Category */}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-2 py-1 rounded-full">
                        {treasure.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
                      {treasure.item_name}
                    </h3>

                    {treasure.era && (
                      <p className="text-sm text-slate-500 mt-0.5">{treasure.era}</p>
                    )}

                    {/* Owner & Time */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {treasure.users?.picture ? (
                          <img
                            src={treasure.users.picture}
                            alt={treasure.users.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200" />
                        )}
                        <span className="text-xs text-slate-600 truncate max-w-[100px]">
                          {treasure.users?.name || 'Anonymous'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {timeAgo(treasure.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-12 bg-white rounded-2xl border border-slate-200">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">No Public Treasures Yet</h2>
            <p className="text-slate-500 text-sm mb-6">Be the first to share your discoveries!</p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Start Appraising
            </Link>
          </div>
        )}

        {/* CTA */}
        {treasures.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-slate-500 mb-4 text-sm">Think you have hidden treasures?</p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Start Finding Treasures
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
