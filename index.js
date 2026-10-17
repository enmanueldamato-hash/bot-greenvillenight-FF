const express = require('express');
const qrcode = require('qrcode');
const app = express();
let qrCodeData = null, isConnected = false;
app.get('/', (req,res)=> {
  if (isConnected) res.send('<h1>🟢 GreenvilleNight FF - BOT ON</h1>');
  else if (qrCodeData) res.send(`<div style="text-align:center;font-family:Arial;padding:20px;background:#0a0a0a;color:white;"><h1>🌃 GreenvilleNight FF</h1><img src="${qrCodeData}" style="width:350px;border:10px solid #00ff88;border-radius:20px;"></div>`);
  else res.send('<h1>⏳ Iniciando...</h1>');
});
app.listen(process.env.PORT || 3000, ()=> console.log('✅ WEB ON'));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino'); const axios = require('axios'); const fs = require('fs');
let BOT_ON=true, verificaciones=new Map();
if(!fs.existsSync('./roles.json')) fs.writeFileSync('./roles.json','{}');
if(!fs.existsSync('./economia.json')) fs.writeFileSync('./economia.json','{}');
if(!fs.existsSync('./warns.json')) fs.writeFileSync('./warns.json','{}');
let roles=JSON.parse(fs.readFileSync('./roles.json'));
let eco=JSON.parse(fs.readFileSync('./economia.json'));
let warns=JSON.parse(fs.readFileSync('./warns.json'));

const PERMISOS={
  'owner':10,'owner2':9,'owner3':8,'co-owner':7,'propietario':7,'propietario2':6,'propietario3':5,'admin':4,'mod':3,'helper':2,'policia':2,'ems':2,'mecanico':2,'verificado':1
};
function getRol(j){return roles[j]||'user';}
function tienePermiso(j,m){return (PERMISOS[getRol(j)]||0)>=(PERMISOS[m]||0);}
function esOwnerProtegido(j){const rol=getRol(j); return ['owner','owner2','owner3','co-owner','propietario','propietario2','propietario3'].includes(rol);}
function guardarRoles(){fs.writeFileSync('./roles.json',JSON.stringify(roles,null,2));}
function guardarWarns(){fs.writeFileSync('./warns.json',JSON.stringify(warns,null,2));}
function getTexto(msg){
  let m=msg.message; if(!m) return '';
  if(m.ephemeralMessage) m=m.ephemeralMessage.message;
  if(m.viewOnceMessage) m=m.viewOnceMessage.message;
  if(m.viewOnceMessageV2) m=m.viewOnceMessageV2.message;
  if(m.documentWithCaptionMessage) m=m.documentWithCaptionMessage.message;
  if(m.conversation) return m.conversation.trim();
  if(m.extendedTextMessage?.text) return m.extendedTextMessage.text.trim();
  if(m.imageMessage?.caption) return m.imageMessage.caption.trim();
  if(m.videoMessage?.caption) return m.videoMessage.caption.trim();
  if(m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId.trim();
  if(m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId.trim();
  if(m.templateButtonReplyMessage?.selectedId) return m.templateButtonReplyMessage.selectedId.trim();
  return '';
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ logger: P({level:'silent'}), auth: state, printQRInTerminal:false, isPublic:true, markOnlineOnConnect:true, shouldIgnoreJid:()=>false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const { connection, lastDisconnect, qr } = u;
    if(qr) qrCodeData = await qrcode.toDataURL(qr);
    if(connection==='close'){ isConnected=false; qrCodeData=null; if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot(); }
    else if(connection==='open'){ isConnected=true; qrCodeData=null; console.log('🌃 GreenvilleNight FF BOT CONECTADO ✅ - ID: '+sock.user.id); }
  });

  sock.ev.on('messages.upsert', async ({messages})=>{
    try{
    const msg=messages[0];
    if(!msg || !msg.message) return;
    const texto=getTexto(msg);
    if(!texto) return;
    const jid=msg.key.remoteJid;
    // RESPONDE EN TODOS LOS GRUPOS - SIN FILTRO
    // No hay lista de grupos permitidos, responde en cualquiera donde este el bot

    // FIX: Si el mensaje es mio (fromMe) usar mi propio ID como userJid para que me responda
    let userJid=msg.key.participant || msg.key.remoteJid;
    if(msg.key.fromMe){
      userJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      console.log('📩 MENSAJE MIO DETECTADO: '+texto);
    }
    const pushName=msg.pushName||'Enmanuel';
    console.log(`📩 ${pushName} (${userJid}): ${texto} | fromMe=${msg.key.fromMe} | jid=${jid}`);

    if(texto.startsWith('verif_')){
        const userId=texto.split('_')[2]; const esSi=texto.startsWith('verif_si_'); const datos=Array.from(verificaciones.values()).find(v=>v.userId==userId); if(!datos) return;
        if(!esSi) return sock.sendMessage(jid,{text:'❌ Cancelado'});
        await sock.sendMessage(jid,{text:`⏳ @${pushName} tienes 6 MIN para cambiarte accesorio en Roblox`,mentions:[userJid]});
        setTimeout(async()=>{ try{ const t2=await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`); if(t2.data.data[0].imageUrl!==datos.avatarInicial){ roles[userJid]='verificado'; guardarRoles(); await sock.sendMessage(jid,{text:`✅ VERIFICADO - Bienvenido @${pushName} rol verificado dado`,mentions:[userJid]}); }else{ await sock.sendMessage(jid,{text:`❌ FALLÓ @${pushName}`,mentions:[userJid]}); } }catch{} },6*60*1000); return;
    }

    const CLAVE="Greenville2026";
    if(texto.startsWith('!owner')){
        const clavePuesta=texto.split(' ')[1]||"";
        if(texto==='!owner') return sock.sendMessage(jid,{text:'🔒 Usa: !owner Greenville2026'});
        if(clavePuesta!==CLAVE) return;
        roles[userJid]='owner'; guardarRoles();
        return sock.sendMessage(jid,{text:`👑 @${pushName} AHORA ERES OWNER PRINCIPAL - Ya puedo responderte siempre`,mentions:[userJid]});
    }

    if(texto==='!bot off'){ if(!tienePermiso(userJid,'admin') && !msg.key.fromMe) return; BOT_ON=false; return sock.sendMessage(jid,{text:'🔴 BOT APAGADO'}); }
    if(texto==='!bot on'){ if(!tienePermiso(userJid,'admin') && !msg.key.fromMe) return; BOT_ON=true; return sock.sendMessage(jid,{text:'🟢 BOT PRENDIDO'}); }
    if(!BOT_ON && !msg.key.fromMe) return;

    // MENU COMPLETO ARREGLADO
    if(texto==='!menu' || texto==='!help' || texto==='!menu completo'){
        return sock.sendMessage(jid,{text:`🌃 *GREENVILLENIGHT FF - MENU COMPLETO*

*✅ VERIFICACION (da verificado automatico):*
!verificar <usuarioRoblox>

*💰 ECONOMIA:*
!dinero - ver tu dinero
!trabajar - trabajar

*⚠️ MODERACION:*
!warn @usuario razon (1 warn, 3 = expulsion)
!warns @usuario - ver warns
!delwarn @usuario - quitar warns

*👮 ROLES DISPONIBLES:*
owner, owner2, owner3
propietario, propietario2, propietario3
admin, mod, helper
policia, ems, mecanico, verificado

*🔧 STAFF:*
!asignar @usuario <rol>
!mirol - ver tu rol
!roles - ver todos los roles
!bot on/off

*🔑 DUEÑO:*
!owner Greenville2026

Si no te respondo usa !owner Greenville2026 primero`});
    }

    if(texto==='!menuadmin'){
        if(!tienePermiso(userJid,'helper') && !msg.key.fromMe) return sock.sendMessage(jid,{text:'❌ Solo staff'});
        return sock.sendMessage(jid,{text:`🌃 MENU ADMIN - Tu rol: ${getRol(userJid)}
!warn @user
!warns @user
!delwarn @user
!asignar @user <rol>
!bot on/off`});
    }

    if(texto.startsWith('!asignar')){
        if(!tienePermiso(userJid,'owner3') && !msg.key.fromMe) return sock.sendMessage(jid,{text:'❌ Solo owner/owner2/owner3 - Tu rol: '+getRol(userJid)});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        const parts=texto.split(' '); const rolNuevo=parts[parts.length-1].toLowerCase();
        let target=mentioned; if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target||!Object.keys(PERMISOS).includes(rolNuevo)) return sock.sendMessage(jid,{text:'❌ Uso: !asignar @usuario <rol>\nRoles: '+Object.keys(PERMISOS).join(', ')});
        if(['owner','owner2','owner3'].includes(rolNuevo) && getRol(userJid)!=='owner' && !msg.key.fromMe) return sock.sendMessage(jid,{text:'❌ Solo OWNER principal'});
        roles[target]=rolNuevo; guardarRoles(); 
        return sock.sendMessage(jid,{text:`✅ Rol ${rolNuevo} a @${target.split('@')[0]}`,mentions:[target]});
    }

    if(texto.startsWith('!warns') || texto.startsWith('!infractions')){
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        let target=mentioned||userJid;
        const lista=warns[target]||[];
        if(lista.length===0) return sock.sendMessage(jid,{text:`✅ @${target.split('@')[0]} sin warns`,mentions:[target]});
        let txt=`⚠️ WARNS @${target.split('@')[0]} (${lista.length}/3)\n`; lista.forEach((w,i)=>{ txt+=`${i+1}. ${w.razon}\n`; });
        return sock.sendMessage(jid,{text:txt,mentions:[target]});
    }

    if(texto.startsWith('!delwarn')){
        if(!tienePermiso(userJid,'admin') && !msg.key.fromMe) return sock.sendMessage(jid,{text:'❌ Solo admin'});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        let target=mentioned; if(!target){ const num=texto.split(' ')[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target) return sock.sendMessage(jid,{text:'Uso: !delwarn @usuario'});
        warns[target]=[]; guardarWarns();
        return sock.sendMessage(jid,{text:`✅ Warns borrados a @${target.split('@')[0]}`,mentions:[target]});
    }

    if(texto==='!warn' || texto.startsWith('!warn ')){
        if(!tienePermiso(userJid,'mod') && !msg.key.fromMe) return sock.sendMessage(jid,{text:'❌ Solo mod/admin - Tu rol: '+getRol(userJid)});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        const parts=texto.split(' ');
        let target=mentioned; if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target) return sock.sendMessage(jid,{text:'❌ Uso: !warn @usuario razon'});
        if(esOwnerProtegido(target)) return sock.sendMessage(jid,{text:'❌ No puedes dar warn a OWNER/PROPIETARIO'});
        const razon=parts.slice(2).join(' ')||'Sin razon';
        if(!warns[target]) warns[target]=[];
        warns[target].push({razon, by:userJid, fecha:new Date().toLocaleDateString()});
        guardarWarns();
        const total=warns[target].length;
        let msgWarn=`⚠️ WARN ${total}/3 @${target.split('@')[0]} Razon: ${razon}`;
        if(total>=3){
            msgWarn+=`\n🚨 3/3 - EXPULSANDO`;
            await sock.sendMessage(jid,{text:msgWarn,mentions:[target]});
            try{ await sock.groupParticipantsUpdate(jid,[target],'remove'); await sock.sendMessage(jid,{text:`✅ @${target.split('@')[0]} expulsado`,mentions:[target]}); }catch{ await sock.sendMessage(jid,{text:`⚠️ Hazme admin para expulsar`}); }
            warns[target]=[]; guardarWarns(); return;
        }
        return sock.sendMessage(jid,{text:msgWarn,mentions:[target]});
    }

    if(texto==='!mirol') return sock.sendMessage(jid,{text:`🎖️ Tu rol: *${getRol(userJid)}*`,mentions:[userJid]});
    if(texto==='!roles'){ let l='📋 ROLES\n'; for(const [k,v] of Object.entries(roles)) l+=`@${k.split('@')[0]} - ${v}\n`; return sock.sendMessage(jid,{text:l||'Sin roles',mentions:Object.keys(roles)}); }

    if(texto.startsWith('!verificar')){
        const username=texto.split(' ')[1]; if(!username) return sock.sendMessage(jid,{text:'Uso: !verificar <usuarioRoblox>'});
        try{
            const r1=await axios.post('https://users.roblox.com/v1/usernames/users',{usernames:[username],excludeBannedUsers:true});
            if(!r1.data.data.length) return sock.sendMessage(jid,{text:`❌ No encontré ${username}`});
            const user=r1.data.data[0]; const thumb=await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${user.id}&size=720x720&format=Png&isCircular=false`);
            const avatarUrl=thumb.data.data[0].imageUrl; const info=await axios.get(`https://users.roblox.com/v1/users/${user.id}`);
            verificaciones.set(userJid,{userId:user.id,avatarInicial:avatarUrl,username:user.name});
            const buttons=[{buttonId:`verif_si_${user.id}`,buttonText:{displayText:'✅ Si es mi cuenta'},type:1},{buttonId:`verif_no_${user.id}`,buttonText:{displayText:'❌ No es'},type:1}];
            await sock.sendMessage(jid,{image:{url:avatarUrl},caption:`🌃 GreenvilleNight FF\n👤 ${info.data.name}`,buttons:buttons,headerType:4});
        }catch{ sock.sendMessage(jid,{text:'Error API Roblox'}); }
    }

    }catch(e){ console.log('Error:', e.message); }
  });
}
startBot();