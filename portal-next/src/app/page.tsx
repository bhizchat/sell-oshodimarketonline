import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/landing-page';

// Signed-in visitors go straight to onboarding/dashboard. Signed-out visitors
// see the OMO marketing landing page instead of being redirected to /login.
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

  return <LandingPage />;
}
