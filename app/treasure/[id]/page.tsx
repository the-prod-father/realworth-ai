
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// Initialize Supabase client for server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TreasurePageProps {
  params: { id: string };
}

// Fetch treasure data
async function getTreasure(id: string) {
  const { data, error } = await supabase
    .from('appraisals')
    .select(`
      *,
      users:user_id (name, picture)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

// Generate metadata for social sharing
export async function generateMetadata({ params }: TreasurePageProps): Promise<Metadata> {
  const treasure = await getTreasure(params.id);

  if (!treasure || !treasure.is_public) {
    return {
      title: 'Treasure Not Found | RealWorth.ai',
    };
  }

  const avgValue = ((treasure.price_low + treasure.price_high) / 2).toFixed(0);
  const title = `${treasure.item_name} - Worth $${avgValue}!`;
  const description = `Discovered on RealWorth.ai: ${treasure.description?.substring(0, 150)}...`;

  return {
    title: `${title} | RealWorth.ai`,
    description,
    openGraph: {
      title,
      description,
      images: treasure.image_url ? [treasure.image_url] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: treasure.image_url ? [treasure.image_url] : [],
    },
  };
}

export default async function TreasurePage({ params }: TreasurePageProps) {
  const treasure = await getTreasure(params.id);

  if (!treasure) {
    notFound();
  }

  // Check if treasure is public
  if (!treasure.is_public) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Private Treasure</h1>
          <p className="text-slate-600 mb-6">
            This treasure is set to private by its owner.
          </p>
          <Link
            href="/"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"
          >
            Discover Your Own Treasures
          </Link>
        </div>
      </div>
    );
  }

  const avgValue = (treasure.price_low + treasure.price_high) / 2;
  const formattedAvg = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: treasure.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(avgValue);

  const formattedLow = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: treasure.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(treasure.price_low);

  const formattedHigh = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: treasure.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(treasure.price_high);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💎</span>
            <span className="font-bold text-xl text-slate-900">RealWorth.ai</span>
          </Link>
          <Link
            href="/"
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-full text-sm transition-transform transform hover:scale-105"
          >
            Appraise Your Items
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Image */}
          {treasure.image_url && (
            <div className="relative aspect-square sm:aspect-video bg-slate-100">
              <img
                src={treasure.image_url}
                alt={treasure.item_name}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="inline-block bg-teal-100 text-teal-800 text-sm font-semibold px-3 py-1 rounded-full">
                {treasure.category}
              </span>
            </div>

            {/* Title & Value */}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">
              {treasure.item_name}
            </h1>

            {treasure.author && treasure.author !== 'N/A' && (
              <p className="text-lg text-slate-600 mb-4">by {treasure.author}</p>
            )}

            {/* Value Card */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl p-6 mb-6 text-white">
              <p className="text-sm uppercase tracking-wide opacity-90 mb-1">Estimated Value</p>
              <p className="text-4xl font-black mb-2">{formattedAvg}</p>
              <p className="text-sm opacity-90">
                Range: {formattedLow} - {formattedHigh}
              </p>
            </div>

            {/* Era */}
            {treasure.era && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Era</h3>
                <p className="text-slate-900">{treasure.era}</p>
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-slate-700 leading-relaxed">{treasure.description}</p>
            </div>

            {/* Reasoning */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Valuation Reasoning</h3>
              <p className="text-slate-700 leading-relaxed">{treasure.reasoning}</p>
            </div>

            {/* Owner Info */}
            {treasure.users && (
              <div className="border-t pt-6 flex items-center gap-3">
                {treasure.users.picture && (
                  <img
                    src={treasure.users.picture}
                    alt={treasure.users.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm text-slate-500">Discovered by</p>
                  <p className="font-semibold text-slate-900">{treasure.users.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Think you have hidden treasures?</p>
          <Link
            href="/"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30"
          >
            Start Appraising Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
