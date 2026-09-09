import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Camera, Check, X, Sparkles } from 'lucide-react';
import '../../styles/blogRichStyles.css';

// ── Índice de Contenidos (TOC) ──────────────────────────────────────
function TableOfContents({ headings }) {
    if (!headings.length) return null;
    return (
        <nav className="blog-toc">
            <p className="toc-title">📋 Índice de contenidos</p>
            <ol>
                {headings.map(h => (
                    <li key={h.id}>
                        <a href={`#${h.id}`} onClick={e => {
                            e.preventDefault();
                            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}>
                            {h.text}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

// ── Callout / Caja de aviso ─────────────────────────────────────────
function Callout({ tipo, titulo, children }) {
    const config = {
        tip: { emoji: '💡', label: titulo || 'Consejo de Iluminador', cls: 'blog-callout--tip' },
        warning: { emoji: '⚠️', label: titulo || 'Advertencia Técnica', cls: 'blog-callout--warning' },
        tech: { emoji: '⚡', label: titulo || 'Ficha Técnica', cls: 'blog-callout--tech' },
        summary: { emoji: '📌', label: titulo || 'Resumen Clave', cls: 'blog-callout--summary' },
    };
    const { emoji, label, cls } = config[tipo] || config.tip;
    return (
        <div className={`blog-callout ${cls}`}>
            <span className="callout-icon">{emoji}</span>
            <div className="callout-body">
                <p className="callout-title">{label}</p>
                <p className="callout-text">{children}</p>
            </div>
        </div>
    );
}

// ── Tabla Comparativa ───────────────────────────────────────────────
function TablaComparativa({ cols, filas }) {
    return (
        <div className="blog-table-wrapper">
            <table className="blog-comparison-table">
                <thead>
                    <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                    {filas.map((f, i) => (
                        <tr key={i}>
                            {f.map((cel, j) => (
                                <td key={j}>
                                    {typeof cel === 'object' ? (
                                        <>
                                            {cel.texto}
                                            {cel.recomendado && <span className="badge-recomendado">✓ Recomendado</span>}
                                        </>
                                    ) : cel}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Guía Paso a Paso ────────────────────────────────────────────────
function GuidePasos({ pasos }) {
    return (
        <ul className="blog-steps">
            {pasos.map((paso, i) => (
                <li key={i} className="blog-step">
                    <div className="step-line" />
                    <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
                    <div className="step-content">
                        <p className="step-title">{paso.titulo}</p>
                        <p className="step-desc">{paso.descripcion}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ── Ficha Técnica / Spec Card ───────────────────────────────────────
function EspecCard({ titulo, specs }) {
    return (
        <div className="blog-spec-card">
            <p className="spec-card-title">⚡ {titulo || 'Ficha Técnica'}</p>
            <div className="blog-spec-grid">
                {specs.map((s, i) => (
                    <div key={i} className="blog-spec-item">
                        <p className="spec-label">{s.label}</p>
                        <p className="spec-value">{s.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── CTA de Producto ─────────────────────────────────────────────────
function ProductoCTA({ texto, url }) {
    return (
        <Link to={url || '/catalogo'} className="blog-product-cta">
            <span className="cta-text">{texto}</span>
            <span className="cta-btn">Ver productos <ArrowRight style={{ display: 'inline', width: '0.75rem', height: '0.75rem', marginLeft: '0.25rem' }} /></span>
        </Link>
    );
}

// ── Imagen con Pie Editorial ────────────────────────────────────────
function BlogImage({ url, alt, caption }) {
    return (
        <figure className="blog-content-image">
            <img src={url} alt={alt || caption || ''} loading="lazy" />
            {caption && (
                <figcaption>
                    <Camera className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{caption}</span>
                </figcaption>
            )}
        </figure>
    );
}

// ── Escala Visual Kelvin ────────────────────────────────────────────
function KelvinScale() {
    return (
        <div className="kelvin-scale-card">
            <div className="scale-header">
                <span className="scale-title">🌡️ Escala de Temperatura Kelvin (K)</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tono de luz</span>
            </div>
            <div className="kelvin-scale-bar" />
            <div className="kelvin-markers">
                <div className="kelvin-marker-item">
                    <span className="k-temp">2700K – 3000K</span>
                    <span className="k-name">Blanco Cálido (Acogedor)</span>
                </div>
                <div className="kelvin-marker-item">
                    <span className="k-temp">4000K</span>
                    <span className="k-name">Blanco Neutro (Trabajo)</span>
                </div>
                <div className="kelvin-marker-item">
                    <span className="k-temp">6000K – 6500K</span>
                    <span className="k-name">Blanco Frío (Técnico)</span>
                </div>
            </div>
        </div>
    );
}

// ── Pros vs Contras ──────────────────────────────────────────────────
function ProsCons({ pros = [], cons = [] }) {
    return (
        <div className="pros-cons-grid">
            <div className="pros-box">
                <p className="box-title">✓ Ventajas</p>
                <ul>
                    {pros.map((p, i) => (
                        <li key={i}><Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> {p}</li>
                    ))}
                </ul>
            </div>
            <div className="cons-box">
                <p className="box-title">✕ Inconvenientes</p>
                <ul>
                    {cons.map((c, i) => (
                        <li key={i}><X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> {c}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ── Acordeón FAQ ─────────────────────────────────────────────────────
function FaqSection({ items = [] }) {
    const [openIndex, setOpenIndex] = useState(null);
    return (
        <div className="blog-faq-section">
            <p className="faq-header-title">❓ Preguntas Frecuentes</p>
            {items.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                    <div key={i} className="faq-item">
                        <button type="button" className="faq-question" onClick={() => setOpenIndex(isOpen ? null : i)}>
                            <span>{item.pregunta}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && <div className="faq-answer">{item.respuesta}</div>}
                    </div>
                );
            })}
        </div>
    );
}

// ── Tarjeta Destacada de Producto ────────────────────────────────────
function ProductShowcaseCard({ titulo, desc, imagen, badge, url }) {
    return (
        <div className="blog-product-card-showcase">
            {imagen && (
                <div className="prod-img-box">
                    <img src={imagen} alt={titulo} />
                </div>
            )}
            <div className="prod-details">
                {badge && <span className="prod-badge"><Sparkles className="w-3 h-3 inline mr-1" />{badge}</span>}
                <h4 className="prod-title">{titulo}</h4>
                <p className="prod-desc">{desc}</p>
                <Link to={url || '/catalogo'} className="inline-flex items-center gap-2 bg-brand-carbon text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-primary transition-all">
                    Ver en catálogo <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────
// Componente principal: renderiza bloques de contenido estructurado.
// ─────────────────────────────────────────────────────────────────────
export default function RichBlogContent({ blocks, html, mostrarTOC = true }) {
    const [headings, setHeadings] = useState([]);
    const containerRef = useRef(null);

    useEffect(() => {
        const hs = [];
        if (blocks) {
            blocks.forEach((b, i) => {
                if (b.type === 'h2') hs.push({ id: `seccion-${i}`, text: b.content });
            });
        } else if (containerRef.current) {
            containerRef.current.querySelectorAll('h2').forEach((el, i) => {
                const id = el.id || `seccion-${i}`;
                el.id = id;
                hs.push({ id, text: el.textContent });
            });
        }
        setHeadings(hs);
    }, [blocks, html]);

    if (blocks) {
        return (
            <div className="blog-rich-content" ref={containerRef}>
                {mostrarTOC && headings.length > 1 && <TableOfContents headings={headings} />}
                {blocks.map((block, i) => {
                    const id = `seccion-${i}`;
                    switch (block.type) {
                        case 'h2':
                            return <h2 key={i} id={id}>{block.content}</h2>;
                        case 'h3':
                            return <h3 key={i} id={id}>{block.content}</h3>;
                        case 'p':
                            return <p key={i}>{block.content}</p>;
                        case 'ul':
                            return <ul key={i}>{block.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
                        case 'ol':
                            return <ol key={i}>{block.items.map((it, j) => <li key={j}>{it}</li>)}</ol>;
                        case 'quote':
                            return <blockquote key={i}>{block.content}</blockquote>;
                        case 'callout':
                            return <Callout key={i} tipo={block.subtipo} titulo={block.titulo}>{block.content}</Callout>;
                        case 'tabla':
                            return <TablaComparativa key={i} cols={block.cols} filas={block.filas} />;
                        case 'pasos':
                            return <GuidePasos key={i} pasos={block.pasos} />;
                        case 'especCard':
                            return <EspecCard key={i} titulo={block.titulo} specs={block.specs} />;
                        case 'productoCTA':
                            return <ProductoCTA key={i} texto={block.texto} url={block.url} />;
                        case 'imagen':
                            return <BlogImage key={i} url={block.url} alt={block.alt} caption={block.caption} />;
                        case 'kelvinScale':
                            return <KelvinScale key={i} />;
                        case 'prosCons':
                            return <ProsCons key={i} pros={block.pros} cons={block.cons} />;
                        case 'faq':
                            return <FaqSection key={i} items={block.items} />;
                        case 'destacadoProducto':
                            return <ProductShowcaseCard key={i} titulo={block.titulo} desc={block.desc} imagen={block.imagen} badge={block.badge} url={block.url} />;
                        case 'html':
                            return <div key={i} dangerouslySetInnerHTML={{ __html: block.content }} />;
                        default:
                            return null;
                    }
                })}
            </div>
        );
    }

    return (
        <div className="blog-rich-content" ref={containerRef}>
            {mostrarTOC && headings.length > 1 && <TableOfContents headings={headings} />}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}

export { Callout, TablaComparativa, GuidePasos, EspecCard, ProductoCTA, BlogImage, KelvinScale, ProsCons, FaqSection, ProductShowcaseCard, TableOfContents };
