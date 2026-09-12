'use client';

import { useEffect, useState } from 'react';

// Ported from index.html's rotateHeroVisual() inline script — cycles the
// hero image through a few product screenshots every 4s with a quick
// opacity fade, instead of showing a single static dashboard image.
const IMAGES = [
  { src: '/assets/dashboard-landing.png', alt: 'Oshodi Market Online vendor dashboard preview' },
  { src: '/assets/sample-shop.png', alt: 'Sample Oshodi Market Online vendor shop page' },
  { src: '/assets/sample-product.png', alt: 'Sample Oshodi Market Online product listing' },
];

export default function HeroVisual() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex((i) => (i + 1) % IMAGES.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timeout);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const image = IMAGES[index];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt={image.alt}
      className="w-full h-auto rounded-[14px] shadow-[0_30px_60px_-20px_rgba(10,10,10,0.35)] transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
