const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require('pino');
const QRCode = require('qrcode'); // Para generar QR en web
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const app = express();

// ====== QR LINK - NUEVO - NUNCA SE APAGA CADA 5 SEG ======
let latestQR = null;
let isConnected = false;

app.get('/', (_, res) => {
  res.send(`
  <html>
  <head><meta charset="utf-8"><title>THE BLACK EMPIRE RP - GREENVILLENIGHT FF</title>
  <style>body{font-family:Arial;background:#111;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh} a{color:#0f0;font-size:20px} .box{background:#222;padding:30px;border-radius:15px;text-align:center} img{max-width:90vw;border:5px solid #0f0;border-radius:10px}</style>
  </head>
  <body>
  <div class="box">
  <h1>👑 THE BLACK EMPIRE RP - GREENVILLENIGHT FF</h1>
  <h2>🌃 Greenville Roblox</h2>
  <p>Estado: ${isConnected ? '✅ CONECTADO - NUNCA SE APAGA' : '⏳ Esperando QR...'}</p>
  <p><a href="/qr">📱 PICA AQUI PARA VER EL QR - /qr</a></p>
  <p>Link directo: <b>/qr</b></p>
  <p>Responde cada 5 segundos - Nunca se apaga</p>
  <p><a href="/health">/health - Estado</a></p>
  </div>
  </body>
  </html>
  `);
});

app.get('/qr', async (_, res) => {
  if (isConnected) {
    return res.send('<h1>✅ BOT YA CONECTADO - GREENVILLENIGHT FF VIVO 24/7 - NUNCA SE APAGA</h1><p><a href="/">Volver</a></p>');
  }
  if (!latestQR) {
    return res.send('<h1>⏳ Generando QR... espera 5 segundos y recarga</h1><script>setTimeout(()=>location.reload(),5000)</script><p><a href="/">Inicio</a></p>');
  }
  try {
    const qrImage = await QRCode.toDataURL(latestQR);
    res.send(`
      <html><head><meta charset="utf-8"><title>QR - BLACK EMPIRE RP</title>
      <style>body{background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial} img{width:350px;height:350px;border:10px solid #fff;border-radius:15px} .box{text-align:center;background:#111;padding:20px;border-radius:15px}</style>
      </head>
      <body>
      <div class="box">
      <h1>📱 ESCANEA ESTE QR - GREENVILLENIGHT FF</h1>
      <img src="${qrImage}" />
      <h2>👑 THE BLACK EMPIRE RP</h2>
      <p>Greenville Wisconsin - Nunca se apaga - Cada 5 seg</p>
      <p>1. Abre WhatsApp > Dispositivos vinculados > Vincular dispositivo</p>
      <p>2. Escanea este QR</p>
      <p>Se actualiza cada 30 segundos</p>
      <p><a href="/qr" style="color:#0f0">🔄 Recargar QR</a> | <a href="/" style="color:#0f0">Inicio</a></p>
      </div>
      <script>setTimeout(()=>location.reload(),30000)</script>
      </body></html>
    `);
  } catch (e) {
    res.send('Error generando QR: '+e.message);
  }
});

app.get('/health', (_, res) => res.json({ ok: true, connected: isConnected, hasQR: !!latestQR, time: new Date(), nuncaSeApaga: true, cada5seg: true }));

app.listen(process.env.PORT || 3000, () =>
  console.log('Servidor iniciado - QR en /qr - NUNCA SE APAGA')
);

const PREFIX = '!';
const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || '')
  .split(',')
  .map(n => n.replace(/\D/g, ''))
  .filter(Boolean);

const DB_FILE = path.join(__dirname, 'black_empire_db.json');
const ROLES = {
  owner: 100,
  'co-owner': 90,
  admin: 70,
  mod: 50,
  verificado: 10,
  miembro: 1
};

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {
      users: {},
      custom: {},
      settings: { welcome: true, paused: false }
    };
  }
}

const db = loadDB();
db.users ||= {};
db.custom ||= {};
db.settings ||= {};
if (db.settings.welcome === undefined) db.settings.welcome = true;
if (db.settings.paused === undefined) db.settings.paused = false;

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function numberOf(jid = '') {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

function getUser(jid) {
  const id = numberOf(jid);
  db.users[id] ||= {
    role: OWNER_NUMBERS.includes(id) ? 'owner' : 'miembro',
    money: 5000,
    bank: 10000,
    xp: 0,
    level: 1,
    warns: 0,
    daily: 0,
    work: 0
  };
  if (OWNER_NUMBERS.includes(id)) db.users[id].role = 'owner';
  return db.users[id];
}

function isOwner(jid) { return getUser(jid).role === 'owner'; }
function hasRole(jid, role) { return (ROLES[getUser(jid).role] || 0) >= ROLES[role]; }
function money(n) { return Number(n || 0).toLocaleString('en-US'); }
function addXP(jid, amount = 1) {
  const u = getUser(jid);
  u.xp += amount;
  while (u.xp >= u.level * 100) { u.xp -= u.level * 100; u.level++; }
}

const commands = new Map();
function command(names, description, handler) {
  for (const name of names.split(/\s+/)) {
    commands.set(name.toLowerCase(), { description, handler });
  }
}
async function send(c, text, extra = {}) {
  return c.sock.sendMessage(c.chat, { text, ...extra });
}
async function requireRole(c, role = 'admin') {
  if (hasRole(c.sender, role)) return true;
  await send(c, `⛔ Necesitas el rol ${role} o superior.`);
  return false;
}

// MENÚ
command('menu help comandos', 'Mostrar comandos', async c => {
  const list = [...commands.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  await send(c, `👑 THE BLACK EMPIRE RP - GREENVILLENIGHT FF\nComandos: ${list.length}\nPrefijo: !\n\n` + list.map(([n, v]) => `!${n} — ${v.description}`).join('\n'));
});
command('ping', 'Probar el bot', c => send(c, '🏓 Pong. Estoy conectado. NUNCA SE APAGA - Cada 5 seg'));
command('info botinfo', 'Información del bot', c => send(c, '👑 THE BLACK EMPIRE RP - GREENVILLENIGHT FF - Greenville Wisconsin - Bot 24/7'));
command('id', 'Mostrar tu ID', c => send(c, `ID: ${c.sender}`));
command('mirol perfil', 'Ver perfil y rol', c => {
  const u = getUser(c.sender);
  return send(c, `👤 ${numberOf(c.sender)}\nRol: ${u.role}\nNivel: ${u.level}\nXP: ${u.xp}\nEfectivo: $${money(u.money)}\nBanco: $${money(u.bank)}\nAdvertencias: ${u.warns}`);
});

// ECONOMÍA
command('dinero balance wallet', 'Consultar dinero', c => {
  const u = getUser(c.sender);
  return send(c, `💵 Efectivo: $${money(u.money)}\n🏦 Banco: $${money(u.bank)}`);
});
command('banco', 'Consultar banco', c => send(c, `🏦 Saldo: $${money(getUser(c.sender).bank)}`));
command('daily diario', 'Recompensa diaria', async c => {
  const u = getUser(c.sender);
  if (Date.now() - u.daily < 86400000) return send(c, '⏳ Ya reclamaste tu recompensa diaria.');
  const reward = 1000 + Math.floor(Math.random() * 1001);
  u.money += reward; u.daily = Date.now(); saveDB();
  await send(c, `🎁 Recibiste $${money(reward)}.`);
});
command('trabajar work', 'Trabajar por dinero', async c => {
  const u = getUser(c.sender);
  if (Date.now() - u.work < 3600000) return send(c, '⏳ Puedes trabajar una vez por hora.');
  const jobs = ['mecánico', 'taxista', 'repartidor', 'paramédico', 'abogado'];
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const pay = 300 + Math.floor(Math.random() * 701);
  u.money += pay; u.work = Date.now(); addXP(c.sender, 15); saveDB();
  await send(c, `🧰 Trabajaste de ${job} y ganaste $${money(pay)}. +15 XP.`);
});
command('depositar dep', 'Depositar dinero', async c => {
  const amount = Number(c.args[0]); const u = getUser(c.sender);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > u.money) return send(c, 'Uso: !depositar cantidad');
  u.money -= amount; u.bank += amount; saveDB();
  await send(c, `🏦 Depositaste $${money(amount)}.`);
});
command('retirar', 'Retirar dinero', async c => {
  const amount = Number(c.args[0]); const u = getUser(c.sender);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > u.bank) return send(c, 'Uso: !retirar cantidad');
  u.bank -= amount; u.money += amount; saveDB();
  await send(c, `💵 Retiraste $${money(amount)}.`);
});
command('top topdinero ranking', 'Ranking económico', c => {
  const rows = Object.entries(db.users).sort((a, b) => (b[1].money + b[1].bank) - (a[1].money + a[1].bank)).slice(0, 10);
  return send(c, '🏆 TOP ECONOMÍA\n' + (rows.map(([id, u], i) => `${i + 1}. ${id}: $${money(u.money + u.bank)}`).join('\n') || 'No hay jugadores todavía.'));
});
command('dar', 'Dar dinero (admin+)', async c => {
  if (!await requireRole(c)) return;
  const id = (c.args[0] || '').replace(/\D/g, ''); const amount = Number(c.args[1]);
  if (!id || !Number.isSafeInteger(amount) || amount <= 0) return send(c, 'Uso: !dar numero cantidad');
  getUser(`${id}@s.whatsapp.net`).money += amount; saveDB();
  await send(c, `✅ Añadiste $${money(amount)} a ${id}.`);
});

// ROLES
command('roles', 'Mostrar jerarquía de roles', c => send(c, '👑 owner: dueño\nco-owner: copropietario\nadmin: administrador\nmod: moderador\nverificado: usuario verificado\nmiembro: miembro'));
command('asignar', 'Asignar rol (dueño)', async c => {
  if (!isOwner(c.sender)) return send(c, '⛔ Solo el dueño.');
  const id = (c.args[0] || '').replace(/\D/g, ''); const role = (c.args[1] || '').toLowerCase();
  if (!id || !Object.hasOwn(ROLES, role)) return send(c, 'Uso: !asignar numero owner|co-owner|admin|mod|verificado|miembro');
  if (OWNER_NUMBERS.includes(id) && role !== 'owner') return send(c, '⛔ No puedes cambiar el rol protegido de un dueño configurado.');
  getUser(`${id}@s.whatsapp.net`).role = role; saveDB();
  await send(c, `✅ ${id} ahora tiene el rol ${role}.`);
});
command('admins', 'Mostrar personal registrado', c => {
  const staff = Object.entries(db.users).filter(([, u]) => (ROLES[u.role] || 0) >= ROLES.mod);
  return send(c, '🛡️ PERSONAL\n' + (staff.map(([id, u]) => `${u.role}: ${id}`).join('\n') || 'No hay personal registrado.'));
});

// MODERACIÓN - TODO MUTE UNMUTE
command('cerrar mute mutar silenciar chatoff silencio voff vozoff audiooff audiosoff', 'Cerrar/Mutear grupo (admin+)', async c => {
  if (!await requireRole(c)) return;
  try { await c.sock.groupSettingUpdate(c.chat, 'announcement'); await send(c, '🔒 Grupo cerrado/muteado. !abrir para abrir'); } catch { await send(c, 'No se pudo cerrar. Comprueba que el bot sea administrador.'); }
});
command('abrir unmute desmutar desilenciar chaton ruido von vozon audioon audioson', 'Abrir/Desmutear grupo (admin+)', async c => {
  if (!await requireRole(c)) return;
  try { await c.sock.groupSettingUpdate(c.chat, 'not_announcement'); await send(c, '🔓 Grupo abierto/desmuteado. !cerrar para cerrar'); } catch { await send(c, 'No se pudo abrir. Comprueba que el bot sea administrador.'); }
});
command('link', 'Obtener enlace del grupo (mod+)', async c => {
  if (!await requireRole(c, 'mod')) return;
  try { const code = await c.sock.groupInviteCode(c.chat); await send(c, `🔗 https://chat.whatsapp.com/${code}`); } catch { await send(c, 'No se pudo obtener el enlace.'); }
});
command('tagall todos', 'Mencionar miembros (mod+)', async c => {
  if (!await requireRole(c, 'mod')) return;
  try { const group = await c.sock.groupMetadata(c.chat); const mentions = group.participants.map(p => p.id); await send(c, '📣 Atención comunidad\n' + mentions.map(j => '@' + numberOf(j)).join(' '), { mentions }); } catch { await send(c, 'Este comando solo funciona en grupos.'); }
});
command('kick expulsar', 'Expulsar miembro (admin+)', async c => {
  if (!await requireRole(c)) return;
  const id = (c.args[0] || '').replace(/\D/g, ''); if (!id) return send(c, 'Uso: !kick numero');
  try { await c.sock.groupParticipantsUpdate(c.chat, [`${id}@s.whatsapp.net`], 'remove'); await send(c, `Solicitud de expulsión enviada para ${id}.`); } catch { await send(c, 'No se pudo expulsar.'); }
});
command('promote', 'Hacer administrador (admin+)', async c => {
  if (!await requireRole(c)) return;
  const id = (c.args[0] || '').replace(/\D/g, ''); if (!id) return send(c, 'Uso: !promote numero');
  try { await c.sock.groupParticipantsUpdate(c.chat, [`${id}@s.whatsapp.net`], 'promote'); await send(c, 'Solicitud de promoción enviada.'); } catch { await send(c, 'No se pudo promover.'); }
});
command('demote', 'Quitar administrador (admin+)', async c => {
  if (!await requireRole(c)) return;
  const id = (c.args[0] || '').replace(/\D/g, ''); if (!id) return send(c, 'Uso: !demote numero');
  try { await c.sock.groupParticipantsUpdate(c.chat, [`${id}@s.whatsapp.net`], 'demote'); await send(c, 'Solicitud para quitar administrador enviada.'); } catch { await send(c, 'No se pudo quitar.'); }
});
command('warn advertir', 'Añadir advertencia (mod+)', async c => {
  if (!await requireRole(c, 'mod')) return;
  const id = (c.args[0] || '').replace(/\D/g, ''); if (!id) return send(c, 'Uso: !warn numero');
  const u = getUser(`${id}@s.whatsapp.net`); u.warns++; saveDB(); await send(c, `⚠️ ${id}: ${u.warns}/3 advertencias.`);
});
command('warns advertencias', 'Consultar advertencias', c => {
  const id = (c.args[0] || numberOf(c.sender)).replace(/\D/g, '');
  return send(c, `⚠️ ${id}: ${getUser(`${id}@s.whatsapp.net`).warns}/3`);
});
command('resetwarn', 'Reiniciar advertencias (admin+)', async c => {
  if (!await requireRole(c)) return;
  const id = (c.args[0] || '').replace(/\D/g, ''); if (!id) return send(c, 'Uso: !resetwarn numero');
  getUser(`${id}@s.whatsapp.net`).warns = 0; saveDB(); await send(c, `Advertencias de ${id} reiniciadas.`);
});
command('bienvenida', 'Activar/desactivar bienvenida (admin+)', async c => {
  if (!await requireRole(c)) return;
  const value = (c.args[0] || '').toLowerCase();
  if (!['on', 'off'].includes(value)) return send(c, 'Uso: !bienvenida on|off');
  db.settings.welcome = value === 'on'; saveDB();
  await send(c, `Bienvenida ${value === 'on' ? 'activada' : 'desactivada'}.`);
});
command('reglas normas', 'Mostrar reglas', c => send(c, '📜 REGLAS — THE BLACK EMPIRE RP\n1. Respeta a todos.\n2. No hagas spam.\n3. No acoses ni amenaces.\n4. No compartas datos privados.\n5. Respeta al personal.\n6. No publiques enlaces peligrosos.\n7. Respeta la temática del grupo.'));
command('reportar reporte', 'Enviar reporte', c => send(c, c.args.length ? `📨 Reporte recibido: ${c.args.join(' ')}` : 'Uso: !reportar explica el problema'));
command('crear', 'Crear respuesta personalizada (admin+)', async c => {
  if (!await requireRole(c)) return;
  const name = (c.args.shift() || '').toLowerCase(); const response = c.args.join(' ');
  if (!name || !response) return send(c, 'Uso: !crear nombre respuesta');
  db.custom[name] = response; saveDB(); await send(c, `✅ Comando !${name} creado.`);
});
command('borrarcmd', 'Borrar comando personalizado (admin+)', async c => {
  if (!await requireRole(c)) return;
  const name = (c.args[0] || '').toLowerCase();
  if (!db.custom[name]) return send(c, 'Ese comando no existe.');
  delete db.custom[name]; saveDB(); await send(c, `🗑️ Comando !${name} eliminado.`);
});
command('xp nivel', 'Consultar nivel', c => {
  const u = getUser(c.sender);
  return send(c, `⭐ Nivel ${u.level}\nXP: ${u.xp}/${u.level * 100}`);
});
command('subirnivel', 'Subir nivel (dueño)', async c => {
  if (!isOwner(c.sender)) return send(c, 'Solo el dueño.');
  const id = (c.args[0] || '').replace(/\D/g, ''); if (!id) return send(c, 'Uso: !subirnivel numero');
  getUser(`${id}@s.whatsapp.net`).level++; saveDB(); await send(c, `Nivel actualizado para ${id}.`);
});
command('bot', 'Pausar/reanudar comandos (dueño)', async c => {
  if (!isOwner(c.sender)) return send(c, 'Solo el dueño.');
  const value = (c.args[0] || '').toLowerCase();
  if (!['on', 'off'].includes(value)) return send(c, 'Uso: !bot on|off');
  db.settings.paused = value === 'off'; saveDB(); await send(c, `Bot ${value === 'on' ? 'activado' : 'pausado'}.`);
});
command('menuadmin', 'Menú administrativo', async c => {
  if (!await requireRole(c)) return;
  await send(c, '!asignar !dar !cerrar !abrir !link !tagall !kick !promote !demote !warn !resetwarn !crear !borrarcmd !bienvenida');
});
command('dado dados', 'Lanzar dado', c => send(c, `🎲 Resultado: ${1 + Math.floor(Math.random() * 6)}`));
command('moneda', 'Lanzar moneda', c => send(c, Math.random() < 0.5 ? '🪙 Cara' : '🪙 Cruz'));
command('suerte', 'Número aleatorio', c => send(c, `🍀 Número: ${1 + Math.floor(Math.random() * 100)}`));
command('chiste', 'Contar un chiste', c => send(c, '¿Por qué el coche fue al taller? Porque estaba cansado de dar vueltas.'));
command('frase', 'Frase de comunidad', c => send(c, '🔥 La lealtad se demuestra con acciones, no con palabras.'));
command('hora fecha', 'Mostrar fecha y hora', c => send(c, new Date().toLocaleString('es-US', { timeZone: 'America/Chicago' })));

// BOT PRINCIPAL
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('black_empire_auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['Greenvillenight FF','Chrome','1.0'],
    keepAliveIntervalMs: 5000,
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      latestQR = qr;
      isConnected = false;
      console.log('📱 QR GENERADO - Ve a /qr para escanear - NUNCA SE APAGA');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada, reconectando... NUNCA SE APAGA');
      isConnected = false;
      latestQR = null;
      if (shouldReconnect) setTimeout(startBot, 2000);
    } else if (connection === 'open') {
      console.log('✅ THE BLACK EMPIRE RP CONECTADO - GREENVILLENIGHT FF - NUNCA SE APAGA');
      isConnected = true;
      latestQR = null;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
    if (!text.startsWith(PREFIX)) return;

    if (db.settings.paused && !isOwner(m.key.participant || m.key.remoteJid)) {
      return;
    }

    const args = text.slice(PREFIX.length).trim().split(/\s+/);
    const name = args.shift().toLowerCase();
    
    if (db.custom[name]) {
      await sock.sendMessage(m.key.remoteJid, { text: db.custom[name] });
      return;
    }

    const cmd = commands.get(name);
    if (!cmd) return;

    const context = {
      sock,
      chat: m.key.remoteJid,
      sender: m.key.participant || m.key.remoteJid,
      args,
      text
    };

    try {
      addXP(context.sender, 1);
      await cmd.handler(context);
      saveDB();
    } catch (e) {
      console.error('Error comando', name, e);
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Error ejecutando comando' });
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    if (!db.settings.welcome) return;
    if (update.action === 'add') {
      try {
        await sock.sendMessage(update.id, { text: `👋 Bienvenido a THE BLACK EMPIRE RP - GREENVILLENIGHT FF 🌃\nUsa !menu para comandos\n!reglas para reglas\n!greenville para jugar Greenville` });
      } catch {}
    }
  });
}

process.on('uncaughtException', e => console.error('NUNCA SE APAGA - Error:', e));
process.on('unhandledRejection', e => console.error('NUNCA SE APAGA - Rechazo:', e));
startBot();
setInterval(() => console.log('🌃 GREENVILLENIGHT FF - BLACK EMPIRE RP VIVO CADA 5 SEG - NUNCA SE APAGA - '+new Date().toISOString()), 5000);
