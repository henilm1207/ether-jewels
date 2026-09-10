import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import MobileNav from './components/layout/MobileNav';
import Home from './pages/Home';
import Collection from './pages/Collection';
import ProductDetail from './pages/ProductDetail';
import Diamond from './pages/Diamond';
import Contact from './pages/Contact';
import About from './pages/About';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Login from './pages/Login';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import Faqs from './pages/Faqs';
import NewsletterPopup from './components/ui/NewsletterPopup';
import AgeVerifier from './components/ui/AgeVerifier';
import CookieConsent from './components/ui/CookieConsent';

function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (cartOpen || mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, mobileNavOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onCartClick={() => setCartOpen(true)}
        onMenuClick={() => setMobileNavOpen(true)}
        onSearchClick={() => setSearchOpen(!searchOpen)}
        searchOpen={searchOpen}
      />

      <main className={`flex-1${isHome ? '' : ' page-offset'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections/:category" element={<Collection />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/pages/diamond" element={<Diamond />} />
          <Route path="/pages/contact" element={<Contact />} />
          <Route path="/pages/about-us" element={<About />} />
          <Route path="/pages/return-policy" element={<ReturnPolicy />} />
          <Route path="/pages/shipping-and-deliveries" element={<ShippingPolicy />} />
          <Route path="/pages/faqs" element={<Faqs />} />
          <Route path="/policies/terms-of-service" element={<TermsOfService />} />
          <Route path="/policies/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/account/login" element={<Login />} />
        </Routes>
      </main>

      <Footer />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <NewsletterPopup />
      <AgeVerifier />
      <CookieConsent />
    </div>
  );
}

export default App;
