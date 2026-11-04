import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  /** Decimals to show (the value itself is never rounded here). */
  decimals?: number;
  /** Prefix positive values with "+". */
  signed?: boolean;
  /** Tick from the previous value to the new one. When false the number just changes. */
  animateChanges?: boolean;
  duration?: number;
}

/** A number that counts up or down to its new value, used for Elo after a saved round. */
export function AnimatedNumber({ value, decimals = 0, signed = false, animateChanges = false, duration = 0.9 }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;
    if (!animateChanges || reduceMotion) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        displayRef.current = v;
        setDisplay(v);
      },
      onComplete: () => {
        displayRef.current = value;
        setDisplay(value);
      },
    });
    return () => controls.stop();
  }, [value, animateChanges, reduceMotion, duration]);

  const rounded = Number(display.toFixed(decimals));
  const text = rounded.toFixed(decimals);
  return <>{signed && rounded > 0 ? `+${text}` : text}</>;
}
