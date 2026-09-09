// Artículos iniciales del Blog — Mil Luces
// Formato estructurado con bloques ricos para el sistema de formateo del blog.

export const BLOG_POSTS_INICIALES = [

    // ══════════════════════════════════════════
    // GUÍAS DE ILUMINACIÓN — ARTÍCULO MAESTRO
    // ══════════════════════════════════════════
    {
        title: 'Cómo elegir la iluminación LED adecuada para tu hogar (Guía Completa 2026)',
        slug: 'como-elegir-iluminacion-led',
        excerpt: 'Elegir la iluminación LED correcta transforma por completo tu hogar. En esta guía profesional explicamos lúmenes, Kelvin, IRC, casquillos y distribuciones lumínicas con ejemplos reales.',
        image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop',
        author: 'Equipo Técnico Mil Luces',
        category: 'guias-iluminacion',
        subcategory: 'como-elegir-iluminacion-led',
        meta_title: 'Cómo Elegir Iluminación LED para Tu Hogar: Guía Definitiva | Mil Luces',
        meta_description: 'Guía técnica definitiva para elegir iluminación LED en el hogar: cálculo de lúmenes, escala Kelvin, índice IRC, tipos de casquillo, tablas comparativas y FAQs.',
        content: JSON.stringify([
            { type: 'callout', subtipo: 'summary', content: 'Regla de oro de Mil Luces: La iluminación perfecta combina 3 capas: luz general (downlights/plafones), luz de trabajo (bajo muebles/escritorio) y luz de acento (tiras LED/ambiente). Nunca dependas de un único punto de luz central.' },

            { type: 'h2', content: '1. Lúmenes vs Vatios: La medida real del brillo' },
            { type: 'p', content: 'Los vatios (W) solo indican el consumo eléctrico. Para saber cuánta luz dará una luminaria, debes mirar siempre los lúmenes (lm). Un LED moderno consume hasta un 85% menos de potencia para la misma emisión de luz.' },
            {
                type: 'tabla', cols: ['Halógena / Incandescente', 'LED Equivalente', 'Lúmenes reales', 'Ahorro estimado'], filas: [
                    ['25W', '3-4W', '~250 lm', '84%'],
                    ['40W', '5-6W', '~450 lm', '85%'],
                    ['60W', '8-10W', [{ texto: '~800 lm', recomendado: true }], '85%'],
                    ['75W', '11-13W', '~1050 lm', '83%'],
                    ['100W', '14-17W', '~1500 lm', '85%'],
                ]
            },
            { type: 'callout', subtipo: 'tech', titulo: 'Dato de eficiencia', content: 'Busca luminarias con una eficiencia de al menos 90-100 lm/W. Las bombillas LED de alta gama de Mil Luces alcanzan hasta 120 lm/W.' },

            { type: 'h2', content: '2. Temperatura de Color: El secreto del ambiente' },
            { type: 'p', content: 'La temperatura de color se mide en grados Kelvin (K). Determina si la atmósfera de la estancia será cálida, neutra o fría.' },

            // Escala Kelvin visual
            { type: 'kelvinScale' },

            {
                type: 'imagen',
                url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1200&auto=format&fit=crop',
                alt: 'Iluminación cálida en un salón moderno',
                caption: 'Iluminación cálida (2700K) en salón: crea sensación de confort y relajación perfecta para el descanso evening.'
            },

            { type: 'callout', subtipo: 'tip', content: 'En salones y dormitorios, mantente siempre en el rango de 2700K a 3000K. La luz blanca cálida estimula la producción natural de melatonina antes de dormir.' },

            { type: 'h2', content: '3. Índice de Reproducción Cromática (IRC / CRI)' },
            { type: 'p', content: 'El IRC (CRI en inglés) mide del 0 al 100 cómo de reales y vivos se ven los colores bajo esa luz en comparación con la luz del sol natural (CRI 100).' },
            {
                type: 'especCard', titulo: 'Recomendaciones de IRC por uso', specs: [
                    { label: 'Hogar general', value: 'CRI ≥ 80' },
                    { label: 'Cocinas y Espejos', value: 'CRI ≥ 90' },
                    { label: 'Tiendas y Arte', value: 'CRI ≥ 95' },
                    { label: 'Exteriores', value: 'CRI ≥ 75' },
                ]
            },

            { type: 'h2', content: '4. Ventajas de planificar con iluminación LED' },
            {
                type: 'prosCons',
                pros: [
                    'Ahorro energético de hasta el 85% en la factura de la luz.',
                    'Vida útil superior a 25.000–50.000 horas de uso.',
                    'Encendido instantáneo al 100% sin parpadeos.',
                    'Disponible en todas las temperaturas y colores (CCT y RGBW).',
                ],
                cons: [
                    'Inversión inicial ligeramente superior frente a bombillas halógenas obsoletas.',
                    'Requiere comprobar la compatibilidad de los reguladores dimmer.',
                ]
            },

            { type: 'h2', content: '5. Planifica tu estancia en 4 pasos simples' },
            {
                type: 'pasos', pasos: [
                    { titulo: 'Calcula la superficie y uso', descripcion: 'Multiplica largo por ancho para obtener los m². Define si es zona de descanso (200 lm/m²) o trabajo (400 lm/m²).' },
                    { titulo: 'Selecciona la temperatura Kelvin', descripcion: 'Dormitorios/Salón = 2700-3000K. Cocinas/Baños = 4000K. Garajes/Taller = 6000K.' },
                    { titulo: 'Combina luces generales y de acento', descripcion: 'Usa focos empotrables para luz ambiental y tiras LED bajo muebles o repisas para luz indirecta.' },
                    { titulo: 'Revisa casquillos y conectores', descripcion: 'Verifica si tus lámparas usan E27, E14, GU10 o alimentación directa a 24V.' },
                ]
            },

            // Producto recomendado
            {
                type: 'destacadoProducto',
                titulo: 'Pack Focos Downlight LED Empotrables 8W 4000K',
                desc: 'Foco técnico extraplano con reflector difusor, ideal para cocinas, pasillos y baños. CRI > 90.',
                imagen: 'https://images.unsplash.com/photo-1572635148818-ef6fd45eb394?q=80&w=400&auto=format&fit=crop',
                badge: 'Top Ventas 2026',
                url: '/catalogo'
            },

            // Preguntas frecuentes
            {
                type: 'faq', items: [
                    { pregunta: '¿Puedo cambiar una bombilla halógena por una LED directamente?', respuesta: 'En la mayoría de casos sí, siempre que coincida el casquillo (E27, E14, GU10). Si es un foco a 12V con transformador antiguo, es recomendable actualizar también el transformador a uno especial para LED para evitar parpadeos.' },
                    { pregunta: '¿Por qué parpadea una bombilla LED al apagar el interruptor?', respuesta: 'Suele ocurrir por una pequeña corriente residual en interruptores con luz piloto o por una instalación con neutro cortado. Se soluciona instalando un condensador antiparpadeo o eliminando la luz piloto del interruptor.' },
                    { pregunta: '¿Qué es una tira LED COB y en qué se diferencia de una SMD?', respuesta: 'Las tiras LED COB tienen los diodos integrados continuamente bajo una capa de silicona, creando una línea de luz homogénea sin puntos oscuros visibles, ideal para perfiles vistos.' },
                ]
            },

            { type: 'productoCTA', texto: 'Explora nuestro catálogo completo de iluminación técnica LED', url: '/catalogo' },
        ])
    },

    {
        title: 'Lúmenes vs vatios: ¿Cuánta luz necesito realmente?',
        slug: 'lumenes-vs-vatios',
        excerpt: 'Deja de comprar bombillas por vatios. Te explicamos cómo calcular la cantidad de luz que realmente necesitas en cada habitación usando lúmenes.',
        image_url: 'https://images.unsplash.com/photo-1572635148818-ef6fd45eb394?q=80&w=1200&auto=format&fit=crop',
        author: 'Equipo Mil Luces',
        category: 'guias-iluminacion',
        subcategory: 'lumenes-vs-vatios',
        meta_title: 'Lúmenes vs Vatios: Guía de Cálculo de Iluminación | Mil Luces',
        meta_description: 'Aprende a calcular los lúmenes necesarios por habitación y olvida para siempre los vatios como medida de brillo.',
        content: JSON.stringify([
            { type: 'callout', subtipo: 'tech', titulo: 'Fórmula básica', content: 'Lúmenes necesarios = Superficie (m²) × Lúmenes por m² recomendados según la estancia.' },
            { type: 'h2', content: '¿Por qué los vatios ya no sirven?' },
            { type: 'p', content: 'Antes había una relación directa: más vatios = más luz. Con el LED, eso ya no es cierto. Una LED de 9W puede dar más luz que una halógena de 50W. Los vatios solo miden el consumo eléctrico.' },
            { type: 'h2', content: 'Lúmenes recomendados por estancia' },
            {
                type: 'tabla', cols: ['Estancia', 'Lúmenes/m²', 'Ejemplo 15m²'], filas: [
                    ['Salón / Comedor', '200-300 lm/m²', '3000 – 4500 lm'],
                    ['Cocina', [{ texto: '300-500 lm/m²', recomendado: true }], '4500 – 7500 lm'],
                    ['Dormitorio', '150-200 lm/m²', '2250 – 3000 lm'],
                    ['Baño', '300-400 lm/m²', '4500 – 6000 lm'],
                    ['Pasillo', '100-150 lm/m²', '500 – 750 lm'],
                    ['Oficina / estudio', '400-500 lm/m²', '6000 – 7500 lm'],
                    ['Garaje', '300-400 lm/m²', '4500 – 6000 lm'],
                ]
            },
            { type: 'h2', content: 'Cómo hacer el cálculo paso a paso' },
            {
                type: 'pasos', pasos: [
                    { titulo: 'Mide la superficie en m²', descripcion: 'Multiplica el largo por el ancho de la habitación.' },
                    { titulo: 'Consulta los lúmenes recomendados', descripcion: 'Usa la tabla anterior para tu tipo de estancia.' },
                    { titulo: 'Calcula el total de lúmenes', descripcion: 'Superficie × lúmenes/m². Por ejemplo, cocina de 12m²: 12 × 400 = 4800 lm.' },
                    { titulo: 'Distribuye las fuentes de luz', descripcion: 'Puedes usar 6 downlights de 800 lm cada uno (6 × 800 = 4800 lm) o 4 focos de 1200 lm.' },
                    { titulo: 'Añade iluminación de acento', descripcion: 'Tiras LED bajo muebles o lámparas de mesa añaden confort sin sumar al total de iluminación general.' },
                ]
            },
            { type: 'callout', subtipo: 'tip', content: 'Para habitaciones de techo alto (>2,7m) aumenta los lúmenes por m² en un 20-30%, ya que parte de la luz se pierde en la altura.' },
            { type: 'productoCTA', texto: 'Calcula y compra tus downlights LED', url: '/catalogo?categoria=downlights' },
        ])
    },

    {
        title: 'Temperatura de color: la guía definitiva por estancias',
        slug: 'temperatura-de-color',
        excerpt: '2700K, 4000K, 6500K… ¿qué significan estos números y cuál elegir para cada habitación? Te lo explicamos con ejemplos reales.',
        image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop',
        author: 'Equipo Mil Luces',
        category: 'guias-iluminacion',
        subcategory: 'temperatura-de-color',
        meta_title: 'Temperatura de Color LED: Guía por Estancias 2026 | Mil Luces',
        meta_description: 'Descubre qué temperatura de color elegir para cada habitación: salón, cocina, baño, dormitorio y oficina. Explicado con ejemplos y tablas claras.',
        content: JSON.stringify([
            { type: 'callout', subtipo: 'summary', content: 'La temperatura de color determina si la luz es cálida (amarilla), neutra (blanca) o fría (azulada). Se mide en Kelvin. Cuanto mayor sea el número, más fría y "diurna" es la luz.' },
            { type: 'h2', content: 'La escala Kelvin de un vistazo' },
            { type: 'kelvinScale' },
            { type: 'h2', content: 'Temperatura recomendada por estancia' },
            {
                type: 'tabla', cols: ['Estancia', 'Temperatura', 'Por qué'], filas: [
                    ['Salón', [{ texto: '2700–3000K', recomendado: true }], 'Ambiente acogedor y relajado'],
                    ['Dormitorio', '2700–3000K', 'Favorece el descanso y la melatonina'],
                    ['Cocina (trabajo)', '4000–4500K', 'Claridad para ver colores de alimentos'],
                    ['Baño (aseo)', '3000–4000K', 'Balance entre confort y visibilidad'],
                    ['Oficina / estudio', '4000–5000K', 'Mejora concentración y alerta'],
                    ['Garaje / taller', '5000–6500K', 'Máxima claridad para trabajar'],
                    ['Escaparate / tienda', '3000–4000K', 'Resalta colores de producto'],
                ]
            },
            { type: 'callout', subtipo: 'warning', content: 'Evita luz fría (>5000K) en dormitorios o salas de estar. Inhibe la producción de melatonina y dificulta el sueño, especialmente en niños.' },
            { type: 'h2', content: 'Tip avanzado: iluminación regulable (dimmable + CCT)' },
            { type: 'p', content: 'Las bombillas CCT (Correlated Color Temperature) ajustable permiten variar la temperatura entre 2700K y 6500K desde una app o mando. Perfectas para salones polivalentes.' },
        ])
    },

    // ══════════════════════════════════════════
    // TIRAS LED
    // ══════════════════════════════════════════
    {
        title: '12V vs 24V vs 220V en tiras LED: ¿cuál necesito?',
        slug: '12v-vs-24v-vs-220v',
        excerpt: 'No todas las tiras LED se alimentan igual. Te explicamos las diferencias entre 12V, 24V y 220V para que elijas la tensión correcta según tu proyecto.',
        image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop',
        author: 'Equipo Mil Luces',
        category: 'tiras-led',
        subcategory: '12v-vs-24v-vs-220v',
        meta_title: '12V vs 24V vs 220V en Tiras LED: Diferencias y Cuándo Usar Cada Una | Mil Luces',
        meta_description: 'Comparativa completa entre tiras LED de 12V, 24V y 220V. Aprende cuándo usar cada tensión, ventajas, limitaciones y qué transformador necesitas.',
        content: JSON.stringify([
            { type: 'callout', subtipo: 'summary', content: '12V → corta distancia y seguridad. 24V → instalaciones más largas con menos voltaje caído. 220V → largas distancias sin transformador, para exterior o industrial.' },
            { type: 'h2', content: 'Comparativa completa' },
            {
                type: 'tabla', cols: ['Característica', '12V DC', '24V DC', '220V AC'], filas: [
                    ['Seguridad (MBTS)', 'Muy alta', [{ texto: 'Alta', recomendado: true }], 'Estándar red eléctrica'],
                    ['Long. máx. sin pérdida', '~3-5m', '~5-8m', '~25m por tramo'],
                    ['¿Necesita transformador?', 'Sí', 'Sí', 'No'],
                    ['Corte mínimo', 'Cada 3 LEDs (~5cm)', 'Cada 3 LEDs', 'Cada 5cm (varía)'],
                    ['Uso habitual', 'Muebles, armarios, bajo encimera', 'Cocinas, salones, proyectos medianos', 'Fachadas, jardines, tramos largos'],
                    ['Precio transformador', '~10-30€', '~15-40€', 'Sin coste'],
                    ['Eficiencia lumínica', 'Media', [{ texto: 'Alta', recomendado: true }], 'Variable'],
                ]
            },
            { type: 'h2', content: '¿Cuándo elegir 12V?' },
            {
                type: 'ul', items: [
                    'Tramos cortos de menos de 4 metros.',
                    'Instalaciones en armarios, muebles de cocina y mobiliario.',
                    'Cuando la seguridad eléctrica es prioritaria (niños, espacios húmedos).',
                    'Proyectos DIY donde el transformador ya está disponible.',
                ]
            },
            { type: 'h2', content: '¿Cuándo elegir 24V?' },
            { type: 'p', content: 'El voltaje doble permite reducir la intensidad a la mitad (ley de Ohm), lo que significa menos calor, menos caída de tensión en la tira y mayor longitud operativa sin pérdida de brillo.' },
            { type: 'callout', subtipo: 'tip', content: 'Para cocinas y salones con tiras de más de 3m, elige siempre 24V. El diferencial de precio del transformador es mínimo y la calidad de luz es mucho más uniforme.' },
            { type: 'h2', content: '¿Cuándo elegir 220V?' },
            {
                type: 'ul', items: [
                    'Instalaciones exteriores de más de 10m (jardines, fachadas).',
                    'No quieres/puedes instalar transformador.',
                    'Tramos muy largos donde el coste del transformador sería muy alto.',
                    'Retrofit de instalaciones halógenas ya existentes.',
                ]
            },
            { type: 'callout', subtipo: 'warning', content: 'Las tiras de 220V trabajan con tensión de red. Aunque son seguras con el aislamiento correcto, si vas a cortarlas o empalmarlas hazlo siempre SIN tensión y con productos homologados.' },
            { type: 'productoCTA', texto: 'Ver catálogo completo de tiras LED y transformadores', url: '/catalogo?categoria=tiras' },
        ])
    },

    {
        title: 'Cómo calcular el transformador para tu tira LED',
        slug: 'como-calcular-transformador',
        excerpt: 'Un transformador mal calculado provoca calentamiento, parpadeo y vida útil reducida. Aprende a calcular la potencia exacta que necesitas en 4 pasos.',
        image_url: 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?q=80&w=1200&auto=format&fit=crop',
        author: 'Equipo Mil Luces',
        category: 'tiras-led',
        subcategory: 'como-calcular-transformador',
        meta_title: 'Cómo Calcular Transformador para Tiras LED: Guía paso a paso | Mil Luces',
        meta_description: 'Aprende a calcular la potencia del transformador para tiras LED en 4 pasos simples. Incluye margen de seguridad, tipos de fuentes de alimentación y errores comunes.',
        content: JSON.stringify([
            { type: 'callout', subtipo: 'tech', titulo: 'Fórmula del transformador', content: 'Potencia del transformador (W) = Vatios/metro de la tira × Metros totales × 1,20 (margen de seguridad 20%)' },
            { type: 'h2', content: 'Por qué el 20% de margen es imprescindible' },
            { type: 'p', content: 'Un transformador operando al 100% de su capacidad se sobrecalienta, reduce su vida útil y puede provocar parpadeo. El margen del 20% garantiza una operación en zona segura.' },
            { type: 'h2', content: 'Cálculo paso a paso' },
            {
                type: 'pasos', pasos: [
                    { titulo: 'Anota los W/m de tu tira', descripcion: 'Está en la caja o ficha técnica. Ejemplo: tira de 14,4W/m.' },
                    { titulo: 'Multiplica por los metros totales', descripcion: '14,4W/m × 5m = 72W totales consumidos.' },
                    { titulo: 'Aplica el margen de seguridad', descripcion: '72W × 1,20 = 86,4W → necesitas un transformador de mínimo 100W.' },
                    { titulo: 'Elige el transformador estándar superior', descripcion: 'Los transformadores van en potencias estándar: 60W, 100W, 150W, 200W, 320W… Elige el inmediatamente superior a tu cálculo.' },
                ]
            },
            { type: 'h2', content: 'Ejemplos reales de cálculo' },
            {
                type: 'tabla', cols: ['Escenario', 'W/m', 'Metros', 'Consumo total', 'Transformador necesario'], filas: [
                    ['Cocina bajo mueble', '8W/m', '3m', '24W', [{ texto: '30W', recomendado: true }]],
                    ['Salón perimetral', '14,4W/m', '6m', '86,4W', '100W'],
                    ['Escalera', '4,8W/m', '8m', '38,4W', '60W'],
                    ['Fachada (24V)', '20W/m', '12m', '240W', '320W'],
                ]
            },
            { type: 'callout', subtipo: 'warning', content: '¡Nunca uses un transformador más pequeño que la potencia calculada! Si la tira consume 80W y el transformador es de 60W, se quemará en pocas horas.' },
            { type: 'productoCTA', texto: 'Ver transformadores LED disponibles', url: '/catalogo?categoria=tiras' },
        ])
    },

    // ══════════════════════════════════════════
    // TECNOLOGÍA LED
    // ══════════════════════════════════════════
    {
        title: 'RGB vs RGBW: diferencias y cuándo usar cada sistema de color',
        slug: 'rgb-vs-rgbw',
        excerpt: 'RGB y RGBW parecen lo mismo pero no lo son. En esta guía te explicamos las diferencias técnicas, qué controlador necesitas y cuándo vale la pena pagar más por RGBW.',
        image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop',
        author: 'Equipo Mil Luces',
        category: 'tecnologia-led',
        subcategory: 'rgb-vs-rgbw',
        meta_title: 'RGB vs RGBW: Diferencias, Ventajas y Cuándo Usar Cada Uno | Mil Luces',
        meta_description: 'Comparativa técnica entre tiras LED RGB y RGBW. Controladores, ángulo de color, temperatura de blanco y consejos para la elección correcta.',
        content: JSON.stringify([
            { type: 'callout', subtipo: 'summary', content: 'RGB mezcla Rojo + Verde + Azul para crear miles de colores pero el blanco resultante tiende al frío-azulado. RGBW añade un chip blanco dedicado para blancos cálidos y neutros de alta calidad.' },
            { type: 'h2', content: 'Comparativa técnica RGB vs RGBW' },
            {
                type: 'tabla', cols: ['Característica', 'RGB', 'RGBW'], filas: [
                    ['Canales de color', '3 (R·G·B)', [{ texto: '4 (R·G·B·W)', recomendado: true }]],
                    ['Blanco generado', 'Frío-azulado (aprox 7000K)', 'Cálido real (2700–4000K)'],
                    ['Ideal para', 'Ambientes de color, party, gaming', 'Uso cotidiano + efectos de color'],
                    ['Controlador', '3 canales PWM', '4 canales PWM'],
                    ['Precio', 'Económico', 'Moderado (+15-25%)'],
                    ['Compatibilidad DMX', 'Sí', 'Sí'],
                    ['IRC del blanco', '~50-60', [{ texto: '~90+', recomendado: true }]],
                ]
            },
            { type: 'h2', content: '¿Cuándo elegir RGB?' },
            {
                type: 'ul', items: [
                    'Instalaciones puramente decorativas (retroiluminación TV, gaming room, discoteca).',
                    'Cuando el blanco de calidad no es importante.',
                    'Proyectos con presupuesto ajustado.',
                    'Efectos de luz dinámica y música.',
                ]
            },
            { type: 'h2', content: '¿Cuándo elegir RGBW?' },
            {
                type: 'ul', items: [
                    'Instalaciones que necesiten tanto color como luz blanca de calidad (salones, restaurantes).',
                    'Proyectos de hostelería o retail donde el IRC es importante.',
                    'Cuando quieres un sistema todo-en-uno sin cambiar de tira según el ambiente.',
                ]
            },
            { type: 'callout', subtipo: 'tip', content: 'Para salones y zonas de vida, RGBW es la opción superior. El chip blanco dedicado cambia completamente la calidad de la luz en modo blanco.' },
            { type: 'h2', content: 'Controladores compatibles' },
            { type: 'p', content: 'Los controladores RGB y RGBW NO son intercambiables. Un controlador RGB tiene 3 canales de salida; uno RGBW tiene 4. Asegúrate de comprar el controlador correcto para tu tira.' },
            { type: 'productoCTA', texto: 'Ver tiras LED RGB y RGBW y controladores', url: '/catalogo?categoria=tiras' },
        ])
    },
];

export default BLOG_POSTS_INICIALES;
