
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LogoIcon, GemIcon, UserIcon } from '@/components/icons';

// Initialize Supabase client for server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserPageProps {
  params: { id: string };
}

// Fetch user and their public treasures
async function getUserWithTreasures(id: string) {
  // Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, picture')
    .eq('id', id)
    .single();

  if (userError || !user) return null;

  // Get user's public appraisals
  const { data: treasures, error: treasuresError } = await supabase
    .from('appraisals')
    .select('*')
    .eq('user_id', id)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (treasuresError) {
    console.error('Error fetching treasures:', treasuresError);
    return { user, treasures: [] };
  }

  return { user, treasures: treasures || [] };
}

// Generate metadata
export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const data = await getUserWithTreasures(params.id);

  if (!data || data.treasures.length === 0) {
    return {
      title: 'User Not Found | RealWorth.ai',
    };
  }

  return {
    title: `${data.user.name}'s Treasures | RealWorth.ai`,
    description: `Discover ${data.treasures.length} treasures shared by ${data.user.name} on RealWorth.ai`,
  };
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function UserProfilePage({ params }: UserPageProps) {
  const data = await getUserWithTreasures(params.id);

  if (!data) {
    notFound();
  }

  const { user, treasures } = data;

  // Calculate total value
  const totalValue = treasures.reduce((sum, t) => {
    return sum + (t.price_low + t.price_high) / 2;
  }, 0);

  // If no public treasures, show private profile message
  if (treasures.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Private Profile</h1>
          <p className="text-slate-600 mb-6">
            This user hasn't shared any treasures publicly yet.
          </p>
          <Link
            href="/discover"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"
          >
            Browse Public Treasures
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-xl text-slate-900">RealWorth<span className="font-light text-slate-500">.ai</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="text-teal-600 font-semibold"
            >
              Discover
            </Link>
            <Link
              href="/"
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-full text-sm transition-transform transform hover:scale-105"
            >
              Appraise Now
            </Link>
          </div>
        </div>
      </header>

      {/* Profile Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-slate-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                <span>{treasures.length} {treasures.length === 1 ? 'treasure' : 'treasures'}</span>
                <span>•</span>
                <span>Total value: {formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Treasures Grid */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {treasures.map((treasure) => {
            const avgValue = (treasure.price_low + treasure.price_high) / 2;

            return (
              <Link
                key={treasure.id}
                href={`/treasure/${treasure.id}`}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
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
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
