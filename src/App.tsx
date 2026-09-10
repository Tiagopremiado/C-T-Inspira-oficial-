import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage.js';
import { ComandoGeral } from './components/ComandoGeral.js';
import { FichaCompleta } from './components/FichaCompleta.js';

type Route = 'landing' | 'comando' | 'ficha-completa';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('comando')) return 'comando';
    if (path.includes('ficha-completa')) return 'ficha-completa';
    return 'landing';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('comando')) {
        setCurrentRoute('comando');
      } else if (path.includes('ficha-completa')) {
        setCurrentRoute('ficha-completa');
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    let targetPath = '/';
    let targetRoute: Route = 'landing';

    if (route === 'comando' || route.includes('comando')) {
      targetPath = '/comando';
      targetRoute = 'comando';
    } else if (route === 'ficha-completa' || route.includes('ficha-completa')) {
      targetPath = '/ficha-completa';
      targetRoute = 'ficha-completa';
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentRoute(targetRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-[#061018]">
      {currentRoute === 'comando' && <ComandoGeral onNavigate={navigate} />}
      {currentRoute === 'ficha-completa' && <FichaCompleta onNavigate={navigate} />}
      {currentRoute === 'landing' && <LandingPage onNavigate={navigate} />}
    </div>
  );
}
