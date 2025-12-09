
import { Metadata } from 'next';
import { TreasureViewer } from '@/components/TreasureViewer';
import { createClient } from '@supabase/supabase-js';

interface TreasurePageProps {
  params: { id: string };
}

// Fetch treasure data for metadata generation (public treasures only)
async function getPublicTreasure(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Only fetch public treasures for metadata (anon key can only see public)
  const { data, error } = await supabase
    .from('appraisals')
    .select('id, item_name, description, price_low, price_high, currency, image_url, is_public')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;
  return data;
}

// Generate metadata for social sharing (only for public treasures)
export async function generateMetadata({ params }: TreasurePageProps): Promise<Metadata> {
  const treasure = await getPublicTreasure(params.id);

  if (!treasure) {
    return {
      title: 'Treasure | RealWorth.ai',
      description: 'Discover the value of your items with AI-powered appraisals.',
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

export default function TreasurePage({ params }: TreasurePageProps) {
  return <TreasureViewer treasureId={params.id} />;
}
