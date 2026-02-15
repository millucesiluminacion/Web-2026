import { TrustIndicators } from './TrustIndicators';
import { MainFooterLinks } from './MainFooterLinks';
import { FooterBottom } from './FooterBottom';

export function Footer() {
    return (
        <footer className="bg-neutral-900 text-gray-400 text-sm font-sans">
            <TrustIndicators />
            <MainFooterLinks />
            <FooterBottom />
        </footer>
    );
}
