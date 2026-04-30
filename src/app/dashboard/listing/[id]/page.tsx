import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditListingClient from './EditListingClient';
import type { Metadata } from 'next';

interface Props { params: Promise<{ id: string }>; }

export const metadata: Metadata = { title: 'Editar anúncio' };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('player_id', user.id) // ensure ownership
    .single();

  if (!listing) notFound();

  return <EditListingClient listing={listing} />;
}
