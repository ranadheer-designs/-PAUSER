'use server';

import { createClient } from '@/utils/supabase/server';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string; 
  tags: string[];
  createdAt: string;
}

export async function getFlashcards(): Promise<Flashcard[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching flashcards:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    front: row.front,
    back: row.back,
    deck: 'General',
    tags: row.tags || [],
    createdAt: row.created_at,
  }));
}
