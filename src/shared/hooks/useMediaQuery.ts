import { useEffect, useState } from 'react';

const isBrowser = typeof globalThis !== 'undefined';

const useMediaQuery = (query: string, defaultState = false): boolean => {
  const getInitialState = () => {
    if (!isBrowser) {
      return defaultState;
    }
    try {
      return globalThis.matchMedia(query).matches;
    } catch {
      return defaultState;
    }
  };

  const [matches, setMatches] = useState<boolean>(getInitialState);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    const mediaQueryList = globalThis.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;
