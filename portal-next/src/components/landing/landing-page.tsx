import Image from 'next/image';
import Link from 'next/link';

const BENEFITS = [
  {
    icon: '/assets/group.png',
    title: 'Reach more customers',
    desc: 'Let customers discover your business online, even if they have never visited your shop.',
  },
  {
    icon: '/assets/parcel.png',
    title: 'Put your products online',
    desc: 'Show customers what you sell and make it easier for them to find what they need.',
  },
  {
    icon: '/assets/graph.png',
    title: 'Reach customers beyond Oshodi',
    desc: 'Take your business beyond the physical market and reach customers across Lagos and beyond.',
  },
  {
    icon: '/assets/shop.png',
    title: 'Build your online presence',
    desc: 'Give your existing business a digital presence without having to build your own website.',
  },
  {
    icon: '/assets/dashboard.png',
    title: 'Keep running your shop as usual',
    desc: 'You do not need to change how you operate. OMO simply gives you another way to reach customers.',
  },
  {
    icon: '/assets/icon-trust-verified.png',
    bare: true,
    title: 'Build customer trust',
    desc: 'Create a business profile connected to your real business and physical location.',
  },
  {
    icon: '/assets/visible.png',
    title: 'Get more visibility',
    desc: 'Put your business in front of customers who are actively looking for products like yours.',
  },
];

const STEPS = ['Register', 'Verify your business', 'Add your products', 'Get discovered'];

export default function LandingPage() {
  return (
    <div className="bg-white text-[#1d2734]">
      <header className="sticky top-0 z-100 border-b border-[#dcdde0] bg-white/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center justify-between px-8 py-4 max-md:px-4.5 max-md:py-3">
          <Link href="/" className="block shrink-0">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={128} height={32} className="h-auto w-28 object-contain max-md:w-24" />
          </Link>
          <nav className="flex items-center gap-8 max-[900px]:hidden">
            <Link href="#why-join" className="text-[0.88rem] font-semibold hover:text-[#6b7280]">
              Why Join OMO
            </Link>
            <Link href="#how-it-works" className="text-[0.88rem] font-semibold hover:text-[#6b7280]">
              How It Works
            </Link>
          </nav>
          <div className="flex items-center gap-4 max-md:gap-2.5">
            <Link href="/login" className="text-[0.88rem] font-semibold hover:text-[#6b7280] max-[420px]:hidden">
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-[#392065] px-6 py-3 text-[0.9rem] font-bold text-white hover:bg-[#2a1850] max-md:px-4 max-md:py-2.25 max-md:text-[0.8rem]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-300 flex-col gap-12 px-8 pt-16 pb-20 lg:flex-row lg:items-center max-md:px-4.5 max-md:pt-10 max-md:pb-12 max-md:gap-9">
        <div className="flex-1">
          <span className="mb-5 inline-block rounded-full border border-[#dcdde0] bg-[#f8f9fa] px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.08em] text-[#6c5ce7] uppercase">
            Oshodi Market Online
          </span>
          <h1 className="mb-5 max-w-150 text-[2.6rem] font-black leading-[1.1] tracking-tight max-md:text-[1.9rem]">
            Your shop is in Oshodi. Now let more customers find you.
          </h1>
          <p className="mb-8 max-w-120 text-[1.02rem] text-[#6b7280] max-md:text-[0.9rem]">
            Give your market shop a home online — so customers across Lagos can discover, trust and buy from you, without changing how you already run your business.
          </p>
          <div className="flex flex-wrap items-center gap-4 max-md:flex-col max-md:items-stretch">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-[#392065] px-7 py-3.5 text-[0.95rem] font-bold text-white hover:bg-[#2a1850] max-md:w-full"
            >
              Join Oshodi Market Online
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#dcdde0] bg-white px-7 py-3.5 text-[0.95rem] font-bold text-[#1d2734] hover:bg-[#f8f9fa] max-md:w-full"
            >
              See how it works
            </Link>
          </div>
        </div>

        <div className="flex-1">
          <Image
            src="/assets/landing-hero.jpg"
            alt="Smiling Oshodi market vendor at her stall holding a phone"
            width={1448}
            height={1086}
            priority
            className="h-auto w-full rounded-[14px] shadow-[0_30px_60px_-20px_rgba(10,10,10,0.35)]"
          />
        </div>
      </section>

      <section id="why-join" className="border-t border-[#dcdde0] bg-[#f8f9fa] px-8 py-20 max-md:px-4.5 max-md:py-14">
        <div className="mx-auto max-w-300">
          <div className="mx-auto mb-12 max-w-150 text-center max-md:mb-9">
            <h2 className="mb-3 text-[2rem] font-black tracking-tight max-md:text-[1.5rem]">Why Join OMO?</h2>
            <p className="text-[0.95rem] text-[#6b7280]">
              Everything you need to take your Oshodi shop online — with none of the complexity.
            </p>
          </div>

          <Image
            src="/assets/landing-why-join.jpg"
            alt="A busy, colorful Oshodi market street"
            width={2172}
            height={724}
            className="mb-10 h-auto w-full rounded-2xl max-md:mb-7"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-[#dcdde0] bg-white p-6">
                {b.bare ? (
                  <Image src={b.icon} alt="" width={44} height={44} className="mb-4 h-11 w-11 object-contain" />
                ) : (
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d2c2f8] bg-linear-to-br from-[#e4d7fc] to-[#c7b8f0]">
                    <Image src={b.icon} alt="" width={22} height={22} className="h-5.5 w-5.5 object-contain" />
                  </div>
                )}
                <h3 className="mb-1.5 text-[1.02rem] font-bold">{b.title}</h3>
                <p className="text-[0.85rem] leading-relaxed text-[#6b7280]">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[#dcdde0] px-8 py-20 max-md:px-4.5 max-md:py-14">
        <div className="mx-auto max-w-225 text-center">
          <h2 className="mb-3 text-[2rem] font-black tracking-tight max-md:text-[1.5rem]">Joining Is Simple</h2>
          <p className="mb-12 text-[0.95rem] text-[#6b7280] max-md:mb-9">No technical experience needed.</p>

          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center md:gap-2">
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-3 md:flex-row md:gap-2">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#392065] text-[0.95rem] font-extrabold text-white">
                    {i + 1}
                  </div>
                  <div className="text-[0.92rem] font-bold">{step}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="text-[1.2rem] text-[#c7b8f0] md:mb-6" aria-hidden="true">
                    <span className="md:hidden">↓</span>
                    <span className="hidden md:inline">→</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#392065] px-8 py-18 text-center max-md:px-4.5 max-md:py-12">
        <Image src="/assets/landing-cta-bg.jpg" alt="" fill sizes="100vw" className="object-cover opacity-60" />
        <div className="relative">
        <p className="mb-1.5 text-[0.95rem] font-semibold text-[#c7b8f0]">Your business is already in Oshodi.</p>
        <h2 className="mb-7 text-[2rem] font-black tracking-tight text-white max-md:text-[1.5rem]">Now let more people find it.</h2>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#f4b740] px-8 py-3.5 text-[0.95rem] font-extrabold text-[#1d2734] hover:bg-[#e0a82f] max-md:w-full"
        >
          Join Oshodi Market Online
        </Link>
        <p className="mt-5 text-[0.82rem] text-[#c7b8f0]">Reach more customers. Grow your business.</p>
        </div>
      </section>

      <footer className="bg-[#1d1033] py-10 text-center text-[0.8rem] text-[#c7b8f0]">
        <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={110} height={28} className="mx-auto mb-3 h-auto w-27.5 object-contain" />
        <p className="text-[#8b85a0]">© 2026 Oshodi Market Online. All rights reserved.</p>
      </footer>
    </div>
  );
}
