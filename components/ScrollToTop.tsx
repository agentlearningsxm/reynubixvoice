import { memo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const location = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on pathname change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
};

export default memo(ScrollToTop);
