/**
 * Módulo de detección y protección contra bots para registros y formularios.
 * 100% transparente para usuarios legítimos (sin captchas invasivos).
 */

/**
 * Detecta nombres sospechosos generados automáticamente por bots:
 * - Cadenas de más de 14 caracteres sin ningún espacio (ej. "hNlbdiqjmOgTLvslyysp").
 * - Cadenas con mayúsculas incrustadas de forma aleatoria (ej. "scbjqbfAlEyysstJ").
 * - Agrupaciones no naturales de consonantes consecutivas (ej. "Jtgdmp" -> 5+ consonantes).
 */
export function isSuspiciousName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();

    // 1. Longitud mayor a 25 caracteres sin un solo espacio (bots que envían hashes aleatorios)
    if (!trimmed.includes(' ') && trimmed.length > 25) {
        return true;
    }

    // 2. Mayúsculas aleatorias en medio de palabras (al menos 4 mayúsculas no iniciales en una sola palabra)
    const words = trimmed.split(/\s+/);
    for (const word of words) {
        if (word.length > 12) {
            const middlePart = word.slice(1);
            const uppercaseInMiddle = (middlePart.match(/[A-Z]/g) || []).length;
            if (uppercaseInMiddle >= 4) return true;
        }

        // 3. 7 o más consonantes consecutivas (excluyendo 'y' que actúa como vocal en muchos idiomas y apellidos)
        if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{7,}/.test(word)) {
            return true;
        }
    }

    return false;
}

/**
 * Detecta correos con patrones spam conocidos:
 * - Técnica 'dot-trick' abusiva (5 o más puntos en la parte del usuario antes del @).
 */
export function isSuspiciousEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const username = parts[0];
    const dotCount = (username.match(/\./g) || []).length;
    if (dotCount >= 5) return true;

    return false;
}

/**
 * Evalúa si una petición de registro en el frontend proviene de un bot.
 * 
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.fullName
 * @param {string} params.honeypot Valor del campo trampa invisible
 * @param {number} [params.formStartTime] Timestamp (ms) de cuando se montó el formulario
 * @returns {boolean} true si es bot, false si es un usuario legítimo
 */
export function isBotRegistration({ email, fullName, honeypot, formStartTime }) {
    // 1. Trampa Honeypot: si el campo invisible contiene cualquier valor no vacío
    if (honeypot && typeof honeypot === 'string' && honeypot.trim().length > 0) {
        return true;
    }

    // 2. Trampa de tiempo (Time-trap): Un script automatizado envía en <400ms.
    // 400ms es seguro para permitir que humanos usando autocompletar de navegador no sean bloqueados.
    if (formStartTime && typeof formStartTime === 'number') {
        const elapsed = Date.now() - formStartTime;
        if (elapsed < 400) {
            return true;
        }
    }

    // 3. Heurística de nombre falso/aleatorio (cadenas de hash o patrones bot)
    if (isSuspiciousName(fullName)) {
        return true;
    }

    // 4. Heurística de correo falso (dot-trick abusivo)
    if (isSuspiciousEmail(email)) {
        return true;
    }

    return false;
}

/**
 * Identifica si un perfil existente en la base de datos es un bot sospechoso.
 * Usado en el panel de administración para alertar y permitir limpieza rápida.
 */
export function isBotProfile(profile) {
    if (!profile) return false;
    if (profile.role && profile.role !== 'customer') return false; // Los administradores no son bots

    if (isSuspiciousName(profile.full_name)) return true;
    if (isSuspiciousEmail(profile.email)) return true;
    if (isSuspiciousName(profile.company_name)) return true;

    return false;
}
