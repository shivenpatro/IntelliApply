import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useGsapScrollSetup = () => {
  useLayoutEffect(() => {
    if (prefersReduced()) return;
    ScrollTrigger.refresh();
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);
};

/** Word/line mask reveal on text. Attach ref to a heading. */
export const useLineMaskReveal = <T extends HTMLElement>(opts?: {
  delay?: number;
  scrub?: boolean;
  yPercent?: number;
}) => {
  const ref = useRef<T>(null);
  const { delay = 0, scrub = false, yPercent = 110 } = opts ?? {};

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;

    const split = new SplitType(el, {
      types: 'lines',
      lineClass: 'line',
    });

    // wrap each line's inner text in translate container
    split.lines?.forEach((line) => {
      const inner = document.createElement('div');
      inner.className = 'line-inner';
      inner.innerHTML = line.innerHTML;
      line.innerHTML = '';
      line.style.overflow = 'hidden';
      line.style.display = 'block';
      line.appendChild(inner);
    });

    const inners = el.querySelectorAll('.line-inner');

    if (scrub) {
      gsap.fromTo(
        inners,
        { yPercent: yPercent },
        {
          yPercent: 0,
          ease: 'power3.out',
          stagger: 0.06,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 40%',
            scrub: 1,
          },
        }
      );
    } else {
      gsap.fromTo(
        inners,
        { yPercent: yPercent },
        {
          yPercent: 0,
          duration: 1.1,
          ease: 'power3.out',
          stagger: 0.08,
          delay: delay,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        }
      );
    }

    return () => {
      split.revert();
    };
  }, [delay, scrub, yPercent]);

  return ref;
};

/** Generic scroll-linked y/opacity animation for an element. */
export const useScrollFade = <T extends HTMLElement>(opts?: {
  y?: number;
  x?: number;
  delay?: number;
  duration?: number;
  start?: string;
  scrub?: boolean;
}) => {
  const ref = useRef<T>(null);
  const { y = 40, x = 0, duration = 1, delay = 0, start, scrub = false } = opts ?? {};

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;

    const tween = gsap.fromTo(
      el,
      {
        opacity: 0,
        y: y,
        x: x,
      },
      {
        opacity: 1,
        y: 0,
        x: 0,
        duration: duration,
        delay: delay,
        ease: 'power3.out',
        scrollTrigger: scrub
          ? { trigger: el, start: start ?? 'top 90%', end: 'top 40%', scrub: 1 }
          : { trigger: el, start: start ?? 'top 88%' },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [y, x, duration, delay, start, scrub]);

  return ref;
};

/** Parallax move — element translates as you scroll through its parent section. */
export const useParallax = <T extends HTMLElement>(opts?: {
  yPercent?: number;
  scrub?: boolean | number;
}) => {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;

    const tween = gsap.fromTo(
      el,
      { yPercent: opts?.yPercent ?? 12 },
      {
        yPercent: -(opts?.yPercent ?? 12),
        ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement ?? el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: opts?.scrub ?? 0.6,
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [opts?.yPercent, opts?.scrub]);

  return ref;
};

export { gsap, ScrollTrigger };
