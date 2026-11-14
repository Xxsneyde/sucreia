import { notFound } from 'next/navigation';
import { businesses } from '@/data/demo';
import { BusinessProfile } from '@/features/marketplace/business-profile';
export function generateStaticParams() {
  return businesses.map((b) => ({ slug: b.id }));
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = businesses.find((b) => b.id === slug);
  if (!business) notFound();
  return <BusinessProfile business={business} />;
}
