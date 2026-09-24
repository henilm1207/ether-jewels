import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import MobileNav from './components/layout/MobileNav';
import Home from './pages/Home';
import NewsletterPopup from './components/ui/NewsletterPopup';
import CookieConsent from './components/ui/CookieConsent';
import ErrorBoundary from './components/ui/ErrorBoundary';
import RouteFallback from './components/ui/RouteFallback';
import RequireAdmin from './components/admin/RequireAdmin';

// Route-level code splitting: '/' is the only page most first-time visitors
// hit, so it's the only page component bundled eagerly. Everything else
// (storefront pages + the whole admin panel) used to be imported statically
// here, which meant a first-time visit to the homepage downloaded the admin
// dashboard, product form, etc. before rendering anything. Each of these now
// ships as its own chunk, fetched only when its route is actually visited.
const Collection = lazy(() => import('./pages/Collection'));
const Collections = lazy(() => import('./pages/Collections'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Diamond = lazy(() => import('./pages/Diamond'));
const Contact = lazy(() => import('./pages/Contact'));
const About = lazy(() => import('./pages/About'));
const Search = lazy(() => import('./pages/Search'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const AccountOverview = lazy(() => import('./pages/account/Overview'));
const AccountOrders = lazy(() => import('./pages/account/Orders'));
const AccountOrderDetail = lazy(() => import('./pages/account/OrderDetail'));
const AccountAddresses = lazy(() => import('./pages/account/Addresses'));
const AccountProfile = lazy(() => import('./pages/account/ProfileDetails'));
const AccountPreferences = lazy(() => import('./pages/account/Preferences'));
const AccountSecurity = lazy(() => import('./pages/account/Security'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ReturnPolicy = lazy(() => import('./pages/ReturnPolicy'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const Faqs = lazy(() => import('./pages/Faqs'));
const RingSizeGuide = lazy(() => import('./pages/RingSizeGuide'));
const NotFound = lazy(() => import('./pages/NotFound'));
// RequireAdmin is imported statically above (not lazy): it's a thin guard
// that's always needed on /admin/*, and nesting it as a *second* lazy
// component around the lazy AdminLayout would serialize their chunk
// fetches (a lazy parent must resolve before React starts loading a lazy
// child) instead of AdminLayout's chunk loading as soon as /admin renders.
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminProductForm = lazy(() => import('./pages/admin/ProductForm'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminInquiries = lazy(() => import('./pages/admin/Inquiries'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminPricing = lazy(() => import('./pages/admin/Pricing'));

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
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
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
      '/account/orders': 'My Orders — EtherStar Jewels',
      '/account/addresses': 'Saved Addresses — EtherStar Jewels',
      '/account/profile': 'Personal Details — EtherStar Jewels',
      '/account/preferences': 'Preferences — EtherStar Jewels',
      '/account/security': 'Login & Security — EtherStar Jewels',
      '/pages/ring-size-guide': 'Ring Size Guide — EtherStar Jewels',
      '/admin': 'Admin — EtherStar Jewels',
    };
    document.title = titles[location.pathname] || 'EtherStar Jewels';
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id" element={<AdminProductForm />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
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
              <Route path="/pages/ring-size-guide" element={<RingSizeGuide />} />
              <Route path="/policies/terms-of-service" element={<TermsOfService />} />
              <Route path="/policies/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/search" element={<Search />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountOverview />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="orders/:id" element={<AccountOrderDetail />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="profile" element={<AccountProfile />} />
                <Route path="preferences" element={<AccountPreferences />} />
                <Route path="security" element={<AccountSecurity />} />
                <Route path="wishlist" element={<Wishlist />} />
              </Route>
              <Route path="/account/login" element={<Login />} />
              <Route path="/account/register" element={<Register />} />
              <Route path="/account/forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
