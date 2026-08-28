import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

interface RevealProps {
  as?: ElementType;
  className?: string;
  delayMs?: number;
  children?: ReactNode;
  [key: string]: unknown;
}

// Reveal плавно проявляет блок (fade + лёгкий сдвиг) при попадании во вьюпорт.
// Под prefers-reduced-motion и в среде без IntersectionObserver блок виден сразу.
export function Reveal({ as = "div", className = "", delayMs = 0, children, ...rest }: RevealProps) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof IntersectionObserver === "undefined" || reducedMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style = delayMs ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <Tag {...rest} ref={ref} className={`reveal${visible ? " is-visible" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
