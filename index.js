
const fs = require('fs');
const path = require('path');

// ===== CONFIGURACIÓN =====
// Define OWNER_JID en las variables de entorno.
// Ejemplo: 1234567890@s.whatsapp.net
const OWNER_JID = process.env.OWNER_JID || '';

const DATA = path.join(__dirname, 'datos_bot');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function leerArchivo(nombre, inicial) {
    const archivo = path.join(DATA, nombre);

    try {
        if (fs.existsSync(archivo)) {
            return JSON.parse(fs.readFileSync(archivo, 'utf8'));
        }
    } catch (error) {
        console.error(`Error leyendo ${nombre}:`, error.message);
    }

    fs.writeFileSync(archivo, JSON.stringify(inicial, null, 2));
    return inicial;
}

function guardarArchivo(nombre, datos) {
    fs.writeFileSync(
        path.join(DATA, nombre),
        JSON.stringify(datos, null, 2)
    );
}

const roles = leerArchivo('roles.json', {});
const economia = leerArchivo('economia.json', {});
const avisos = leerArchivo('avisos.json', {});

const niveles = {
    usuario: 0,
    verificado: 1,
    helper: 2,
    mod: 3,
    admin: 4,
    'co-owner': 5,
    owner: 6
};

function numero(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function obtenerRol(jid) {
    if (OWNER_JID && numero(jid) === numero(OWNER_JID)) {
        return 'owner';
    }

    return roles[jid] || 'usuario';
}

function tieneRol(jid, minimo) {
    return (niveles[obtenerRol(jid)] ?? 0) >=
        (niveles[minimo] ?? 999);
}

function usuarioEco(jid) {
    if (!economia[jid]) {
        economia[jid] = {
            dinero: 1000,
            banco: 0,
            inventario: {},
            ultimoDaily: 0
        };
    }

    const u = economia[jid];
    u.dinero = Number(u.dinero) || 0;
    u.banco = Number(u.banco) || 0;
    u.inventario ||= {};
    u.ultimoDaily ||= 0;

    return u;
}

function guardarEconomia() {
    guardarArchivo('economia.json', economia);
}

function dinero(valor) {
    return '$' + Math.floor(valor).toLocaleString('en-US');
}

function textoMensaje(msg) {
    const m = msg.message || {};

    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        ''
    ).trim();
}

function jidRemitente(msg) {
    return msg.key.participant ||
        msg.key.remoteJid;
}

function mencionados(msg) {
    return msg.message?.extendedTextMessage
        ?.contextInfo?.mentionedJid || [];
}

async function responder(sock, chat, texto, opciones = {}) {
    return sock.sendMessage(chat, {
        text: texto,
        ...opciones
    });
}

async function esAdminGrupo(sock, chat, jid) {
    if (!chat.endsWith('@g.us')) return false;

    const metadata = await sock.groupMetadata(chat);
    const participante = metadata.participants.find(
        p => numero(p.id) === numero(jid)
    );

    return Boolean(participante?.admin);
}

async function ejecutarComando(sock, msg) {
    const chat = msg.key.remoteJid;
    const autor = jidRemitente(msg);
    const texto = textoMensaje(msg);

    if (!texto.startsWith('!')) return;

    const partes = texto.slice(1).trim().split(/\s+/);
    const comando = (partes.shift() || '').toLowerCase();
    const args = partes;
    const menciones = mencionados(msg);
    const grupo = chat.endsWith('@g.us');

    const responderAqui = t => responder(sock, chat, t);
    const guardarRoles = () =>
        guardarArchivo('roles.json', roles);

    try {
        switch (comando) {
            // ===== GENERAL =====

            case 'menu':
            case 'ayuda':
                return responderAqui(
`╭━━━ *GREENVILLENIGHT FF* ━━━╮
┃ 🤖 !ping
┃ 👤 !perfil
┃ 🎭 !mirol
┃ 📋 !roles
┃ 💰 !dinero
┃ 🎁 !daily
┃ 🛠️ !trabajar
┃ 🏦 !depositar cantidad
┃ 💸 !retirar cantidad
┃ 🤝 !pagar cantidad @usuario
┃ 🥷 !robar @usuario
┃ 🛒 !tienda
┃ 🛍️ !comprar artículo
┃ 🎒 !inventario
┃ 🏆 !top
┃ ⚠️ !warn @usuario motivo
┃ 📄 !warns @usuario
┃ 👢 !kick @usuario
┃ 📢 !todos mensaje
┃ 🔒 !cerrar
┃ 🔓 !abrir
┃ 🔗 !link
┃ 🏅 !asignar @usuario rol
╰━━━━━━━━━━━━━━━━━━━━━━╯`
                );

            case 'ping':
                return responderAqui('🏓 Pong! GreenvilleNight FF está activo.');

            case 'perfil': {
                const u = usuarioEco(autor);
                guardarEconomia();

                return responderAqui(
`👤 *PERFIL*
Número: ${numero(autor)}
Rol: ${obtenerRol(autor)}
Dinero: ${dinero(u.dinero)}
Banco: ${dinero(u.banco)}`
                );
            }

            case 'mirol':
                return responderAqui(
                    `🎭 Tu rol es: *${obtenerRol(autor)}*`
                );

            case 'roles':
                return responderAqui(
                    '📋 *ROLES DISPONIBLES*\n' +
                    Object.entries(niveles)
                        .map(([rol, nivel]) => `${nivel}. ${rol}`)
                        .join('\n')
                );

            // ===== ECONOMÍA =====

            case 'dinero':
            case 'balance': {
                const u = usuarioEco(autor);
                guardarEconomia();

                return responderAqui(
                    `💰 Efectivo: ${dinero(u.dinero)}\n🏦 Banco: ${dinero(u.banco)}`
                );
            }

            case 'daily': {
                const u = usuarioEco(autor);
                const ahora = Date.now();
                const espera = 24 * 60 * 60 * 1000;
                const restante = espera - (ahora - u.ultimoDaily);

                if (restante > 0) {
                    const horas = Math.ceil(restante / 3600000);
                    return responderAqui(
                        `⏳ Ya reclamaste tu recompensa. Vuelve en ${horas} hora(s).`
                    );
                }

                const premio = 1000 + Math.floor(Math.random() * 4001);
                u.dinero += premio;
                u.ultimoDaily = ahora;
                guardarEconomia();

                return responderAqui(
                    `🎁 Recibiste ${dinero(premio)}. ¡Vuelve mañana!`
                );
            }

            case 'trabajar': {
                const u = usuarioEco(autor);
                const trabajos = [
                    'mecánico',
                    'taxista',
                    'repartidor',
                    'guardia de seguridad',
                    'conductor'
                ];

                const trabajo =
                    trabajos[Math.floor(Math.random() * trabajos.length)];
                const premio = 200 + Math.floor(Math.random() * 801);

                u.dinero += premio;
                guardarEconomia();

                return responderAqui(
                    `🛠️ Trabajaste como ${trabajo} y ganaste ${dinero(premio)}.`
                );
            }

            case 'depositar': {
                const u = usuarioEco(autor);
                const cantidad = Number(args[0]);

                if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
                    return responderAqui('Uso: !depositar 500');
                }

                if (cantidad > u.dinero) {
                    return responderAqui('❌ No tienes suficiente efectivo.');
                }

                u.dinero -= cantidad;
                u.banco += cantidad;
                guardarEconomia();

                return responderAqui(
                    `🏦 Depositaste ${dinero(cantidad)}.`
                );
            }

            case 'retirar': {
                const u = usuarioEco(autor);
                const cantidad = Number(args[0]);

                if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
                    return responderAqui('Uso: !retirar 500');
                }

                if (cantidad > u.banco) {
                    return responderAqui('❌ No tienes suficiente dinero en el banco.');
                }

                u.banco -= cantidad;
                u.dinero += cantidad;
                guardarEconomia();

                return responderAqui(
                    `💵 Retiraste ${dinero(cantidad)}.`
                );
            }

            case 'pagar': {
                const objetivo = menciones[0];
                const cantidad = Number(args.find(
                    a => /^\d+$/.test(a)
                ));

                if (!objetivo) {
                    return responderAqui('Uso: !pagar 500 @usuario');
                }

                if (numero(objetivo) === numero(autor)) {
                    return responderAqui('❌ No puedes pagarte a ti mismo.');
                }

                if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
                    return responderAqui('❌ Indica una cantidad válida.');
                }

                const emisor = usuarioEco(autor);
                const receptor = usuarioEco(objetivo);

                if (cantidad > emisor.dinero) {
                    return responderAqui('❌ No tienes suficiente dinero.');
                }

                emisor.dinero -= cantidad;
                receptor.dinero += cantidad;
                guardarEconomia();

                return responderAqui(
                    `🤝 Enviaste ${dinero(cantidad)} a @${numero(objetivo)}.`,
                    { mentions: [objetivo] }
                );
            }

            case 'robar': {
                const objetivo = menciones[0];

                if (!objetivo) {
                    return responderAqui('Uso: !robar @usuario');
                }

                if (numero(objetivo) === numero(autor)) {
                    return responderAqui('❌ No puedes robarte a ti mismo.');
                }

                const ladron = usuarioEco(autor);
                const victima = usuarioEco(objetivo);

                if (victima.dinero < 100) {
                    return responderAqui('😅 Esa persona no tiene suficiente efectivo.');
                }

                if (Math.random() < 0.5) {
                    const botin = Math.min(
                        victima.dinero,
                        100 + Math.floor(Math.random() * 401)
                    );

                    victima.dinero -= botin;
                    ladron.dinero += botin;
                    guardarEconomia();

                    return responderAqui(
                        `🥷 ¡Robo exitoso! Ganaste ${dinero(botin)}.`
                    );
                }

                const multa = Math.min(
                    ladron.dinero,
                    100 + Math.floor(Math.random() * 201)
                );

                ladron.dinero -= multa;
                guardarEconomia();

                return responderAqui(
                    `🚔 Te atraparon. Pagaste una multa de ${dinero(multa)}.`
                );
            }

            case 'tienda':
                return responderAqui(
`🛒 *TIENDA*
1. teléfono — 500
2. coche — 5000
3. casa — 15000

Usa !comprar teléfono
Usa !comprar coche
Usa !comprar casa`
                );

            case 'comprar': {
                const articulos = {
                    telefono: 500,
                    coche: 5000,
                    casa: 15000
                };

                const articulo = (args[0] || '').toLowerCase();
                const precio = articulos[articulo];

                if (!precio) {
                    return responderAqui(
                        '❌ Artículo desconocido. Usa !tienda.'
                    );
                }

                const u = usuarioEco(autor);

                if (u.dinero < precio) {
                    return responderAqui('❌ No tienes suficiente dinero.');
                }

                u.dinero -= precio;
                u.inventario[articulo] =
                    (u.inventario[articulo] || 0) + 1;

                guardarEconomia();

                return responderAqui(
                    `🛍️ Compraste ${articulo} por ${dinero(precio)}.`
                );
            }

            case 'inventario': {
                const u = usuarioEco(autor);
                const items = Object.entries(u.inventario);

                guardarEconomia();

                return responderAqui(
                    items.length
                        ? '🎒 *TU INVENTARIO*\n' +
                          items.map(([item, cantidad]) =>
                              `• ${item}: ${cantidad}`
                          ).join('\n')
                        : '🎒 Tu inventario está vacío.'
                );
            }

            case 'top': {
                const lista = Object.entries(economia)
                    .sort((a, b) =>
                        (Number(b[1].dinero) || 0) -
                        (Number(a[1].dinero) || 0)
                    )
                    .slice(0, 10);

                if (!lista.length) {
                    return responderAqui('Todavía no hay jugadores en el ranking.');
                }

                return responderAqui(
                    '🏆 *TOP 10 RICOS*\n' +
                    lista.map(([jid, u], i) =>
                        `${i + 1}. ${numero(jid)} — ${dinero(u.dinero || 0)}`
                    ).join('\n')
                );
            }

            // ===== ROLES PERSONALIZADOS =====

            case 'asignar': {
                if (!tieneRol(autor, 'owner')) {
                    return responderAqui('⛔ Solo el propietario puede asignar roles.');
                }

                const objetivo = menciones[0];
                const rol = (args.find(a =>
                    Object.prototype.hasOwnProperty.call(niveles, a.toLowerCase())
                ) || '').toLowerCase();

                if (!objetivo || !rol) {
                    return responderAqui(
                        'Uso: !asignar @usuario admin\nRoles: verificado, helper, mod, admin, co-owner, owner'
                    );
                }

                if (rol === 'owner' && (!OWNER_JID ||
                    numero(autor) !== numero(OWNER_JID))) {
                    return responderAqui('⛔ No puedes asignar el rol owner.');
                }

                if (numero(objetivo) === numero(autor) && rol !== 'usuario') {
                    return responderAqui('❌ No puedes asignarte ese rol a ti mismo.');
                }

                roles[objetivo] = rol;
                guardarRoles();

                return responderAqui(
                    `✅ Rol *${rol}* asignado a @${numero(objetivo)}.`,
                    { mentions: [objetivo] }
                );
            }

            // ===== MODERACIÓN =====

            case 'kick': {
                if (!grupo) {
                    return responderAqui('Este comando solo funciona en grupos.');
                }

                if (!tieneRol(autor, 'mod') &&
                    !(await esAdminGrupo(sock, chat, autor))) {
                    return responderAqui('⛔ Necesitas ser moderador o administrador.');
                }

                if (!(await esAdminGrupo(sock, chat, autor))) {
                    return responderAqui('❌ Para expulsar, también necesitas ser administrador de WhatsApp.');
                }

                const objetivo = menciones[0];

                if (!objetivo) {
                    return responderAqui('Uso: !kick @usuario');
                }

                if (numero(objetivo) === numero(autor)) {
                    return responderAqui('❌ No puedes expulsarte a ti mismo.');
                }

                await sock.groupParticipantsUpdate(
                    chat, [objetivo], 'remove'
                );

                return responderAqui('👢 Participante expulsado.');
            }

            case 'todos': {
                if (!grupo) {
                    return responderAqui('Este comando solo funciona en grupos.');
                }

                if (!tieneRol(autor, 'mod') &&
                    !(await esAdminGrupo(sock, chat, autor))) {
                    return responderAqui('⛔ No tienes permiso.');
                }

                const metadata = await sock.groupMetadata(chat);
                const jids = metadata.participants.map(p => p.id);

                return responder(
                    sock,
                    chat,
                    `📢 *ATENCIÓN DEL GRUPO*\n${args.join(' ') || 'Todos'}\n\n` +
                    jids.map(j => `@${numero(j)}`).join(' '),
                    { mentions: jids }
                );
            }

            case 'cerrar':
            case 'abrir': {
                if (!grupo) {
                    return responderAqui('Este comando solo funciona en grupos.');
                }

                if (!(await esAdminGrupo(sock, chat, autor))) {
                    return responderAqui('⛔ Necesitas ser administrador del grupo.');
                }

                await sock.groupSettingUpdate(
                    chat,
                    comando === 'cerrar' ? 'announcement' : 'not_announcement'
                );

                return responderAqui(
                    comando === 'cerrar'
                        ? '🔒 Solo los administradores pueden escribir.'
                        : '🔓 Todos los participantes pueden escribir.'
                );
            }

            case 'link': {
                if (!grupo) {
                    return responderAqui('Este comando solo funciona en grupos.');
                }

                if (!(await esAdminGrupo(sock, chat, autor))) {
                    return responderAqui('⛔ Necesitas ser administrador del grupo.');
                }

                const codigo = await sock.groupInviteCode(chat);

                return responderAqui(
                    `🔗 Enlace de invitación:\nhttps://chat.whatsapp.com/${codigo}`
                );
            }

            case 'warn': {
                if (!grupo) {
                    return responderAqui('Este comando solo funciona en grupos.');
                }

                if (!tieneRol(autor, 'mod') &&
                    !(await esAdminGrupo(sock, chat, autor))) {
                    return responderAqui('⛔ No tienes permiso para advertir.');
                }

                const objetivo = menciones[0];

                if (!objetivo) {
                    return responderAqui('Uso: !warn @usuario motivo');
                }

                avisos[objetivo] ||= [];
                avisos[objetivo].push({
                    motivo: args.filter(a => !a.startsWith('@')).join(' ') ||
                        'Sin motivo especificado',
                    fecha: new Date().toISOString(),
                    grupo: chat
                });

                guardarArchivo('avisos.json', avisos);

                return responderAqui(
                    `⚠️ @${numero(objetivo)} recibió una advertencia. Total: ${avisos[objetivo].length}.`,
                    { mentions: [objetivo] }
                );
            }

            case 'warns': {
                const objetivo = menciones[0] || autor;
                const lista = (avisos[objetivo] || [])
                    .filter(a => a.grupo === chat);

                return responderAqui(
                    lista.length
                        ? `📄 *ADVERTENCIAS DE ${numero(objetivo)}*\n` +
                          lista.map((a, i) =>
                              `${i + 1}. ${a.motivo} (${a.fecha.slice(0, 10)})`
                          ).join('\n')
                        : '✅ Este usuario no tiene advertencias registradas aquí.'
                );
            }

            default:
                return;
        }
    } catch (error) {
        console.error(`Error en !${comando}:`, error);
        return responderAqui(
            '❌ Ocurrió un error al ejecutar el comando. Revisa la consola.'
        );
    }
}

module.exports = { ejecutarComando };
(startbot)