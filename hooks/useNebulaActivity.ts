import { useState, useCallback, useRef, useEffect } from 'react';

export interface FocalPoint {
  x: number;
  y: number;
}

export const useNebulaActivity = () => {
  const [isActive, setIsActive] = useState(false);
  const [focalPoint, setFocalPoint] = useState<FocalPoint>({ x: 0.5, y: 0.5 });
  const timeoutRef = useRef<number | null>(null);

  const startActivity = useCallback(() => {
    // Pick a random star to "aim" for (focal point of zoom)
    setFocalPoint({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8
    });
    setIsActive(true);
  }, []);

  const stopActivity = useCallback(() => {
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    isActive,
    focalPoint,
    startActivity,
    stopActivity
  };
};