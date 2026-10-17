const express = require('express');
const qrcode = require('qrcode');
const app = express();
let qrCodeData = null, isConnected = false;
app.get('/', (req,res)=> {
  if (isConnected) res.send('<h1>🟢 GreenvilleNight FF - BOT ON</h1>');
  else if (qrCodeData) res.send(`<div style="text-align:center;font-family:Arial;padding:20px;background:#0a0a0a;color:white;"><h1>🌃 GreenvilleNight FF</h1><img src="${qrCodeData}" style="width:350px;border:10px solid #00ff88;border-radius:20px;"></div>`);
  else res.send('<h1>⏳ Iniciando...</h1>');
});
app.listen(process.env.PORT || 3000, ()=> console.log('✅ BOT ON'));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino'); const axios = require('axios'); const fs = require('fs');
let BOT_ON=true, verificaciones=new Map();
if(!fs.existsSync('./roles.json')) fs.writeFileSync('./roles.json','{}');
if(!fs.existsSync('./economia.json')) fs.writeFileSync('./economia.json','{}');
if(!fs.existsSync('./warns.json')) fs.writeFileSync('./warns.json','{}');
let roles=JSON.parse(fs.readFileSync('./roles.json'));
let eco=JSON.parse(fs.readFileSync('./economia.json'));
let warns=JSON.parse(fs.readFileSync('./warns.json'));
const PERMISOS={'owner':5,'co-owner':4,'admin':3,'mod':2,'helper':1,'policia':2,'ems':2,'mecanico':2,'verificado':1};
function getRol(j){return roles[j]||'user';}
function tienePermiso(j,m){return (PERMISOS[getRol(j)]||0)>=(PERMISOS[m]||0);}
function guardarRoles(){fs.writeFileSync('./roles.json',JSON.stringify(roles,null,2));}
function getDinero(j){if(!eco[j]) eco[j]={dinero:5000,banco:0,trabajo:'desempleado'}; return eco[j];}
function guardarEco(){fs.writeFileSync('./economia.json',JSON.stringify(eco,null,2));}
function guardarWarns(){fs.writeFileSync('./warns.json',JSON.stringify(warns,null,2));}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ logger: P({level:'silent'}), auth: state, printQRInTerminal:false, isPublic: true });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const { connection, lastDisconnect, qr } = u;
    if(qr) qrCodeData = await qrcode.toDataURL(qr);
    if(connection==='close'){ isConnected=false; qrCodeData=null; if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot(); }
    else if(connection==='open'){ isConnected=true; qrCodeData=null; console.log('🌃 GreenvilleNight FF ON ✅'); }
  });

  sock.ev.on('messages.upsert', async ({messages})=>{
    const msg=messages[0]; 
    if(!msg.message) return;
    const texto=(msg.message.conversation||msg.message.extendedTextMessage?.text||"").trim();
    const jid=msg.key.remoteJid; const userJid=msg.key.participant||jid; const pushName=msg.pushName||'Usuario';

    const CLAVE_OWNER = "Greenville2026";
    if(texto.startsWith('!owner')){
        const partes = texto.split(' ');
        const clavePuesta = partes[1] || "";
        if(texto === '!owner'){ return sock.sendMessage(jid,{text:'🔒 Usa: !owner Greenville2026'}); }
        if(clavePuesta !== CLAVE_OWNER) return;
        roles[userJid]='owner'; guardarRoles();
        return sock.sendMessage(jid,{text:`👑 @${pushName} AHORA ERES EL UNICO OWNER`,mentions:[userJid]});
    }

    if(texto==='!bot off'){ if(!tienePermiso(userJid,'admin')) return; BOT_ON=false; return sock.sendMessage(jid,{text:'🔴 BOT APAGADO'}); }
    if(texto==='!bot on'){ if(!tienePermiso(userJid,'admin')) return; BOT_ON=true; return sock.sendMessage(jid,{text:'🟢 BOT PRENDIDO'}); }
    if(!BOT_ON) return;

    if(texto.startsWith('!asignar')){
        if(!tienePermiso(userJid,'co-owner')) return sock.sendMessage(jid,{text:'❌ Solo owner/co-owner'});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        const parts=texto.split(' '); const rolNuevo=parts[parts.length-1].toLowerCase();
        let target=mentioned; if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target||!Object.keys(PERMISOS).includes(rolNuevo)) return sock.sendMessage(jid,{text:'Uso: !asignar @usuario admin/mod'});
        if((rolNuevo==='owner'||rolNuevo==='co-owner') && getRol(userJid)!=='owner') return sock.sendMessage(jid,{text:'❌ Solo OWNER puede dar owner/co-owner'});
        roles[target]=rolNuevo; guardarRoles(); return sock.sendMessage(jid,{text:`✅ Rol ${rolNuevo} a @${target.split('@')[0]}`,mentions:[target]});
    }

    // === WARN SYSTEM FIX: SOLO 1 WARN POR COMANDO, SOLO ADMINS/MODS ===
    // IMPORTANTE: Revisar !warns y !delwarn ANTES que !warn para no confundir
    if(texto.startsWith('!warns') || texto.startsWith('!infractions')){
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        let target=mentioned||userJid;
        const lista=warns[target]||[];
        if(lista.length===0) return sock.sendMessage(jid,{text:`✅ @${target.split('@')[0]} no tiene warns`,mentions:[target]});
        let txt=`⚠️ WARNS de @${target.split('@')[0]} (${lista.length}/3)\n\n`;
        lista.forEach((w,i)=>{ txt+=`${i+1}. ${w.razon} - ${w.fecha}\n`; });
        return sock.sendMessage(jid,{text:txt,mentions:[target]});
    }

    if(texto.startsWith('!delwarn') || texto.startsWith('!unwarn')){
        if(!tienePermiso(userJid,'admin')) return sock.sendMessage(jid,{text:'❌ Solo admin/owner'});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        let target=mentioned; if(!target){ const num=texto.split(' ')[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target) return sock.sendMessage(jid,{text:'Uso: !delwarn @usuario'});
        warns[target]=[]; guardarWarns();
        return sock.sendMessage(jid,{text:`✅ Warns borrados a @${target.split('@')[0]}`,mentions:[target]});
    }

    if(texto === '!warn' || texto.startsWith('!warn ')){
        if(!tienePermiso(userJid,'mod')) return sock.sendMessage(jid,{text:'❌ Solo mod/admin/owner - Tu rol: '+getRol(userJid)});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        const parts=texto.split(' ');
        let target=mentioned;
        if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num && parts[1].includes('@')==false){ target=num+'@s.whatsapp.net'; } }
        // Si el segundo arg es @ y hay mencion, usar mencion
        if(!target && mentioned) target=mentioned;
        if(!target) return sock.sendMessage(jid,{text:'❌ Uso: !warn @usuario razon'});
        if(tienePermiso(target,'mod')) return sock.sendMessage(jid,{text:'❌ No puedes dar warn a staff'});
        const razon=parts.slice(2).join(' ') || 'Sin razon';
        if(!warns[target]) warns[target]=[];
        warns[target].push({razon, by:userJid, fecha:new Date().toLocaleDateString()});
        guardarWarns();
        const total=warns[target].length;
        let msgWarn=`⚠️ WARN ${total}/3\n👤 @${target.split('@')[0]}\n📝 ${razon}\n👮 Por: @${userJid.split('@')[0]}`;
        if(total>=3) msgWarn+=`\n\n🚨 3/3 BANEADO`;
        return sock.sendMessage(jid,{text:msgWarn,mentions:[target,userJid]});
    }
    // === FIN WARN SYSTEM ===

    if(texto==='!menu') return sock.sendMessage(jid,{text:`🌃 MENU\n!warn @user razon (solo mod/admin)\n!warns @user\n!delwarn @user\n!verificar <roblox>`});
    if(texto==='!mirol') return sock.sendMessage(jid,{text:`Tu rol: ${getRol(userJid)}`});
  });
}
startBot();