import { useParallax } from '../../hooks/useGsapReveal';

interface ParallaxImageProps {
  children: React.ReactNode;
  yPercent?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Editorial parallax wrapper — child content drifts against scroll inside parent. */
const ParallaxImage: React.FC<ParallaxImageProps> = ({
  children,
  yPercent = 14,
  className,
  style,
}) => {
  const ref = useParallax<HTMLDivElement>({ yPercent });
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}>
      {children}
    </div>
  );
};

export default ParallaxImage;
