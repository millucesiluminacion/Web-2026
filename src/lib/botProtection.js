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

    // 1. Longitud mayor a 14 caracteres sin un solo espacio
    if (!trimmed.includes(' ') && trimmed.length > 14) {
        return true;
    }

    // 2. Mayúsculas aleatorias en medio de palabras (al menos 3 mayúsculas no iniciales en una sola palabra)
    const words = trimmed.split(/\s+/);
    for (const word of words) {
        if (word.length > 10) {
            const middlePart = word.slice(1);
            const uppercaseInMiddle = (middlePart.match(/[A-Z]/g) || []).length;
            if (uppercaseInMiddle >= 3) return true;
        }

        // 3. 5 o más consonantes consecutivas (en español/inglés normal es casi inexistente)
        if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(word)) {
            return true;
        }
    }

    return false;
}

/**
 * Detecta correos con patrones spam conocidos:
 * - Técnica 'dot-trick' abusiva (4 o más puntos en la parte del usuario antes del @).
 */
export function isSuspiciousEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const username = parts[0];
    const dotCount = (username.match(/\./g) || []).length;
    if (dotCount >= 4) return true;

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
    // 1. Trampa Honeypot: si el campo invisible contiene cualquier valor, es un bot 100% seguro.
    if (honeypot && typeof honeypot === 'string' && honeypot.trim().length > 0) {
        return true;
    }

    // 2. Trampa de tiempo (Time-trap): Un humano no rellena los campos en menos de 1,4 segundos.
    if (formStartTime && typeof formStartTime === 'number') {
        const elapsed = Date.now() - formStartTime;
        if (elapsed < 1400) {
            return true;
        }
    }

    // 3. Heurística de nombre falso/aleatorio
    if (isSuspiciousName(fullName)) {
        return true;
    }

    // 4. Heurística de correo falso
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
