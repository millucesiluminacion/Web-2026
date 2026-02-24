import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBanner } from './TopBanner';
import { Header } from './Header';
import { Footer } from './Footer';
import { AuthModal } from '../auth/AuthModal';

export function MainLayout() {
    const [authModal, setAuthModal] = useState({ open: false, tab: 'login', type: 'persona' });

    const openAuthModal = (tab = 'login', type = 'persona') => {
        setAuthModal({ open: true, tab, type });
    };
    const closeAuthModal = () => setAuthModal({ open: false, tab: 'login', type: 'persona' });

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
            <div className="fixed top-0 left-0 right-0 z-50">
                <TopBanner onOpenAuthModal={openAuthModal} />
                <Header onOpenAuthModal={openAuthModal} />
            </div>
            <main className="flex-grow pt-[120px]">
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
