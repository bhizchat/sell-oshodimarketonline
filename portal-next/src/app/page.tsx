import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HeroVisual from '@/components/landing/hero-visual';

export const metadata: Metadata = {
  title: 'Oshodi Market Online - Bringing Local Markets Online',
  description:
    'Oshodi Market Online connects local vendors and shoppers, helping local markets grow, sell, and thrive online.',
};

// Marketing homepage, ported 1:1 (layout/copy/assets) from index.html —
// navbar, hero (with rotating visual), stats band, features, articles,
// contact, CTA band and footer. Article pages and terms/privacy haven't
// been ported yet, so those links point at the still-live static pages,
// matching the same absolute-URL pattern used for onboarding/staff-join
// elsewhere in this app.
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

  return (
    <div className="bg-white text-[#1d2734]">
      {/* ---- Navbar ---- */}
      <header className="sticky top-0 z-100 border-b border-[#dcdde0] bg-white/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center justify-between px-8 py-4 max-[640px]:px-5 max-[640px]:py-3.5">
          <Link href="/" className="block">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={128} height={32} className="h-auto w-32 object-contain" />
          </Link>
          <nav className="flex items-center gap-8 max-[900px]:hidden">
            <a href="#features" className="text-[0.88rem] font-semibold hover:text-[#4B2E83]">
              Features
            </a>
            <a href="#articles" className="text-[0.88rem] font-semibold hover:text-[#4B2E83]">
              Articles
            </a>
            <a href="#contact" className="text-[0.88rem] font-semibold hover:text-[#4B2E83]">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-5.5">
            <Link href="/login" className="text-[0.88rem] font-semibold hover:text-[#4B2E83]">
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[#4B2E83] px-6 py-3 text-[0.9rem] font-bold whitespace-nowrap text-white hover:bg-[#392065]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="px-8 py-18 pb-22.5 max-[640px]:px-5">
        <div className="mx-auto flex max-w-300 items-center gap-14 max-[900px]:flex-col">
          <div className="min-w-0 flex-1">
            <h1 className="mb-5 text-[3.1rem] leading-[1.08] font-black tracking-[-0.02em] text-[#1d2734] max-[640px]:text-[2.2rem]">
              Bringing Local
              <br />
              Markets <span className="text-[#6c5ce7]">Online.</span>
            </h1>
            <p className="mb-8.5 max-w-120 text-[1.05rem] text-[#6b7280] max-[900px]:max-w-none">
              Oshodi Market Online empowers local vendors and shoppers by connecting markets to more people, more efficiently. Shop
              smarter. Sell more. Grow together.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[#4B2E83] px-7 py-3.5 text-[0.95rem] font-bold whitespace-nowrap text-white hover:bg-[#392065]"
              >
                Get Started
              </Link>
              <a
                href="#articles"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dcdde0] bg-transparent px-7 py-3.5 text-[0.95rem] font-bold whitespace-nowrap hover:bg-[#f3eefc]"
              >
                Browse Articles
              </a>
            </div>
          </div>
          <div className="min-w-0 flex-[1.1]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ---- Stats ---- */}
      <section className="border-y border-[#dcdde0] bg-[#f8f9fa] py-11">
        <div className="mx-auto flex max-w-300 flex-wrap justify-around gap-6 px-8 text-center max-[640px]:justify-start max-[640px]:gap-8 max-[640px]:px-5 max-[640px]:text-left">
          <div>
            <div className="text-[2rem] font-black text-[#1d2734]">500+</div>
            <div className="mt-1 text-[0.85rem] text-[#6b7280]">Vendors</div>
          </div>
          <div>
            <div className="text-[2rem] font-black text-[#1d2734]">10K+</div>
            <div className="mt-1 text-[0.85rem] text-[#6b7280]">Products</div>
          </div>
          <div>
            <div className="text-[2rem] font-black text-[#1d2734]">25K+</div>
            <div className="mt-1 text-[0.85rem] text-[#6b7280]">Happy Shoppers</div>
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className="px-8 py-22 max-[640px]:px-5 max-[640px]:py-14">
        <div className="mx-auto max-w-300">
          <div className="mx-auto mb-12 max-w-140 text-center">
            <h2 className="mb-3 text-[2rem] font-black tracking-[-0.01em] text-[#1d2734] max-[640px]:text-[1.6rem]">Everything local markets need to grow</h2>
            <p className="text-[0.98rem] text-[#6b7280]">
              One platform for vendors to sell and shoppers to discover — built for the way local markets actually work.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-10 max-[900px]:grid-cols-1">
            <div className="text-left">
              <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#dcdde0] bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                <Image src="/assets/shop.png" alt="" width={24} height={24} className="object-contain" />
              </div>
              <h3 className="mb-2 text-[1.1rem] font-extrabold text-[#1d2734]">Digital Shop for Vendors</h3>
              <p className="text-[0.9rem] text-[#6b7280]">
                Create your online shop in minutes, list products, manage orders, and grow your business.
              </p>
            </div>
            <div className="text-left">
              <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#dcdde0] bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                <Image src="/assets/online-shopping.png" alt="" width={24} height={24} className="object-contain" />
              </div>
              <h3 className="mb-2 text-[1.1rem] font-extrabold text-[#1d2734]">Easy Shopping for Everyone</h3>
              <p className="text-[0.9rem] text-[#6b7280]">
                Discover trusted local shops, compare products, and enjoy a seamless shopping experience.
              </p>
            </div>
            <div className="text-left">
              <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#dcdde0] bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                <Image src="/assets/lock.png" alt="" width={24} height={24} className="object-contain" />
              </div>
              <h3 className="mb-2 text-[1.1rem] font-extrabold text-[#1d2734]">Secure &amp; Reliable</h3>
              <p className="text-[0.9rem] text-[#6b7280]">Your security is our priority. We ensure data protection and reliable support.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Articles ---- */}
      <section id="articles" className="border-y border-[#dcdde0] bg-[#f8f9fa] px-8 py-22 max-[640px]:px-5 max-[640px]:py-14">
        <div className="mx-auto max-w-300">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="mb-2 text-[1.9rem] font-black tracking-[-0.01em] text-[#1d2734] max-[640px]:text-[1.5rem]">Learn &amp; Grow</h2>
              <p className="max-w-105 text-[0.95rem] text-[#6b7280]">Insights, tips, and stories to help you build and grow your business.</p>
            </div>
            <Link href="/articles/dashboard-data" className="text-[0.88rem] font-bold whitespace-nowrap text-[#4B2E83]">
              View all articles →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-6 max-[1100px]:grid-cols-2 max-[900px]:grid-cols-1">
            {[
              {
                href: '/articles/dashboard-data',
                img: '/assets/dashboard-landing.png',
                alt: 'Oshodi Market Online vendor dashboard showing shop views, calls, WhatsApp messages and rating',
                title: 'Reading Your Dashboard: Turn Data Into Sales Decisions',
                desc: 'A simple guide to using your dashboard stats to make smarter decisions for your shop.',
                date: 'Jun 2, 2026',
                read: '5 min read',
              },
              {
                href: '/articles/grow-your-market-business',
                img: '/assets/article-grow-market-business.png',
                alt: 'Vendor arranging colorful market goods',
                title: '5 Ways to Grow Your Market Business',
                desc: 'Practical strategies to help local vendors attract more customers and increase sales.',
                date: 'May 20, 2026',
                read: '5 min read',
              },
              {
                href: '/articles/going-digital',
                img: '/assets/article-going-digital.png',
                alt: 'Vendor using a phone to manage an online shop',
                title: 'Going Digital: Why It Matters',
                desc: 'How moving your business online can unlock more opportunities.',
                date: 'May 10, 2026',
                read: '4 min read',
              },
              {
                href: '/articles/success-story',
                img: '/assets/article-success-story.png',
                alt: 'Smiling vendor who grew her business with Oshodi Market Online',
                title: 'Success Story: From Stall to Scale',
                desc: 'Meet vendors who grew their businesses with Oshodi Market Online.',
                date: 'Apr 28, 2026',
                read: '6 min read',
              },
            ].map((article) => (
              <Link
                key={article.href}
                href={article.href}
                className="overflow-hidden rounded-[14px] border border-[#dcdde0] bg-white transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-[0_16px_30px_-18px_rgba(75,46,131,0.3)]"
              >
                <div className="aspect-16/10 w-full overflow-hidden bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                  <Image src={article.img} alt={article.alt} width={400} height={250} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="mb-2 text-[1rem] leading-[1.3] font-extrabold text-[#1d2734]">{article.title}</h3>
                  <p className="mb-4 text-[0.86rem] text-[#6b7280]">{article.desc}</p>
                  <div className="flex items-center gap-2 text-[0.76rem] font-semibold text-[#6c5ce7]">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.read}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Contact ---- */}
      <section id="contact" className="border-y border-[#dcdde0] bg-[#f8f9fa] px-8 py-22 max-[640px]:px-5 max-[640px]:py-14">
        <div className="mx-auto max-w-300">
          <div className="mx-auto mb-12 max-w-140 text-center">
            <h2 className="mb-3 text-[2rem] font-black tracking-[-0.01em] text-[#1d2734] max-[640px]:text-[1.6rem]">Need a hand?</h2>
            <p className="text-[0.98rem] text-[#6b7280]">Our support team is here to assist you personally.</p>
          </div>
          <div className="grid grid-cols-3 gap-7 max-[900px]:grid-cols-1">
            <div className="rounded-[14px] border border-[#dcdde0] bg-white p-7 text-left">
              <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#dcdde0] bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                <Image src="/assets/whatsapp.png" alt="" width={24} height={24} className="object-contain" />
              </div>
              <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#1d2734]">Chat with us</h3>
              <p className="mb-4.5 text-[0.9rem] text-[#6b7280]">Chat live with our support team in real-time.</p>
              <a
                href="https://wa.me/2349134333745"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dcdde0] bg-transparent px-5 py-2.5 text-[0.85rem] font-bold whitespace-nowrap hover:bg-[#f3eefc]"
              >
                Start Live Chat
              </a>
              <div className="mt-3 text-[0.78rem] font-semibold text-[#6c5ce7]">Available Mon - Sat, 8AM - 6PM</div>
            </div>
            <div className="rounded-[14px] border border-[#dcdde0] bg-white p-7 text-left">
              <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#dcdde0] bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                <Image src="/assets/email.png" alt="" width={24} height={24} className="object-contain" />
              </div>
              <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#1d2734]">Email Support</h3>
              <p className="mb-4.5 text-[0.9rem] text-[#6b7280]">Send us an email and we&apos;ll get back to you.</p>
              <a href="mailto:victoredochie10@gmail.com" className="inline-block text-[0.92rem] font-bold text-[#1d2734] hover:text-[#4B2E83]">
                victoredochie10@gmail.com
              </a>
            </div>
            <div className="rounded-[14px] border border-[#dcdde0] bg-white p-7 text-left">
              <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#dcdde0] bg-linear-to-br from-[#f3eefc] to-[#e4d7fc]">
                <Image src="/assets/telephone.png" alt="" width={24} height={24} className="object-contain" />
              </div>
              <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#1d2734]">Call Us</h3>
              <p className="mb-4.5 text-[0.9rem] text-[#6b7280]">Speak with our support team directly.</p>
              <a href="tel:+2349134333745" className="inline-block text-[0.92rem] font-bold text-[#1d2734] hover:text-[#4B2E83]">
                +234 913 433 3745
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA band ---- */}
      <section className="bg-linear-to-[120deg] from-[#392065] via-60% via-[#4B2E83] to-[#2d1850] px-8 py-14 text-white max-[640px]:px-5 max-[640px]:py-10">
        <div className="mx-auto flex max-w-300 flex-wrap items-center justify-between gap-6 max-[640px]:flex-col max-[640px]:items-start">
          <div>
            <h2 className="mb-1.5 text-[1.6rem] font-black max-[640px]:text-[1.3rem]">Ready to grow your local business?</h2>
            <p className="text-[0.92rem] text-[#c7b8f0]">Join thousands of vendors and shoppers building the future of local markets.</p>
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-white px-6 py-3 text-[0.9rem] font-bold whitespace-nowrap text-[#392065] hover:bg-[#f3eefc]"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="bg-[#392065] px-8 py-14 pb-7 text-[#c7b8f0] max-[640px]:px-5 max-[640px]:py-10">
        <div className="mx-auto max-w-300">
          <div className="mb-10 flex flex-wrap justify-between gap-10">
            <div>
              <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={130} height={32} className="mb-3 h-auto w-32.5 object-contain" />
              <p className="mb-4.5 max-w-65 text-[0.82rem] text-[#c7b8f0]">Bringing local markets online. Empowering vendors. Connecting communities.</p>
              <div className="flex gap-2.5">
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/[0.15] bg-white/10 text-[#c7b8f0] hover:bg-white/20"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
                  </svg>
                </a>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/[0.15] bg-white/10 text-[#c7b8f0] hover:bg-white/20"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.22 1.15-1.77.55-.55 1.11-.9 1.77-1.15.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2zm0 3.78a6.22 6.22 0 1 0 0 12.44 6.22 6.22 0 0 0 0-12.44zm0 10.26a4.04 4.04 0 1 1 0-8.08 4.04 4.04 0 0 1 0 8.08zm6.47-10.5a1.45 1.45 0 1 1-2.9 0 1.45 1.45 0 0 1 2.9 0z" />
                  </svg>
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/[0.15] bg-white/10 text-[#c7b8f0] hover:bg-white/20"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
                  </svg>
                </a>
                <a
                  href="#"
                  aria-label="Twitter"
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-white/[0.15] bg-white/10 text-[#c7b8f0] hover:bg-white/20"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 5.9c-.73.33-1.51.55-2.33.65a4.07 4.07 0 0 0 1.78-2.24 8.1 8.1 0 0 1-2.58.99 4.06 4.06 0 0 0-6.92 3.7A11.53 11.53 0 0 1 3.6 4.7a4.06 4.06 0 0 0 1.26 5.42 4 4 0 0 1-1.84-.51v.05a4.06 4.06 0 0 0 3.26 3.98 4.1 4.1 0 0 1-1.83.07 4.06 4.06 0 0 0 3.79 2.82A8.14 8.14 0 0 1 2 18.57a11.5 11.5 0 0 0 6.24 1.83c7.48 0 11.57-6.2 11.57-11.57 0-.18 0-.35-.01-.53A8.18 8.18 0 0 0 22 5.9z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-14">
              <div>
                <h4 className="mb-3.5 text-[0.8rem] font-extrabold tracking-[0.06em] text-white uppercase">Product</h4>
                <ul className="flex flex-col gap-2.5">
                  <li>
                    <a href="#features" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Features
                    </a>
                  </li>
                  <li>
                    <Link href="/signup" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Get Started
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3.5 text-[0.8rem] font-extrabold tracking-[0.06em] text-white uppercase">Resources</h4>
                <ul className="flex flex-col gap-2.5">
                  <li>
                    <a href="#articles" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Articles
                    </a>
                  </li>
                  <li>
                    <Link href="/articles/grow-your-market-business" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Guides
                    </Link>
                  </li>
                  <li>
                    <a href="#contact" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Help Center
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3.5 text-[0.8rem] font-extrabold tracking-[0.06em] text-white uppercase">Company</h4>
                <ul className="flex flex-col gap-2.5">
                  <li>
                    <a href="#contact" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="#contact" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Contact
                    </a>
                  </li>
                  <li>
                    <Link href="/signup" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Careers
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3.5 text-[0.8rem] font-extrabold tracking-[0.06em] text-white uppercase">Legal</h4>
                <ul className="flex flex-col gap-2.5">
                  <li>
                    <Link href="/terms" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-[0.84rem] text-[#c7b8f0] hover:text-white">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.15] pt-5 text-center text-[0.78rem] text-[#c7b8f0]">© 2026 Oshodi Market Online. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
