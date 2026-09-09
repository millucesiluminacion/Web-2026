import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
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
        <div style={{ overflowX: 'auto', margin: '2rem 0' }}>
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

// ─────────────────────────────────────────────────────────────────────
// Componente principal: renderiza bloques de contenido estructurado.
// Los artículos del blog pueden pasar `blocks` (array estructurado)
// o `html` (texto HTML heredado).
// ─────────────────────────────────────────────────────────────────────
export default function RichBlogContent({ blocks, html, mostrarTOC = true }) {
    const [headings, setHeadings] = useState([]);
    const containerRef = useRef(null);

    // Extrae headings del HTML heredado o de los bloques estructurados.
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

    // ── Renderizado de bloques estructurados ─
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
                        case 'html':
                            return <div key={i} dangerouslySetInnerHTML={{ __html: block.content }} />;
                        default:
                            return null;
                    }
                })}
            </div>
        );
    }

    // ── Modo heredado: HTML directo ─
    return (
        <div className="blog-rich-content" ref={containerRef}>
            {mostrarTOC && headings.length > 1 && <TableOfContents headings={headings} />}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}

// Re-exportamos subcomponentes por si se usan individualmente.
export { Callout, TablaComparativa, GuidePasos, EspecCard, ProductoCTA, TableOfContents };
