import { useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

const useMediaQuery = (query: string, defaultState = false): boolean => {
  const getInitialState = () => {
    if (!isBrowser) {
      return defaultState;
    }
    try {
      return window.matchMedia(query).matches;
    } catch {
      return defaultState;
    }
  };

  const [matches, setMatches] = useState<boolean>(getInitialState);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Sync state in case the query changed after mount.
    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;
