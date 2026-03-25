import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ProductListing from './pages/ProductListing';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AdminLayout } from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ProductList from './pages/admin/ProductList';
import DecoracionPage from './pages/DecoracionPage';
import OfertasPage from './pages/OfertasPage';
import BlogPage from './pages/BlogPage';
import BlogPostDetail from './pages/BlogPostDetail';
import ProyectosPage from './pages/ProyectosPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import ContactPage from './pages/ContactPage';
import BrandsPage from './pages/BrandsPage';
import RoomsPage from './pages/RoomsPage';
import { CartProvider } from './context/CartContext';
import CategoriesList from './pages/admin/CategoriesList';
import OrdersList from './pages/admin/OrdersList';
import CustomersList from './pages/admin/CustomersList';
import BrandsList from './pages/admin/BrandsList';
import WhyChooseUsAdmin from './pages/admin/WhyChooseUsAdmin';
import AccountSettings from './pages/admin/AccountSettings';
import OffersAdmin from './pages/admin/OffersAdmin';
import RoomsList from './pages/admin/RoomsList';
import SliderList from './pages/admin/SliderList';
import BlogAdmin from './pages/admin/BlogAdmin';
import ProjectsAdmin from './pages/admin/ProjectsAdmin';
import ReviewsAdmin from './pages/admin/ReviewsAdmin';
import BadgesAdmin from './pages/admin/BadgesAdmin';
import NewsletterAdmin from './pages/admin/NewsletterAdmin';


import PaymentSettings from './pages/admin/PaymentSettings';
import UsersAdmin from './pages/admin/UsersAdmin';
import ProfessionalsAdmin from './pages/admin/ProfessionalsAdmin';
import ProfessionsAdmin from './pages/admin/ProfessionsAdmin';
import CategoriesAdmin from './pages/admin/CategoriesAdmin';
import SEOAdmin from './pages/admin/SEOAdmin';
import TrustBadgesAdmin from './pages/admin/TrustBadgesAdmin';
import PagesAdmin from './pages/admin/PagesAdmin';
import CMSPage from './pages/CMSPage';
import CookieBanner from './components/common/CookieBanner';
import SEOManager from './components/common/SEOManager';

import { AuthProvider } from './context/AuthContext';
import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <SEOManager />
          <CookieBanner />
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="catalogo" element={<ProductListing />} />
              <Route path="search" element={<Navigate to="/catalogo" replace />} />
              <Route path="product/:slug" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />

              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="register-pro" element={<RegisterPage isPro={true} />} />
              <Route path="decoracion" element={<DecoracionPage />} />
              <Route path="ofertas" element={<OfertasPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/:slug" element={<BlogPostDetail />} />
              <Route path="proyectos" element={<ProyectosPage />} />
              <Route path="profesionales" element={<ProfessionalsPage />} />
              <Route path="contacto" element={<ContactPage />} />
              <Route path="marcas" element={<BrandsPage />} />
              <Route path="estancias" element={<RoomsPage />} />
              <Route path=":slug" element={<CMSPage />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductList />} />
              <Route path="categories" element={<CategoriesAdmin />} />
              <Route path="orders" element={<OrdersList />} />
              <Route path="customers" element={<CustomersList />} />
              <Route path="brands" element={<BrandsList />} />
              <Route path="why-us" element={<WhyChooseUsAdmin />} />
              <Route path="settings" element={<AccountSettings />} />
              <Route path="offers" element={<OffersAdmin />} />
              <Route path="rooms" element={<RoomsList />} />
              <Route path="sliders" element={<SliderList />} />
              <Route path="blog" element={<BlogAdmin />} />
              <Route path="projects" element={<ProjectsAdmin />} />
              <Route path="payments" element={<PaymentSettings />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="professionals" element={<ProfessionalsAdmin />} />
              <Route path="professions" element={<ProfessionsAdmin />} />
              <Route path="seo" element={<SEOAdmin />} />
              <Route path="pages" element={<PagesAdmin />} />
              <Route path="trust-badges" element={<TrustBadgesAdmin />} />
              <Route path="reviews" element={<ReviewsAdmin />} />
              <Route path="badges" element={<BadgesAdmin />} />
              <Route path="newsletter" element={<NewsletterAdmin />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
