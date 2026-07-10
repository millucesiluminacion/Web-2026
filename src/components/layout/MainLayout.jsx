import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBanner } from './TopBanner';
import { Header } from './Header';
import { Footer } from './Footer';
import { AuthModal } from '../auth/AuthModal';
import { useAuth } from '../../context/AuthContext';

export function MainLayout() {
    const { userTier } = useAuth();
    const [authModal, setAuthModal] = useState({ open: false, tab: 'login', type: 'persona' });

    const openAuthModal = (tab = 'login', type = 'persona') => {
        setAuthModal({ open: true, tab, type });
    };
    const closeAuthModal = () => setAuthModal({ open: false, tab: 'login', type: 'persona' });

    // Dynamic theme class
    const themeClass = userTier === 'vip' ? 'theme-socio' : userTier === 'pro' ? 'theme-pro' : '';

    return (
        <div className={`flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans overflow-x-hidden ${themeClass}`}>
            <div className="fixed top-0 left-0 right-0 z-50">
                <TopBanner onOpenAuthModal={openAuthModal} />
                <Header onOpenAuthModal={openAuthModal} />
            </div>
            <main className="flex-grow pt-[110px] sm:pt-[120px] overflow-x-hidden">
                <Outlet />
            </main>
            <Footer />
            <AuthModal
                isOpen={authModal.open}
                onClose={closeAuthModal}
                defaultTab={authModal.tab}
                defaultType={authModal.type}
            />
        </div>
    );

}
