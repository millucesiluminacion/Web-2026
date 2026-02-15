import { Outlet } from 'react-router-dom';
import { TopBanner } from './TopBanner';
import { Header } from './Header';
import { Footer } from './Footer';

export function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
            <div className="fixed top-0 left-0 right-0 z-50">
                <TopBanner />
                <Header />
            </div>
            <main className="flex-grow pt-[120px]">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
