import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error('Faltan credenciales de Supabase en .env');
    process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const roomsSEO = [
    {
        slug: 'salon-comedor',
        meta_title: 'Iluminación para Salón y Comedor | Lámparas de Diseño | Mil Luces',
        meta_description: 'Transforma tu salón y comedor con iluminación LED acogedora. Lámparas colgantes, focos empotrables y tiras de diseño. Asesoría y envíos en 24/48h.',
        focus_keywords: 'iluminacion salon, lamparas salon comedor, luces comedor led, iluminacion calida salon'
    },
    {
        slug: 'cocina',
        meta_title: 'Iluminación LED para Cocinas Modernas y Prácticas | Mil Luces',
        meta_description: 'Encuentra la mejor iluminación LED para tu cocina: paneles de alta potencia, perfiles bajo mueble y focos neutros antideslumbrantes. Calidad garantizada.',
        focus_keywords: 'iluminacion cocina, luces led cocina bajo mueble, paneles led cocina, focos techo cocina'
    },
    {
        slug: 'bano',
        meta_title: 'Iluminación para Baños con Protección IP44 e IP65 | Mil Luces',
        meta_description: 'Apliques para espejos, aros empotrables y downlights estancos para zonas húmedas del baño. Luz óptima y máxima seguridad. Compra online en Mil Luces.',
        focus_keywords: 'iluminacion bano, apliques espejo bano, focos bano ip65, luces led bano modernas'
    },
    {
        slug: 'dormitorio',
        meta_title: 'Iluminación para Dormitorios | Luz Relajante y Cálida | Mil Luces',
        meta_description: 'Crea una atmósfera de descanso perfecta en tu dormitorio con lámparas de noche, focos regulables y tiras LED decorativas. Descubre nuestras ofertas.',
        focus_keywords: 'iluminacion dormitorio, lamparas mesita de noche, luces led habitacion, iluminacion relajante'
    },
    {
        slug: 'pasillos',
        meta_title: 'Iluminación LED para Pasillos y Zonas de Paso | Mil Luces',
        meta_description: 'Focos empotrables, balizas de señalización y apliques para pasillos largos y distribuidores. Aumenta la amplitud y el confort visual de tu hogar.',
        focus_keywords: 'iluminacion pasillos, luces led pasillo, focos empotrados pasillo, apliques de pared paso'
    },
    {
        slug: 'Garaje',
        meta_title: 'Iluminación para Garajes y Parkings | Tubos y Campanas LED | Mil Luces',
        meta_description: 'Pantallas estancas, tubos LED T8 y proyectores de alta resistencia para garajes comunitarios y privados. Máxima eficiencia y ahorro energético.',
        focus_keywords: 'iluminacion garaje, pantallas estancas led, luces garaje parking, tubos led garaje'
    },
    {
        slug: 'exterior',
        meta_title: 'Iluminación Exterior para Terrazas y Jardines | Mil Luces',
        meta_description: 'Focos estancos, balizas solares y apliques de pared para jardines y fachadas. Protección contra lluvia IP65 y los mejores precios del mercado.',
        focus_keywords: 'iluminacion exterior, luces terraza jardin, focos exterior led, balizas solares jardin'
    }
];

const categoriesSEO = [
    {
        slug: 'tiras',
        meta_title: 'Tiras LED Profesionales 12V, 24V y 220V | Corte a Medida | Mil Luces',
        meta_description: 'Gran catálogo de tiras LED monocolor, CCT y RGB. Alta densidad lumínica y reproducción cromática CRI>90 para hogares y negocios. Envío rápido.',
        focus_keywords: 'tiras led, comprar tira led, tira led corte a medida, tiras led profesionales'
    },
    {
        slug: 'tiraled12v',
        meta_title: 'Tiras LED 12V Profesionales | Uso Interior y Muebles | Mil Luces',
        meta_description: 'Compra tiras LED de 12V seguras y versátiles para molduras, vitrinas y muebles. Bajo consumo, fácil instalación adhesiva y máxima durabilidad.',
        focus_keywords: 'tira led 12v, tiras de led 12 voltios, tira led para muebles, bobina tira led 12v'
    },
    {
        slug: 'tiraled24v',
        meta_title: 'Tiras LED 24V de Alta Eficiencia para Largas Tiradas | Mil Luces',
        meta_description: 'Tiras LED 24V de grado profesional. Evita caídas de tensión en tiradas largas con luz continua y uniforme. Ideal para proyectos arquitectónicos.',
        focus_keywords: 'tira led 24v, tiras led 24 voltios profesionales, tiras led alta potencia, iluminacion lineal 24v'
    },
    {
        slug: 'tiraled220',
        meta_title: 'Tiras LED 220V para Conexión Directa a Red | Exterior | Mil Luces',
        meta_description: 'Tiras de LED a 220V sin necesidad de transformador voluminoso. Resistentes al agua, aptas para fachadas y perímetros de gran longitud.',
        focus_keywords: 'tira led 220v, tiras led conexion directa, tira led exterior 220v, tira led larga distancia'
    },
    {
        slug: 'transformador12',
        meta_title: 'Transformadores 12V para Tiras LED | Fuentes de Alimentación | Mil Luces',
        meta_description: 'Fuentes de alimentación y transformadores 12V DC con protección contra sobretensiones. Formatos slim, estancos e industriales al mejor precio.',
        focus_keywords: 'transformador 12v, fuente alimentacion 12v tiras led, transformador led 12 voltios, driver 12v'
    },
    {
        slug: 'transformador24v',
        meta_title: 'Transformadores 24V para Tiras LED | Máxima Estabilidad | Mil Luces',
        meta_description: 'Fuentes de alimentación de 24V para instalaciones profesionales. Rendimiento silencioso, sin parpadeos y certificadas para uso continuado.',
        focus_keywords: 'transformador 24v led, fuente alimentacion 24v, transformadores para tiras 24v, driver led 24v'
    },
    {
        slug: 'conversor-ac-dc',
        meta_title: 'Conversores AC a DC para Iluminación LED | Mil Luces',
        meta_description: 'Conversores de corriente alterna a continua de alta precisión para luminarias LED. Asegura la corriente constante en todos tus proyectos.',
        focus_keywords: 'conversor ac dc, convertidor corriente led, conversor voltaje tira led, rectificador ac dc'
    },
    {
        slug: 'mando-controlador',
        meta_title: 'Mandos y Controladores para Tiras LED (RF, WiFi, CCT) | Mil Luces',
        meta_description: 'Regula la intensidad y el color de tus luces LED con mandos a distancia, controladores táctiles y receptores compatibles con app móvil.',
        focus_keywords: 'controlador tira led, mando tira led rgb, dimmer regulador led, receptor tira led cct'
    },
    {
        slug: 'fundas-silicona',
        meta_title: 'Fundas de Silicona IP67 e IP68 para Tiras LED | Mil Luces',
        meta_description: 'Protege tus tiras LED frente al agua, la humedad y el polvo con fundas de silicona flexibles. Fácil montaje para exterior e iluminación sumergible.',
        focus_keywords: 'fundas silicona tira led, perfil silicona led, proteccion tira led estanca, tubo silicona led'
    },
    {
        slug: 'paneles',
        meta_title: 'Paneles LED de Techo para Oficinas y Hogar | Luz Difusa | Mil Luces',
        meta_description: 'Amplia gama de paneles LED en 60x60, 30x120 y formatos redondos. Luz homogénea sin deslumbramiento (UGR<19). Ahorra hasta un 80% de energía.',
        focus_keywords: 'paneles led, panel led techo, placa led oficina, comprar paneles led'
    },
    {
        slug: 'paneles-empotrables',
        meta_title: 'Paneles LED Empotrables para Techo Técnico y Pladur | Mil Luces',
        meta_description: 'Paneles LED empotrables ultrafinos para techos desmontables y placas de yeso. Iluminación limpia, elegante y de bajo consumo para locales y viviendas.',
        focus_keywords: 'paneles led empotrables, panel led pladur, panel led 60x60 empotrar, panel empotrable techo'
    },
    {
        slug: 'paneles-superficie',
        meta_title: 'Paneles LED de Superficie | Instalación sin Obras | Mil Luces',
        meta_description: 'Instala paneles LED directamente sobre techos de hormigón o forjado sin necesidad de hueco. Diseños extraplanos cuadrados y rectangulares.',
        focus_keywords: 'panel led superficie, paneles led techo superficie, panel led 60x60 superficie, plafon panel led'
    },
    {
        slug: 'downlights',
        meta_title: 'Downlights LED para Techo | Focos Redondos y Cuadrados | Mil Luces',
        meta_description: 'Ilumina cocinas, pasillos y comercios con downlights LED de alto rendimiento. Variedad de potencias (6W a 30W) y tonalidades de luz.',
        focus_keywords: 'downlights led, focos downlight, downlights techo empotrar, focos led empotrables'
    },
    {
        slug: 'downlights-empotrables',
        meta_title: 'Downlights LED Empotrables | Focos Extraplanos | Mil Luces',
        meta_description: 'Descubre nuestra colección de downlights empotrables slim para falsos techos con poco espacio. Disipador de aluminio y encendido instantáneo.',
        focus_keywords: 'downlight led empotrable, downlight extraplano, foco empotrable techo, downlight slim'
    },
    {
        slug: 'downlights-superficie',
        meta_title: 'Downlights LED de Superficie | Focos Techo Elegantes | Mil Luces',
        meta_description: 'Downlights circulares y cuadrados para instalar directamente en superficie. Solución moderna para techos que no permiten perforación.',
        focus_keywords: 'downlight superficie, focos techo superficie, downlight led redondo superficie, plafon downlight'
    },
    {
        slug: 'downligths-sensor',
        meta_title: 'Downlights LED con Sensor de Movimiento Integrado | Mil Luces',
        meta_description: 'Maximiza el ahorro en portales, garajes y pasillos con downlights que incorporan sensor crepuscular y de movimiento por radar.',
        focus_keywords: 'downlight con sensor movimiento, focos led detector movimiento, plafon sensor movimiento, downlight automatico'
    },
    {
        slug: 'downlights-grandes',
        meta_title: 'Downlights LED de Gran Diámetro y Alta Potencia | Mil Luces',
        meta_description: 'Focos downlight de gran formato y potencia para techos altos, naves comerciales y oficinas. Máxima cobertura lumínica con el menor consumo.',
        focus_keywords: 'downlights grandes, downlight led alta potencia, focos gran diametro led, downlights comerciales'
    },
    {
        slug: 'aros-empotrables',
        meta_title: 'Aros Empotrables para Techo | Diseños Modernos | Mil Luces',
        meta_description: 'Aros y marcos empotrables redondos, cuadrados, basculantes y fijos. Acabados en blanco, negro, dorado y níquel para proyectos de diseño.',
        focus_keywords: 'aros empotrables, aros focos techo, aros para bombillas gu10, marcos empotrables led'
    },
    {
        slug: 'ARO-GU10',
        meta_title: 'Aros Empotrables para Bombillas GU10 | Focos Basculantes | Mil Luces',
        meta_description: 'Aros compatibles con dicroicas y bombillas LED GU10. Fácil sustitución sin herramientas. Gran variedad de colores y formas para cualquier estancia.',
        focus_keywords: 'aros gu10, aros empotrables gu10, aros basculantes gu10, foco techo bombilla gu10'
    },
    {
        slug: 'led-Integrado',
        meta_title: 'Aros Empotrables con LED Integrado | Mínimo Grosor | Mil Luces',
        meta_description: 'Luminarias empotrables con chip LED de alta calidad incorporado. Óptica antideslumbrante para una iluminación limpia y contemporánea.',
        focus_keywords: 'aros led integrado, focos empotrables led integrado, aros foco led directo, aros empotrar led'
    },
    {
        slug: 'comercial',
        meta_title: 'Iluminación Comercial LED para Tiendas y Negocios | Mil Luces',
        meta_description: 'Soluciones profesionales para retail, escaparates y comercios. Focos orientables de alto CRI para resaltar el producto y generar ventas.',
        focus_keywords: 'iluminacion comercial, luces para tiendas, focos retail led, iluminacion profesional comercios'
    },
    {
        slug: 'Carriles',
        meta_title: 'Carriles LED Monofásicos y Trifásicos de Techo | Mil Luces',
        meta_description: 'Sistemas de carril electrificado suspendido o de superficie. Flexibilidad total para mover y reorientar focos en tiendas y salones modernos.',
        focus_keywords: 'carril led, carriles para focos, carril monofasico led, guia electrificada techo'
    },
    {
        slug: 'Focos',
        meta_title: 'Focos de Carril LED Orientables para Tiendas | Mil Luces',
        meta_description: 'Focos proyectores para carril monofásico y trifásico con ángulo de apertura regulable. Dirige la luz exactamente donde tu negocio lo necesita.',
        focus_keywords: 'focos de carril led, focos carril orientables, focos carril tienda, proyectores de carril'
    },
    {
        slug: 'Accesorios-Carril',
        meta_title: 'Accesorios para Carriles LED | Conectores, Tapas y Codos | Mil Luces',
        meta_description: 'Conectores en L, en T, alimentadores, empalmes y suspensiones para armar sistemas de carril a medida sin complicaciones.',
        focus_keywords: 'accesorios carril led, conector carril monofasico, union carril led, alimentador carril'
    },
    {
        slug: 'bombillas',
        meta_title: 'Bombillas LED de Bajo Consumo | E27, E14, GU10 | Mil Luces',
        meta_description: 'Cambia tus bombillas tradicionales por bombillas LED de alta eficiencia. Ahorra hasta un 90% en la factura de la luz con encendido instantáneo.',
        focus_keywords: 'bombillas led, comprar bombillas led, bombillas bajo consumo, bombillas led baratas'
    },
    {
        slug: 'gu10',
        meta_title: 'Bombillas LED GU10 (Dicroicas) | 220V Sin Transformador | Mil Luces',
        meta_description: 'Focos y bombillas GU10 de 5W a 9W en tonos cálido, neutro y frío. Sustitución directa de las antiguas halógenas de 50W.',
        focus_keywords: 'bombillas gu10 led, dicroicas led gu10, bombillas foco techo gu10, gu10 220v'
    },
    {
        slug: 'filamento',
        meta_title: 'Bombillas LED de Filamento Vintage y Decorativas | Mil Luces',
        meta_description: 'El encanto del estilo retro con la eficiencia del LED. Bombillas de filamento visto en cristal ámbar o transparente para lámparas colgantes.',
        focus_keywords: 'bombillas filamento led, bombillas vintage led, bombillas decorativas retro, bombilla filamento calida'
    },
    {
        slug: 'vela',
        meta_title: 'Bombillas LED Tipo Vela E14 para Lámparas de Araña | Mil Luces',
        meta_description: 'Bombillas vela con casquillo fino E14. Diseñadas para lámparas clásicas, apliques de pared y candelabros con difusión homogénea.',
        focus_keywords: 'bombilla vela led, bombillas led e14 vela, bombilla forma vela, bombilla lampara arana'
    },
    {
        slug: 'neon',
        meta_title: 'Neón LED Flexible de Segunda Generación | Decoración | Mil Luces',
        meta_description: 'Tubos de neón LED flexible para cartelería, letras luminosas y decoración interior/exterior. Luz uniforme continua sin puntos visibles.',
        focus_keywords: 'neon led flexible, carteles neon led, tiras neon led, neon decorativo'
    },
    {
        slug: 'Primera-Generacion',
        meta_title: 'Neón LED 1ª Generación Flexible Tradicional | Mil Luces',
        meta_description: 'Neón LED flexible clásico de alta resistencia para perfilería exterior, rótulos comerciales y contornos arquitectónicos.',
        focus_keywords: 'neon led primera generacion, tubo neon led flexible tradicional, neon exterior 1 generacion'
    },
    {
        slug: 'Segunda-Generacion',
        meta_title: 'Neón LED 2ª Generación Ultraflexible de Alta Densidad | Mil Luces',
        meta_description: 'La última tecnología en neón LED: corte milimétrico, máxima flexibilidad para curvas complejas y acabado mate impecable.',
        focus_keywords: 'neon led segunda generacion, neon led ultraflexible, neon led rotulacion, neon silicona 2 gen'
    },
    {
        slug: 'accesoriosneon',
        meta_title: 'Accesorios para Neón LED | Tapas, Grapas y Conectores | Mil Luces',
        meta_description: 'Todos los componentes para la instalación de tu neón LED: cables de conexión rápida, tapas finales de silicona y grapas de sujeción.',
        focus_keywords: 'accesorios neon led, conectores neon led, grapas sujecion neon, tapas silicona neon'
    },
    {
        slug: 'metracrilatos',
        meta_title: 'Bases de Metacrilato para Carteles de Neón LED | Mil Luces',
        meta_description: 'Planchas de metacrilato transparente y mecanizado para fijación de rótulos de neón, logos de empresa y cuadros decorativos.',
        focus_keywords: 'metacrilatos carteles neon, planchas metacrilato rotulacion, base metacrilato transparente'
    },
    {
        slug: 'banderolas',
        meta_title: 'Banderolas Luminosas LED para Fachadas y Comercios | Mil Luces',
        meta_description: 'Rótulos luminosos tipo banderola a doble cara para comercios. Señaliza tu negocio desde cualquier ángulo de la calle con visibilidad 24h.',
        focus_keywords: 'banderolas luminosas led, rotulos banderola doble cara, banderolas para fachadas tiendas'
    },
    {
        slug: 'exterior',
        meta_title: 'Iluminación LED Exterior | Focos, Apliques y Balizas IP65 | Mil Luces',
        meta_description: 'Catálogo completo de luminarias para exterior preparadas contra la lluvia, el calor y el polvo. Ilumina jardines, porches y fachadas con estilo.',
        focus_keywords: 'iluminacion led exterior, luces jardin exterior, luminarias estancas exterior, focos exterior ip65'
    },
    {
        slug: 'apliquesexterior',
        meta_title: 'Apliques de Pared para Exterior LED | Luz Indirecta | Mil Luces',
        meta_description: 'Apliques modernos de fachada con emisión de luz hacia arriba y abajo (Up&Down). Materiales antioxidantes y estanqueidad certificada IP54/IP65.',
        focus_keywords: 'apliques pared exterior, apliques de fachada led, aplique exterior moderno, aplique up down exterior'
    },
    {
        slug: 'balizas',
        meta_title: 'Balizas LED para Senderos, Caminos y Jardines | Mil Luces',
        meta_description: 'Postes y balizas de suelo para señalización de entradas, caminos y jardines. Luz guiada antideslumbrante para caminar seguro de noche.',
        focus_keywords: 'balizas led jardin, postes iluminacion camino, balizas suelo exterior, balizas senalizacion jardin'
    },
    {
        slug: 'farolas',
        meta_title: 'Farolas LED de Exterior y Alumbrado Público/Residencial | Mil Luces',
        meta_description: 'Farolas LED de alta potencia para urbanizaciones, accesos vehiculares y parcelas. Gran alcance lumínico y máxima resistencia a la intemperie.',
        focus_keywords: 'farolas led exterior, farolas jardin led, alumbrado exterior farolas, farolas para parcelas'
    },
    {
        slug: 'solar',
        meta_title: 'Iluminación Solar LED para Exterior | 100% Sin Cables | Mil Luces',
        meta_description: 'Focos, balizas y proyectores solares con panel fotovoltaico y batería de litio. Ilumina cualquier rincón de tu jardín con coste cero en electricidad.',
        focus_keywords: 'luces solares jardin, focos solares led exterior, iluminacion solar sin cables, proyectores solares potentes'
    },
    {
        slug: 'proyectores',
        meta_title: 'Proyectores LED de Exterior (10W a 200W) | Focos Estancos | Mil Luces',
        meta_description: 'Focos proyectores LED para pistas deportivas, fachadas, carteles y patios. Carcasa de aluminio estanco y encendido instantáneo a plena potencia.',
        focus_keywords: 'proyectores led exterior, focos proyectores estancos, foco proyector 50w 100w, proyector led patio'
    },
    {
        slug: 'industrial',
        meta_title: 'Iluminación Industrial LED | Campanas y Alumbrado de Naves | Mil Luces',
        meta_description: 'Soluciones de iluminación de alta potencia para naves industriales, talleres y almacenes. Equipos de alta fiabilidad y disipación térmica.',
        focus_keywords: 'iluminacion industrial led, campanas led industriales, luminarias naves industriales, focos taller led'
    },
    {
        slug: 'Emergencias',
        meta_title: 'Luces de Emergencia LED Homologadas para Locales | Mil Luces',
        meta_description: 'Bloques de iluminación de emergencia permanentes y no permanentes con batería de respaldo según normativa de seguridad y evacuación.',
        focus_keywords: 'luces de emergencia led, luminarias emergencia homologadas, luces emergencia local comercial, luz emergencia techo'
    },
    {
        slug: 'tubos',
        meta_title: 'Tubos LED T8 y Pantallas Estancas | Reemplazo Fluorescente | Mil Luces',
        meta_description: 'Sustituye los viejos fluorescentes por tubos LED sin parpadeos ni cebadores. Ahorro inmediato del 60% en consumo eléctrico en garajes y cocinas.',
        focus_keywords: 'tubos led, cambiar fluorescentes por led, tubos led t8, tubos led bajo consumo'
    },
    {
        slug: 'T8',
        meta_title: 'Tubos LED T8 de 60cm, 120cm y 150cm | Conexión Directa | Mil Luces',
        meta_description: 'Tubos T8 en medidas estándar con conexión a un lateral o dos laterales. Cuerpo de nano-plástico o cristal de alta luminosidad.',
        focus_keywords: 'tubo led t8 120cm, tubos led 60cm 150cm, tubos led t8 garaje, tubo fluorescente led t8'
    },
    {
        slug: 'pantalla',
        meta_title: 'Pantallas Estancas LED para Tubos T8 e Integradas IP65 | Mil Luces',
        meta_description: 'Pantallas protectoras estancas para garajes, lavaderos y zonas con humedad o polvo. Disponibles para tubos simples o dobles.',
        focus_keywords: 'pantallas estancas led, luminarias estancas tubo t8, pantallas estancas garaje, pantalla estanca ip65'
    },
    {
        slug: 'modulosled',
        meta_title: 'Módulos LED para Rótulos, Letras Corpóreas y Cajas de Luz | Mil Luces',
        meta_description: 'Módulos de inyección LED estancos con lente óptica gran angular para retroiluminación uniforme en rotulación y publicidad.',
        focus_keywords: 'modulos led, pastillas led rotulos, modulos led cajas de luz, modulos led estancos'
    },
    {
        slug: 'modulo-led-12v',
        meta_title: 'Módulos LED 12V para Rotulación y Cartelería | Mil Luces',
        meta_description: 'Cadenas de módulos LED 12V con cinta 3M para fácil fijación en letras de canal y rótulos luminosos. Alto brillo y fiabilidad continuada.',
        focus_keywords: 'modulos led 12v, pastillas led 12v, modulos led letras corporeas, modulos inyeccion led 12v'
    },
    {
        slug: 'modulo-led-24v',
        meta_title: 'Módulos LED 24V de Larga Distancia para Cajas de Luz | Mil Luces',
        meta_description: 'Módulos de 24V ideales para cajas de luz de grandes dimensiones. Permite encadenar más unidades sin caída de intensidad.',
        focus_keywords: 'modulos led 24v, modulo led gran formato, pastillas led 24 voltios, iluminacion cajas de luz 24v'
    },
    {
        slug: 'modulo-led-220v',
        meta_title: 'Módulos LED 220V Conexión Directa a Red Eléctrica | Mil Luces',
        meta_description: 'Módulos LED preparados para conectar directamente a 220V AC sin transformador intermedio. Solución rápida para farolas y rótulos aislados.',
        focus_keywords: 'modulos led 220v, modulo led conexion directa 220, pastillas led 220v directas, modulos led ac'
    },
    {
        slug: 'Perfil-aluminio',
        meta_title: 'Perfiles de Aluminio para Tiras LED | Difusores Opal | Mil Luces',
        meta_description: 'Perfiles de superficie, empotrar y esquina en aluminio anodizado con difusor opal. Disipan el calor y logran un acabado estético profesional.',
        focus_keywords: 'perfiles aluminio tiras led, perfil led superficie, canaleta aluminio tira led, perfil led empotrable'
    },
    {
        slug: 'lamparas',
        meta_title: 'Lámparas de Techo y Colgantes de Diseño | Mil Luces',
        meta_description: 'Selección exclusiva de lámparas colgantes, de sobremesa y de pie para iluminar con estilo tu hogar o local. Descubre las últimas tendencias.',
        focus_keywords: 'lamparas de diseno, lamparas de techo modernas, lamparas colgantes comedor, comprar lamparas online'
    },
    {
        slug: 'ventiladores',
        meta_title: 'Ventiladores de Techo con Luz LED y Motor DC Silencioso | Mil Luces',
        meta_description: 'Refréscate e ilumina tu hogar con ventiladores de techo silenciosos con mando a distancia, luz LED regulable y función verano/invierno.',
        focus_keywords: 'ventiladores de techo con luz, ventilador techo motor dc silencioso, ventilador luz led, comprar ventilador de techo'
    }
];

async function updateAll() {
    console.log('--- ACTUALIZANDO ESTANCIAS ---');
    let roomsUpdated = 0;
    for (const r of roomsSEO) {
        const { error } = await supabase
            .from('rooms')
            .update({
                meta_title: r.meta_title,
                meta_description: r.meta_description,
                focus_keywords: r.focus_keywords
            })
            .eq('slug', r.slug);

        if (error) {
            console.error(`Error actualizando estancia [${r.slug}]:`, error.message);
        } else {
            roomsUpdated++;
        }
    }
    console.log(`Estancias actualizadas con éxito: ${roomsUpdated} / ${roomsSEO.length}`);

    console.log('\n--- ACTUALIZANDO CATEGORÍAS ---');
    let catsUpdated = 0;
    for (const c of categoriesSEO) {
        const { error } = await supabase
            .from('categories')
            .update({
                meta_title: c.meta_title,
                meta_description: c.meta_description,
                focus_keywords: c.focus_keywords
            })
            .eq('slug', c.slug);

        if (error) {
            console.error(`Error actualizando categoría [${c.slug}]:`, error.message);
        } else {
            catsUpdated++;
        }
    }
    console.log(`Categorías actualizadas con éxito: ${catsUpdated} / ${categoriesSEO.length}`);
}

updateAll().catch(console.error);
