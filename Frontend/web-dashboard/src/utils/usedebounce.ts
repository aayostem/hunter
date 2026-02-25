import { useState, useEffect, useRef } from 'react';

/**
 * A hook that delays updating a value until after a specified delay has passed.
 * Optimized to avoid cascading renders on the initial mount.
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  // Use a Ref instead of State to track the first render.
  // This prevents the "setState synchronously within an effect" warning.
  const isFirstRender = useRef(true);

  useEffect(() => {
    // If it's the first render, update the ref and skip the timer logic.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Set up the timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes (or component unmounts)
    // This is what prevents the value from updating if the user is still typing.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;