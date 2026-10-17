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

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error guardando datos:', error.message);
  }
}

app.get('/', async (req, res) => {
  if (isConnected) {
    return res.send(`
      <html>
        <head><meta name="viewport" content="width=device-width"></head>
        <body style="background:#080808;color:#00ff88;text-align:center;font-family:Arial;padding:35px">
          <h1>🟢 GreenvilleNight FF</h1>
          <h2>BOT CONECTADO</h2>
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
          <head><meta name="viewport" content="width=device-width"></head>
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
  if (!db.dinero[jid]) {
    db.dinero[jid] = 100;
  }

  return db.dinero[jid];
}

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['GreenvilleNight FF', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeData = qr;
      console.log('Nuevo QR disponible en la página web.');
    }

    if (connection === 'open') {
      isConnected = true;
      qrCodeData = null;
      console.log('GreenvilleNight FF está conectado a WhatsApp.');
    }

    if (connection === 'close') {
      isConnected = false;

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('Conexión cerrada. Intentando reconectar...');
        setTimeout(() => startBot().catch(console.error), 3000);
      } else {
        console.log(
          'Sesión cerrada. Borra auth_info y vuelve a vincular WhatsApp.'
        );
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      try {
        if (!message.message) continue;

        const jid = message.key.remoteJid;

        if (!jid || jid === 'status@broadcast') continue;

        const text = getText(message);

        if (!text) continue;

        const sender = getSenderJid(message);
        const isGroup = jid.endsWith('@g.us');
        const groupData = isGroup ? getGroupData(jid) : null;
        const prefix = '!';
        const isCommand = text.startsWith(prefix);

        if (isGroup && groupData.bloqueado) continue;

        const args = text.trim().split(/\s+/);
        const command = args[0].slice(prefix.length).toLowerCase();

        async function reply(txt) {
          await sock.sendMessage(jid, { text: txt }, { quoted: message });
        }

        if (!isCommand) {
          if (isGroup && groupData.bienvenidas === false) {
            continue;
          }

          continue;
        }

        if (db.comandos[command]) {
          await reply(
            db.comandos[command].replaceAll('{usuario}', '@' + sender.split('@')[0])
          );
          continue;
        }

        switch (command) {
          case 'menu':
          case 'help':
            await reply(
`🔥 *GREENVILLENIGHT FF*

📌 *GENERAL*
!menu
!ping
!info
!estado
!creador

💰 *ECONOMÍA*
!dinero
!diario
!trabajar
!pagar @persona cantidad

🎮 *JUEGOS*
!dado
!moneda
!perfil

👥 *GRUPO*
!grupo
!admins
!id
!link

🛠️ *ADMINISTRACIÓN*
!advertir @persona
!advertencias
!limpiaradvertencias @persona
!bienvenida on/off
!bloquear
!desbloquear

⚙️ *PERSONALIZACIÓN*
!crear nombre | respuesta
!comandos
!borrarcomando nombre`
            );
            break;

          case 'ping':
            await reply('🏓 Pong! GreenvilleNight FF está activo.');
            break;

          case 'info':
            await reply(
              '🔥 GreenvilleNight FF\nBot de WhatsApp para grupos.\nUsa !menu para ver los comandos.'
            );
            break;

          case 'estado':
            await reply(
              `🟢 Bot activo\nConexión: ${isConnected ? 'Conectado' : 'Desconectado'}`
            );
            break;

          case 'creador':
            await reply('👑 Creador: GreenvilleNight FF');
            break;

          case 'dinero':
            await reply(`💵 Tienes $${getUserMoney(sender)}.`);
            saveData();
            break;

          case 'diario': {
            const today = new Date().toISOString().slice(0, 10);

            if (!db.niveles[sender]) db.niveles[sender] = {};

            if (db.niveles[sender].diario === today) {
              await reply('⏳ Ya reclamaste tu recompensa diaria.');
              break;
            }

            db.niveles[sender].diario = today;
            db.dinero[sender] = getUserMoney(sender) + 250;
            saveData();

            await reply('🎁 Recibiste $250 de recompensa diaria.');
            break;
          }

          case 'trabajar': {
            const cantidad = Math.floor(Math.random() * 151) + 50;

            db.dinero[sender] = getUserMoney(sender) + cantidad;
            saveData();

            await reply(`🧰 Trabajaste y ganaste $${cantidad}.`);
            break;
          }

          case 'pagar': {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const target = mentioned[0];
            const amount = Number(args[args.length - 1]);

            if (!target || !Number.isInteger(amount) || amount <= 0) {
              await reply('Uso: !pagar @persona cantidad');
              break;
            }

            const balance = getUserMoney(sender);

            if (balance < amount) {
              await reply('❌ No tienes suficiente dinero.');
              break;
            }

            db.dinero[sender] = balance - amount;
            db.dinero[target] = getUserMoney(target) + amount;
            saveData();

            await reply(`💸 Transferiste $${amount} a @${target.split('@')[0]}.`);
            break;
          }

          case 'dado': {
            const number = Math.floor(Math.random() * 6) + 1;
            await reply(`🎲 Sacaste un ${number}.`);
            break;
          }

          case 'moneda':
            await reply(Math.random() < 0.5 ? '🪙 Cara' : '🪙 Cruz');
            break;

          case 'perfil':
            await reply(
              `👤 PERFIL\nUsuario: @${sender.split('@')[0]}\nDinero: $${getUserMoney(sender)}`
            );
            break;

          case 'grupo':
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            await reply(`👥 ID del grupo:\n${jid}`);
            break;

          case 'id':
            await reply(`🆔 Tu ID:\n${sender}\nGrupo/chat:\n${jid}`);
            break;

          case 'admins': {
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            const metadata = await sock.groupMetadata(jid);
            const admins = metadata.participants.filter(
              p => p.admin === 'admin' || p.admin === 'superadmin'
            );

            await reply(
              '👑 ADMINISTRADORES\n' +
              (admins.length
                ? admins.map(p => '@' + p.id.split('@')[0]).join('\n')
                : 'No se encontraron administradores.')
            );
            break;
          }

          case 'link': {
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            try {
              const metadata = await sock.groupMetadata(jid);
              const botJid = sock.user.id;
              const botParticipant = metadata.participants.find(
                p => p.id === botJid
              );

              if (
                !botParticipant ||
                (botParticipant.admin !== 'admin' &&
                 botParticipant.admin !== 'superadmin')
              ) {
                await reply('❌ Necesito ser administrador para obtener el enlace.');
                break;
              }

              const code = await sock.groupInviteCode(jid);
              await reply(`🔗 Enlace del grupo:\nhttps://chat.whatsapp.com/${code}`);
            } catch {
              await reply('❌ No pude obtener el enlace del grupo.');
            }

            break;
          }

          case 'advertir': {
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            const metadata = await sock.groupMetadata(jid);
            const botJid = sock.user.id;
            const botParticipant = metadata.participants.find(
              p => p.id === botJid
            );

            if (
              !botParticipant ||
              (botParticipant.admin !== 'admin' &&
               botParticipant.admin !== 'superadmin')
            ) {
              await reply('❌ El bot necesita ser administrador.');
              break;
            }

            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const target = mentioned[0];

            if (!target) {
              await reply('Uso: !advertir @persona');
              break;
            }

            if (!groupData.advertencias[target]) {
              groupData.advertencias[target] = 0;
            }

            groupData.advertencias[target]++;
            saveData();

            await reply(
              `⚠️ @${target.split('@')[0]} recibió una advertencia.\nTotal: ${groupData.advertencias[target]}`
            );
            break;
          }

          case 'advertencias': {
            const warnings = groupData?.advertencias || {};

            await reply(
              '⚠️ ADVERTENCIAS\n' +
              (Object.keys(warnings).length
                ? Object.entries(warnings)
                    .map(([user, count]) => `@${user.split('@')[0]}: ${count}`)
                    .join('\n')
                : 'No hay advertencias.')
            );
            break;
          }

          case 'limpiaradvertencias': {
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const target = mentioned[0];

            if (!target) {
              await reply('Uso: !limpiaradvertencias @persona');
              break;
            }

            groupData.advertencias[target] = 0;
            saveData();

            await reply('✅ Advertencias reiniciadas.');
            break;
          }

          case 'bienvenida': {
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            const option = args[1]?.toLowerCase();

            if (option !== 'on' && option !== 'off') {
              await reply('Uso: !bienvenida on o !bienvenida off');
              break;
            }

            groupData.bienvenidas = option === 'on';
            saveData();

            await reply(`✅ Bienvenida ${option === 'on' ? 'activada' : 'desactivada'}.`);
            break;
          }

          case 'bloquear':
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            groupData.bloqueado = true;
            saveData();
            await reply('🔒 Bot bloqueado para este grupo.');
            break;

          case 'desbloquear':
            if (!isGroup) {
              await reply('Este comando solo funciona en grupos.');
              break;
            }

            groupData.bloqueado = false;
            saveData();
            await reply('🔓 Bot desbloqueado para este grupo.');
            break;

          case 'crear': {
            const input = text.slice('!crear'.length).trim();
            const parts = input.split('|');

            if (parts.length < 2) {
              await reply('Uso: !crear nombre | respuesta');
              break;
            }

            const name = parts.shift().trim().toLowerCase();
            const response = parts.join('|').trim();

            if (!/^[a-z0-9_-]{2,30}$/.test(name) || !response) {
              await reply('❌ Nombre inválido o respuesta vacía.');
              break;
            }

            db.comandos[name] = response;
            saveData();

            await reply(`✅ Comando !${name} creado.`);
            break;
          }

          case 'comandos':
            await reply(
              '📜 COMANDOS PERSONALIZADOS\n' +
              (Object.keys(db.comandos).length
                ? Object.keys(db.comandos).map(c => '!' + c).join('\n')
                : 'No hay comandos personalizados.')
            );
            break;

          case 'borrarcomando': {
            const name = args[1]?.toLowerCase();

            if (!name || !db.comandos[name]) {
              await reply('Uso: !borrarcomando nombre');
              break;
            }

            delete db.comandos[name];
            saveData();

            await reply(`🗑️ Comando !${name} eliminado.`);
            break;
          }

          default:
            await reply('❓ Comando desconocido. Escribe !menu.');
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    }
  });
}

startBot().catch(error => {
  console.error('No se pudo iniciar el bot:', error);
});
