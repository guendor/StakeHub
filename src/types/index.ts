export type UserRole = 'player' | 'backer';

export type ListingStatus = 'open' | 'funded' | 'in_progress' | 'settled';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string | null;
  achievements: string[] | null;
  external_links: ExternalLink[] | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ExternalLink {
  label: string;
  url: string;
}

export interface Listing {
  id: string;
  player_id: string;
  tournament_name: string;
  tournament_date: string;
  venue: string | null;
  buy_in: number;
  addon: number;
  other_fees: number;
  guaranteed_prize: number | null;
  total_quotas: number;
  pct_per_quota: number;
  status: ListingStatus;
  notes: string | null;
  created_at: string;
  // Joined
  profiles?: Profile;
  interests?: Interest[];
  // Computed
  total_cost?: number;
  price_per_quota?: number;
  quotas_taken?: number;
}

export interface Interest {
  id: string;
  listing_id: string;
  backer_id: string;
  quotas_wanted: number;
  message: string | null;
  payment_stub: Record<string, unknown> | null;
  created_at: string;
  // Joined
  profiles?: Profile;
  listings?: Listing;
}

export function computeListingValues(listing: Listing): Listing {
  const total_cost = listing.buy_in + listing.addon + listing.other_fees;
  const price_per_quota =
    (total_cost * (1 + listing.pct_per_quota / 100)) / listing.total_quotas;
  const quotas_taken =
    listing.interests?.reduce((acc, i) => acc + i.quotas_wanted, 0) ?? 0;
  return { ...listing, total_cost, price_per_quota, quotas_taken };
}
