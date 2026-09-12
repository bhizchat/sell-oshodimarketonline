import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared navbar/hero/footer scaffold for /articles/* pages, ported 1:1
// (layout/copy) from the article-*.html static pages' shared markup. Each
// article page supplies its own tag/title/meta/hero image and body JSX.
export default function ArticleLayout({
  tag,
  title,
  meta,
  heroSrc,
  heroAlt,
  children,
}: {
  tag: string;
  title: string;
  meta: string;
  heroSrc: string;
  heroAlt: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white text-[#1d2734]">
      <header className="sticky top-0 z-100 border-b border-[#dcdde0] bg-white/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center justify-between px-8 py-4">
          <Link href="/" className="block">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={128} height={32} className="h-auto w-32 object-contain" />
          </Link>
          <nav className="flex items-center gap-8 max-[900px]:hidden">
            <Link href="/#features" className="text-[0.88rem] font-semibold hover:text-[#6b7280]">
              Features
            </Link>
            <Link href="/#articles" className="text-[0.88rem] font-semibold hover:text-[#6b7280]">
              Articles
            </Link>
            <Link href="/#contact" className="text-[0.88rem] font-semibold hover:text-[#6b7280]">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-5.5">
            <Link href="/login" className="text-[0.88rem] font-semibold hover:text-[#6b7280]">
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[#392065] px-6 py-3 text-[0.9rem] font-bold whitespace-nowrap text-white hover:bg-[#222225]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <article>
        <div className="border-b border-[#dcdde0] px-8 py-13 pb-8 text-center">
          <span className="mb-4.5 inline-block rounded-full border border-[#dcdde0] bg-[#f8f9fa] px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.08em] text-[#6c5ce7] uppercase">
            {tag}
          </span>
          <h1 className="mx-auto mb-4 max-w-180 text-[2.2rem] font-black tracking-[-0.01em] text-[#1d2734]">{title}</h1>
          <div className="text-[0.85rem] font-semibold text-[#6b7280]">{meta}</div>
        </div>

        <div className="mx-auto mt-9 max-w-225 px-8">
          <Image
            src={heroSrc}
            alt={heroAlt}
            width={900}
            height={450}
            className="aspect-16/8 w-full rounded-[14px] bg-linear-to-br from-[#e5e6e8] to-[#c7c9cc] object-cover"
          />
        </div>

        <div className="mx-auto mt-11 max-w-180 px-8 pb-20 text-[1.02rem] text-[#26262a] [&_blockquote]:my-6 [&_blockquote]:border-l-3 [&_blockquote]:border-[#4B2E83] [&_blockquote]:pl-4.5 [&_blockquote]:text-[1.08rem] [&_blockquote]:font-normal [&_blockquote]:text-[#1d2734] [&_blockquote]:italic [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-[1.3rem] [&_h2]:font-extrabold [&_h2]:text-[#1d2734] [&_li]:mb-2 [&_p]:mb-4.5 [&_strong]:text-[#1d2734] [&_ul]:mb-4.5 [&_ul]:list-disc [&_ul]:pl-5.5">
          {children}

          <Link href="/#articles" className="mt-10 inline-block text-[0.88rem] font-bold text-[#1d2734]">
            ← Back to all articles
          </Link>
        </div>
      </article>

      <footer className="bg-[#392065] py-10 text-center text-[0.8rem] text-[#c7b8f0]">
        <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={110} height={28} className="mx-auto mb-3 h-auto w-27.5 object-contain" />
        <p className="text-[#6b7280]">© 2026 Oshodi Market Online. All rights reserved.</p>
      </footer>
    </div>
  );
}
