import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top on route changes (BrowserRouter has no built-in scroll restoration); keeps #hash links working. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname, hash]);
  return null;
}
