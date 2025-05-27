import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform, SpringOptions } from 'framer-motion';
import { cn } from '../../lib/utils'; // Adjust path as necessary

interface SpotlightProps {
  className?: string;
  fill?: string; // Color of the spotlight
  size?: number; // Diameter of the spotlight effect
  springOptions?: SpringOptions;
  opacity?: number; // Opacity of the spotlight
  blurAmount?: string; // e.g., 'blur-xl', 'blur-2xl'
}

export const Spotlight: React.FC<SpotlightProps> = ({
  className,
  fill = 'white', // Default to white, can be themed
  size = 400, // Default size
  springOptions = { stiffness: 100, damping: 20, restDelta: 0.001 }, // Adjusted spring for smoother feel
  opacity = 0.3, // Default opacity
  blurAmount = 'blur-2xl', // Default blur
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);

  // Initialize springs with a slight delay or when parentElement is ready to avoid initial jump
  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  useEffect(() => {
    if (parentElement) {
      // Set initial position to center of parent to avoid jump on first mouse enter
      mouseX.set(parentElement.offsetWidth / 2);
      mouseY.set(parentElement.offsetHeight / 2);
    }
  }, [parentElement, mouseX, mouseY]);


  const spotlightLeft = useTransform(mouseX, (x) => `${x - size / 2}px`);
  const spotlightTop = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        // Ensure parent can contain an absolutely positioned child
        if (getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }
        parent.style.overflow = 'hidden'; // Important to contain the blur
        setParentElement(parent);
      }
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!parentElement) return;
      const { left, top } = parentElement.getBoundingClientRect();
      mouseX.set(event.clientX - left);
      mouseY.set(event.clientY - top);
    },
    [mouseX, mouseY, parentElement]
  );

  useEffect(() => {
    if (!parentElement) return;

    const onMouseEnter = () => setIsHovered(true);
    const onMouseLeave = () => setIsHovered(false);

    parentElement.addEventListener('mousemove', handleMouseMove);
    parentElement.addEventListener('mouseenter', onMouseEnter);
    parentElement.addEventListener('mouseleave', onMouseLeave);

    return () => {
      parentElement.removeEventListener('mousemove', handleMouseMove);
      parentElement.removeEventListener('mouseenter', onMouseEnter);
      parentElement.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [parentElement, handleMouseMove]);

  // Construct the radial gradient using the fill color
  const gradientStyle = {
    backgroundImage: `radial-gradient(circle at center, ${fill} 0%, transparent 70%)`,
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'pointer-events-none absolute rounded-full transition-opacity duration-300',
        blurAmount, // e.g., 'blur-xl', 'blur-2xl'
        className
      )}
      style={{
        width: size,
        height: size,
        left: spotlightLeft,
        top: spotlightTop,
        opacity: isHovered ? opacity : 0,
        ...gradientStyle,
      }}
    />
  );
};

export default Spotlight;
