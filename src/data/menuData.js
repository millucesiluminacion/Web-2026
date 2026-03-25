
export const MENU_DATA = {
    "INTERIOR": [
        { name: "Iluminación para Interiores", type: "header" },
        { name: "Downlight LED", link: "/catalogo?q=downlight" },
        { name: "Plafones LED", link: "/catalogo?q=plafones" },
        { name: "Paneles LED", link: "/catalogo?q=paneles", tag: "%" },
        { name: "Tiras LED", link: "/catalogo?q=tiras" },
        { name: "Focos LED Carril", link: "/catalogo?q=focos-carril" },
        { name: "Barras Lineales LED", link: "/catalogo?q=barras-lineales" },
        { name: "Iluminación Comercial", link: "/catalogo?q=iluminacion-comercial" },
        { name: "Domótica", link: "/catalogo?q=domotica" },
        { name: "Ventiladores de Techo", link: "/catalogo?q=ventiladores", tag: "%" },
        { name: "Lámparas y Decoración LED", link: "/catalogo?q=lamparas" },
        { name: "Balizas LED Interior", link: "/catalogo?q=balizas-interior" },
        { name: "Apliques LED Interior", link: "/catalogo?q=apliques-interior" },
        { name: "Iluminación LED Industrial", link: "/catalogo?q=industrial", tag: "%" },
        { name: "Ver todo en Interior", link: "/catalogo?q=interior", type: "link" }
    ],
    "EXTERIOR": [
        { name: "Iluminación para Exteriores", type: "header" },
        { name: "Proyectores LED Exterior", link: "/catalogo?q=proyectores-exterior" },
        { name: "Balizas LED Exterior", link: "/catalogo?q=balizas-exterior" },
        { name: "Apliques LED de Exterior", link: "/catalogo?q=apliques-exterior" },
        { name: "Pantallas Estancas LED", link: "/catalogo?q=pantallas-estancas" },
        { name: "Tiras LED Exterior", link: "/catalogo?q=tiras-exterior" },
        { name: "Alumbrado Público LED", link: "/catalogo?q=alumbrado-publico" },
        { name: "Iluminación para Piscinas", link: "/catalogo?q=piscinas", tag: "%" },
        { name: "Lámparas de exterior", link: "/catalogo?q=lamparas-exterior" },
        { name: "Plafones de Exterior", link: "/catalogo?q=plafones-exterior" },
        { name: "Guirnaldas Decorativas", link: "/catalogo?q=guirnaldas" },
        { name: "Muebles LED para Exterior", link: "/catalogo?q=muebles-exterior" },
        { name: "Iluminación Solar LED", link: "/catalogo?q=solar" },
        { name: "Ver todo en Exterior", link: "/catalogo?q=exterior", type: "link" }
    ],
    "ILUMINACIÓN PROFESIONAL": [
        { name: "Iluminación Profesional", type: "header" },
        { name: "Campanas Industriales", link: "/catalogo?q=campanas" },
        { name: "Proyectores LED Exterior", link: "/catalogo?q=proyectores-profesional" },
        { name: "Iluminación LED Comercial", link: "/catalogo?q=comercial" },
        { name: "Iluminación LED Industrial", link: "/catalogo?q=industrial", tag: "%" },
        { name: "Paneles LED", link: "/catalogo?q=paneles-profesional", tag: "%" },
        { name: "Alumbrado Público LED", link: "/catalogo?q=publico", tag: "%" },
        { name: "Iluminación Deportiva", link: "/catalogo?q=deportiva" },
        { name: "Luces de Emergencia LED", link: "/catalogo?q=emergencia" },
        { name: "Iluminación Eventos", link: "/catalogo?q=eventos" },
        { name: "Instalación Solar Fotovoltaica", link: "/catalogo?q=fotovoltaica" }
    ],
    "TIRAS LED": [
        { name: "Tiras LED", type: "header" },
        { name: "Tiras LED 220V-240V AC", link: "/catalogo?q=tiras-220v" },
        { name: "Tiras LED Baja Tensión (DC)", link: "/catalogo?q=tiras-dc" }
    ],
    "FOCOS LED CARRIL": [
        { name: "Focos LED Carril", type: "header" },
        { name: "Focos Monofásicos", link: "/catalogo?q=focos-monofasicos" },
        { name: "Focos Trifásicos", link: "/catalogo?q=focos-trifasicos" },
        { name: "Carriles y Accesorios", link: "/catalogo?q=carriles" }
    ],
    "BOMBILLAS Y TUBOS": [
        { name: "Bombillas por casquillo", type: "header" },
        { name: "Bombillas LED GU10", link: "/catalogo?q=gu10", image: "https://cdn1.efectoled.com/img/core/global/lighting/menu/menu_category_17.png" },
        { name: "Bombillas LED E27", link: "/catalogo?q=e27", image: "https://cdn1.efectoled.com/img/core/global/lighting/menu/menu_category_16.png" },
        { name: "Bombillas LED E14", link: "/catalogo?q=e14", image: "https://cdn1.efectoled.com/img/core/global/lighting/menu/menu_category_41.png" },
        { name: "Tubos LED T8", link: "/catalogo?q=tubos-t8" },
        { name: "Ver todas las Bombillas", link: "/catalogo?q=bombillas", type: "link" }
    ],
    "MECANISMOS ELÉCTRICOS": [
        { name: "Mecanismos Eléctricos", type: "header" },
        { name: "Mecanismos Empotrables", link: "/catalogo?q=mecanismos-empotrables", tag: "%" },
        { name: "Mecanismos de Superficie", link: "/catalogo?q=mecanismos-superficie" },
        { name: "Interruptores", link: "/catalogo?q=interruptores" },
        { name: "Enchufes", link: "/catalogo?q=enchufes" }
    ],
    "MARCAS": [
        { name: "Nuestras Marcas", type: "header" },
        { name: "Philips", link: "/catalogo?q=philips" },
        { name: "Osram", link: "/catalogo?q=osram" },
        { name: "V-TAC", link: "/catalogo?q=v-tac" }
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
    { name: "Novedades", key: "Novedades", customLink: "/catalogo?q=novedades" },
    { name: "Ofertas", key: "Ofertas", customLink: "/catalogo?q=ofertas", style: { color: "rgb(36, 36, 40)" } }
];
