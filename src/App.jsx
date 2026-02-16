import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import ProyectosPage from './pages/ProyectosPage';
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
import Checkout from './pages/Checkout';
import PaymentSettings from './pages/admin/PaymentSettings';
import UsersAdmin from './pages/admin/UsersAdmin';

import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<ProductListing />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="register-pro" element={<RegisterPage isPro={true} />} />
              <Route path="decoracion" element={<DecoracionPage />} />
              <Route path="ofertas" element={<OfertasPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="proyectos" element={<ProyectosPage />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductList />} />
              <Route path="categories" element={<CategoriesList />} />
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
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
