import React from 'react';

const DecoracionPage = () => {
    return (
        <div className="container mx-auto px-4 py-10">
            <h1 className="text-3xl font-black uppercase mb-8">Iluminación Decorativa</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Mock Category Cards */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                    <img src="https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-111_desktop.png" alt="Lámparas" className="w-full h-48 object-contain p-4 group-hover:scale-105 transition-transform" />
                    <div className="p-4 bg-gray-50 text-center">
                        <span className="font-bold uppercase text-sm">Lámparas de Diseño</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                    <img src="https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-10_desktop.png" alt="Tiras LED" className="w-full h-48 object-contain p-4 group-hover:scale-105 transition-transform" />
                    <div className="p-4 bg-gray-50 text-center">
                        <span className="font-bold uppercase text-sm">Tiras LED Decorativas</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                    <img src="https://www.efectoled.com/img/core/global/lighting/2024/home/categories/category_img-9_desktop.png" alt="Guirnaldas" className="w-full h-48 object-contain p-4 group-hover:scale-105 transition-transform" />
                    <div className="p-4 bg-gray-50 text-center">
                        <span className="font-bold uppercase text-sm">Guirnaldas y Eventos</span>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <p className="text-gray-600 leading-relaxed">
                    Transforma tus espacios con nuestra selección de iluminación decorativa. Desde elegantes lámparas de techo hasta versátiles tiras LED, tenemos todo lo que necesitas para crear ambientes únicos y acogedores.
                </p>
            </div>
        </div>
    );
};

export default DecoracionPage;
