import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Root route has no landing page — go straight to auth (or onboarding/dashboard
// if already signed in).
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = (user.user_metadata as Record<string, unknown>) || {};
    if (!meta.sx_onboarded) {
      redirect('/onboarding');
    }
    redirect('/dashboard');
  }

  redirect('/login');
}
