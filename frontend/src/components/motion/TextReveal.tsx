import { useLineMaskReveal } from '../../hooks/useGsapReveal';

interface TextRevealProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span';
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  scrub?: boolean;
}

/** Editorial line-mask headline reveal (SplitType + ScrollTrigger). */
const TextReveal: React.FC<TextRevealProps> = ({
  children,
  as: Tag = 'div',
  className,
  style,
  delay = 0,
  scrub = false,
}) => {
  const ref = useLineMaskReveal<HTMLDivElement>({ delay, scrub });
  const Component = Tag as any;
  return (
    <Component ref={ref} className={className} style={style}>
      {children}
    </Component>
  );
};

export default TextReveal;
