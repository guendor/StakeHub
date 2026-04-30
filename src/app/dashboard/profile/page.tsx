import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileEditClient from './ProfileEditClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar perfil' };

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/auth/login');

  const { data: trophies } = await supabase
    .from('trophies')
    .select('*')
    .eq('player_id', user.id)
    .order('tournament_date', { ascending: false });

  return <ProfileEditClient profile={profile} trophies={trophies ?? []} />;
}
