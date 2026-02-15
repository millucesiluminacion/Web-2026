
export const MENU_DATA = {
    "INTERIOR": [
        { name: "Iluminación para Interiores", type: "header" },
        { name: "Downlight LED", link: "/search?q=downlight" },
        { name: "Plafones LED", link: "/search?q=plafones" },
        { name: "Paneles LED", link: "/search?q=paneles", tag: "%" },
        { name: "Tiras LED", link: "/search?q=tiras" },
        { name: "Focos LED Carril", link: "/search?q=focos-carril" },
        { name: "Barras Lineales LED", link: "/search?q=barras-lineales" },
        { name: "Iluminación Comercial", link: "/search?q=iluminacion-comercial" },
        { name: "Domótica", link: "/search?q=domotica" },
        { name: "Ventiladores de Techo", link: "/search?q=ventiladores", tag: "%" },
        { name: "Lámparas y Decoración LED", link: "/search?q=lamparas" },
        { name: "Balizas LED Interior", link: "/search?q=balizas-interior" },
        { name: "Apliques LED Interior", link: "/search?q=apliques-interior" },
        { name: "Iluminación LED Industrial", link: "/search?q=industrial", tag: "%" },
        { name: "Ver todo en Interior", link: "/search?q=interior", type: "link" }
    ],
    "EXTERIOR": [
        { name: "Iluminación para Exteriores", type: "header" },
        { name: "Proyectores LED Exterior", link: "/search?q=proyectores-exterior" },
        { name: "Balizas LED Exterior", link: "/search?q=balizas-exterior" },
        { name: "Apliques LED de Exterior", link: "/search?q=apliques-exterior" },
        { name: "Pantallas Estancas LED", link: "/search?q=pantallas-estancas" },
        { name: "Tiras LED Exterior", link: "/search?q=tiras-exterior" },
        { name: "Alumbrado Público LED", link: "/search?q=alumbrado-publico" },
        { name: "Iluminación para Piscinas", link: "/search?q=piscinas", tag: "%" },
        { name: "Lámparas de exterior", link: "/search?q=lamparas-exterior" },
        { name: "Plafones de Exterior", link: "/search?q=plafones-exterior" },
        { name: "Guirnaldas Decorativas", link: "/search?q=guirnaldas" },
        { name: "Muebles LED para Exterior", link: "/search?q=muebles-exterior" },
        { name: "Iluminación Solar LED", link: "/search?q=solar" },
        { name: "Ver todo en Exterior", link: "/search?q=exterior", type: "link" }
    ],
    "ILUMINACIÓN PROFESIONAL": [
        { name: "Iluminación Profesional", type: "header" },
        { name: "Campanas Industriales", link: "/search?q=campanas" },
        { name: "Proyectores LED Exterior", link: "/search?q=proyectores-profesional" },
        { name: "Iluminación LED Comercial", link: "/search?q=comercial" },
        { name: "Iluminación LED Industrial", link: "/search?q=industrial", tag: "%" },
        { name: "Paneles LED", link: "/search?q=paneles-profesional", tag: "%" },
        { name: "Alumbrado Público LED", link: "/search?q=publico", tag: "%" },
        { name: "Iluminación Deportiva", link: "/search?q=deportiva" },
        { name: "Luces de Emergencia LED", link: "/search?q=emergencia" },
        { name: "Iluminación Eventos", link: "/search?q=eventos" },
        { name: "Instalación Solar Fotovoltaica", link: "/search?q=fotovoltaica" }
    ],
    "TIRAS LED": [
        { name: "Tiras LED", type: "header" },
        { name: "Tiras LED 220V-240V AC", link: "/search?q=tiras-220v" },
        { name: "Tiras LED Baja Tensión (DC)", link: "/search?q=tiras-dc" }
    ],
    "FOCOS LED CARRIL": [
        { name: "Focos LED Carril", type: "header" },
        { name: "Focos Monofásicos", link: "/search?q=focos-monofasicos" },
        { name: "Focos Trifásicos", link: "/search?q=focos-trifasicos" },
        { name: "Carriles y Accesorios", link: "/search?q=carriles" }
    ],
    "BOMBILLAS Y TUBOS": [
        { name: "Bombillas por casquillo", type: "header" },
        { name: "Bombillas LED GU10", link: "/search?q=gu10", image: "https://cdn1.efectoled.com/img/core/global/lighting/menu/menu_category_17.png" },
        { name: "Bombillas LED E27", link: "/search?q=e27", image: "https://cdn1.efectoled.com/img/core/global/lighting/menu/menu_category_16.png" },
        { name: "Bombillas LED E14", link: "/search?q=e14", image: "https://cdn1.efectoled.com/img/core/global/lighting/menu/menu_category_41.png" },
        { name: "Tubos LED T8", link: "/search?q=tubos-t8" },
        { name: "Ver todas las Bombillas", link: "/search?q=bombillas", type: "link" }
    ],
    "MECANISMOS ELÉCTRICOS": [
        { name: "Mecanismos Eléctricos", type: "header" },
        { name: "Mecanismos Empotrables", link: "/search?q=mecanismos-empotrables", tag: "%" },
        { name: "Mecanismos de Superficie", link: "/search?q=mecanismos-superficie" },
        { name: "Interruptores", link: "/search?q=interruptores" },
        { name: "Enchufes", link: "/search?q=enchufes" }
    ],
    "MARCAS": [
        { name: "Nuestras Marcas", type: "header" },
        { name: "Philips", link: "/search?q=philips" },
        { name: "Osram", link: "/search?q=osram" },
        { name: "V-TAC", link: "/search?q=v-tac" }
    ]
};

export const MENU_ROOT_LINKS = [
    { name: "INTERIOR", key: "INTERIOR" },
    { name: "EXTERIOR", key: "EXTERIOR" },
    { name: "ILUMINACIÓN PROFESIONAL", key: "ILUMINACIÓN PROFESIONAL" },
    { name: "TIRAS LED", key: "TIRAS LED", isHighlight: false },
    { name: "FOCOS LED CARRIL", key: "FOCOS LED CARRIL" },
    { name: "BOMBILLAS Y TUBOS", key: "BOMBILLAS Y TUBOS" },
    { name: "MECANISMOS ELÉCTRICOS", key: "MECANISMOS ELÉCTRICOS" },
    { name: "MARCAS", key: "MARCAS" },
    { name: "Novedades", key: "Novedades", customLink: "/search?q=novedades" },
    { name: "Ofertas", key: "Ofertas", customLink: "/search?q=ofertas", style: { color: "rgb(36, 36, 40)" } }
];
