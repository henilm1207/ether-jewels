import { useState, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import MobileNav from './components/layout/MobileNav';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Collections from './pages/Collections';
import ProductDetail from './pages/ProductDetail';
import Diamond from './pages/Diamond';
import Contact from './pages/Contact';
import About from './pages/About';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import Faqs from './pages/Faqs';
import NotFound from './pages/NotFound';
import RequireAdmin from './components/admin/RequireAdmin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminProductForm from './pages/admin/ProductForm';
import AdminOrders from './pages/admin/Orders';
import AdminCoupons from './pages/admin/Coupons';
import AdminReviews from './pages/admin/Reviews';
import AdminInquiries from './pages/admin/Inquiries';
import AdminCategories from './pages/admin/Categories';
import AdminPricing from './pages/admin/Pricing';
import NewsletterPopup from './components/ui/NewsletterPopup';
import CookieConsent from './components/ui/CookieConsent';
import ErrorBoundary from './components/ui/ErrorBoundary';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function StorefrontLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const hideFooter =
    location.pathname === '/account/login' ||
    location.pathname === '/account/register' ||
    location.pathname === '/account/forgot-password';

  useEffect(() => {
    if (cartOpen || mobileNavOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, mobileNavOpen, searchOpen]);

  return (
    <div className="min-h-screen flex flex-col no-copy">
      <Header
        onCartClick={() => setCartOpen(true)}
        onMenuClick={() => setMobileNavOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        onSearchClose={() => setSearchOpen(false)}
        onSearchClick={() => setSearchOpen((v) => !v)}
        searchOpen={searchOpen}
      />

      <main className={`flex-1${isHome ? '' : ' page-offset'}`}>
        <Outlet />
      </main>

      {!hideFooter && <Footer />}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <NewsletterPopup />
      <CookieConsent />
    </div>
  );
}

function App() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'EtherStar Jewels — Lab-Grown Diamond Jewelry',
      '/search': 'Search — EtherStar Jewels',
      '/cart': 'Your Cart — EtherStar Jewels',
      '/account/wishlist': 'Your Wishlist — EtherStar Jewels',
      '/account': 'My Account — EtherStar Jewels',
      '/admin': 'Admin — EtherStar Jewels',
    };
    document.title = titles[location.pathname] || 'EtherStar Jewels';
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Routes>
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id" element={<AdminProductForm />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="pricing" element={<AdminPricing />} />
          </Route>

          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/collections" element={<Collections />} />
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
            <Route path="/account/wishlist" element={<Wishlist />} />
            <Route path="/account" element={<Profile />} />
            <Route path="/account/login" element={<Login />} />
            <Route path="/account/register" element={<Register />} />
            <Route path="/account/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;
