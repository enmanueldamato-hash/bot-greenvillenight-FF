const express = require('express');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeData = null;
let isConnected = false;
let sock = null;

const DATA_DIR = './data';
const DATA_FILE = path.join(DATA_DIR, 'bot.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error leyendo datos:', error.message);
  }

  return {
    grupos: {},
    comandos: {},
    dinero: {},
    niveles: {}
  };
}

let db = loadData();

db.grupos ||= {};
db.comandos ||= {};
db.dinero ||= {};
db.niveles ||= {};

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error guardando datos:', error.message);
  }
}

// ===== PÁGINA DEL BOT Y CÓDIGO QR =====

app.get('/', async (req, res) => {
  if (isConnected) {
    return res.send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width">
        </head>
        <body style="background:#080808;color:#00ff88;text-align:center;font-family:Arial;padding:35px">
          <h1>🔥 GreenvilleNight FF</h1>
          <h2>🟢 BOT CONECTADO</h2>
          <p>El servidor está funcionando.</p>
        </body>
      </html>
    `);
  }

  if (qrCodeData) {
    try {
      const qr = await QRCode.toDataURL(qrCodeData);

      return res.send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
          </head>
          <body style="background:#080808;color:white;text-align:center;font-family:Arial;padding:20px">
            <h1>🔥 GreenvilleNight FF</h1>
            <h3>Escanea el QR desde WhatsApp</h3>
            <img src="${qr}" style="max-width:100%;width:300px">
            <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
          </body>
        </html>
      `);
    } catch (error) {
      return res.status(500).send('No se pudo generar el QR.');
    }
  }

  res.send(`
    <html>
      <head>
        <meta name="viewport" content="width=device-width">
      </head>
      <body style="background:#080808;color:white;text-align:center;font-family:Arial;padding:35px">
        <h1>🔥 GreenvilleNight FF</h1>
        <p>Esperando el código QR de WhatsApp...</p>
        <p>Actualiza esta página en unos segundos.</p>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    bot: 'GreenvilleNight FF',
    connected: isConnected,
    qrAvailable: Boolean(qrCodeData)
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

// ===== FUNCIONES PRINCIPALES =====

function getText(message) {
  const m = message.message || {};

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  ).trim();
}

function getSenderJid(message) {
  return message.key.participant ||
    message.key.remoteJid ||
    '';
}

function normalizeJid(jid) {
  return String(jid || '').replace(/:\d+@/, '@');
}

function getGroupData(groupJid) {
  if (!db.grupos[groupJid]) {
    db.grupos[groupJid] = {
      bienvenidas: true,
      admins: [],
      advertencias: {},
      bloqueado: false
    };
  }

  return db.grupos[groupJid];
}

function getUserMoney(jid) {
  if (db.dinero[jid] == null) {
    db.dinero[jid] = 100;
  }

  return db.dinero[jid];
}

function getMentioned(message) {
  return (
    message.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    message.message?.imageMessage?.contextInfo?.mentionedJid ||
    message.message?.videoMessage?.contextInfo?.mentionedJid ||
    []
  );
}

async function isGroupAdmin(groupJid, userJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const normalizedUser = normalizeJid(userJid);

  const participant = metadata.participants.find(
    p => normalizeJid(p.id) === normalizedUser
  );

  return Boolean(
    participant &&
    (participant.admin === 'admin' ||
      participant.admin === 'superadmin')
  );
}

async function isBotAdmin(groupJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const botJid = normalizeJid(sock.user?.id);

  const participant = metadata.participants.find(
    p => normalizeJid(p.id) === botJid
  );

  return Boolean(
    participant &&
    (participant.admin === 'admin' ||
      participant.admin === 'superadmin')
  );
}

// ===== REGLAS DEL GRUPO =====

function getRules() {
  return `╔══════════════════════════╗
     📜 *REGLAS DEL GRUPO*
       🔥 GREENVILLENIGHT FF
╚══════════════════════════╝

1️⃣ *RESPETO*
Respeta a todos los miembros. Nada de insultos graves, acoso ni amenazas.

2️⃣ *NO SPAM*
No envíes mensajes repetidos, cadenas ni inundes el chat.

3️⃣ *PROHIBIDO EL FLOOD*
Evita enviar demasiados mensajes, emojis o stickers seguidos.

4️⃣ *NO PUBLICIDAD*
No publiques enlaces ni promociones sin permiso de los administradores.

5️⃣ *CONTENIDO APROPIADO*
No compartas contenido ofensivo, ilegal o que incomode a los demás.

6️⃣ *OBEDECE A LOS ADMINS*
Respeta las decisiones de los administradores y sus indicaciones.

7️⃣ *NADA DE PELEAS*
Los problemas personales se resuelven por privado, sin conflictos en el grupo.

8️⃣ *PROTEGE TU PRIVACIDAD*
No compartas información personal de otros miembros sin autorización.

9️⃣ *USA LOS COMANDOS CORRECTAMENTE*
Escribe !menu para consultar los comandos disponibles del bot.

🔟 *CONSECUENCIAS*
Quien incumpla las reglas puede recibir una advertencia o ser expulsado por los administradores.

━━━━━━━━━━━━━━━━━━━━
💙 ¡Respeta!
;
}
