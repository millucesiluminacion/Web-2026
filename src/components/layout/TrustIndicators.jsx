import { ShieldCheck, CreditCard, Phone, MapPin } from 'lucide-react';

export function TrustIndicators() {
    return (
        <div className="bg-neutral-800 border-b border-neutral-700 py-6">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="flex items-center justify-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                        <h4 className="text-white font-bold">Garantía 3 Años</h4>
                        <p className="text-xs">En todos los productos</p>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <CreditCard className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                        <h4 className="text-white font-bold">Pago Seguro</h4>
                        <p className="text-xs">100% encriptado SSL</p>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <Phone className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                        <h4 className="text-white font-bold">Atención Técnica</h4>
                        <p className="text-xs">Expertos a tu servicio</p>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <MapPin className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                        <h4 className="text-white font-bold">Envío 24h</h4>
                        <p className="text-xs">Pedidos antes de las 16h</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
