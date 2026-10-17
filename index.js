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

// NUEVOS ROLES AGREGADOS
const PERMISOS={
  'owner':10,
  'owner2':9,
  'owner3':8,
  'co-owner':7,
  'propietario':7,
  'propietario2':6,
  'propietario3':5,
  'admin':4,
  'mod':3,
  'helper':2,
  'policia':2,
  'ems':2,
  'mecanico':2,
  'verificado':1
};

function getRol(j){return roles[j]||'user';}
function tienePermiso(j,m){return (PERMISOS[getRol(j)]||0)>=(PERMISOS[m]||0);}
function esOwnerProtegido(j){
  const rol = getRol(j);
  return ['owner','owner2','owner3','co-owner','propietario','propietario2','propietario3'].includes(rol);
}
function guardarRoles(){fs.writeFileSync('./roles.json',JSON.stringify(roles,null,2));}
function getDinero(j){if(!eco[j]) eco[j]={dinero:5000,banco:0,trabajo:'desempleado'}; return eco[j];}
function guardarEco(){fs.writeFileSync('./economia.json',JSON.stringify(eco,null,2));}
function guardarWarns(){fs.writeFileSync('./warns.json',JSON.stringify(warns,null,2));}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ logger: P({level:'silent'}), auth: state, printQRInTerminal:false, isPublic: true, shouldIgnoreJid: (jid)=> false, markOnlineOnConnect: true });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const { connection, lastDisconnect, qr } = u;
    if(qr) qrCodeData = await qrcode.toDataURL(qr);
    if(connection==='close'){ isConnected=false; qrCodeData=null; if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot(); }
    else if(connection==='open'){ isConnected=true; qrCodeData=null; console.log('🌃 GreenvilleNight FF ON ✅'); }
  });


  function getTexto(msg){
    let m = msg.message;
    if(!m) return '';
    // Desempaquetar ephemeral / viewOnce / document
    if(m.ephemeralMessage) m = m.ephemeralMessage.message;
    if(m.viewOnceMessage) m = m.viewOnceMessage.message;
    if(m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
    if(m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
    // Texto directo
    if(m.conversation) return m.conversation.trim();
    if(m.extendedTextMessage?.text) return m.extendedTextMessage.text.trim();
    if(m.imageMessage?.caption) return m.imageMessage.caption.trim();
    if(m.videoMessage?.caption) return m.videoMessage.caption.trim();
    if(m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId.trim();
    if(m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId.trim();
    if(m.templateButtonReplyMessage) return m.templateButtonReplyMessage.selectedId?.trim()||'';
    return '';
  }

  sock.ev.on('messages.upsert', async ({messages})=>{
    try{
    const msg=messages[0]; 
    if(!msg || !msg.message) return;
    const texto=getTexto(msg);
    if(!texto) return;
    const jid=msg.key.remoteJid; const userJid=msg.key.participant||msg.key.remoteJid||jid; const pushName=msg.pushName||'Usuario';
    console.log(`📩 Mensaje de ${pushName} (${userJid}): ${texto}`);

    if(texto.startsWith('verif_')){
        const userId=texto.split('_')[2]; const esSi=texto.startsWith('verif_si_'); const datos=Array.from(verificaciones.values()).find(v=>v.userId==userId); if(!datos) return;
        if(!esSi) return sock.sendMessage(jid,{text:'❌ Cancelado'});
        await sock.sendMessage(jid,{text:`⏳ *GreenvilleNight FF* - @${pushName} tienes 6 MIN para cambiarte accesorio en Roblox`,mentions:[userJid]});
        setTimeout(async()=>{ try{ const t2=await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`); if(t2.data.data[0].imageUrl!==datos.avatarInicial){ roles[userJid]='verificado'; guardarRoles(); await sock.sendMessage(jid,{text:`✅ *VERIFICADO* - Bienvenido a GreenvilleNight FF @${pushName}\n🎖️ Rol: verificado agregado automaticamente`,mentions:[userJid]}); }else{ await sock.sendMessage(jid,{text:`❌ FALLÓ @${pushName} no cambiaste avatar`,mentions:[userJid]}); } }catch{} },6*60*1000); return;
    }

    const CLAVE_OWNER = "Greenville2026";
    if(texto.startsWith('!owner')){
        const partes = texto.split(' ');
        const clavePuesta = partes[1] || "";
        if(texto === '!owner'){ return sock.sendMessage(jid,{text:'🔒 Usa: !owner Greenville2026'}); }
        if(clavePuesta !== CLAVE_OWNER) return;
        roles[userJid]='owner'; guardarRoles();
        return sock.sendMessage(jid,{text:`👑 @${pushName} AHORA ERES OWNER PRINCIPAL\nPuedes usar: !asignar @usuario owner2 / owner3 / propietario`,mentions:[userJid]});
    }

    if(texto==='!bot off'){ if(!tienePermiso(userJid,'admin')) return; BOT_ON=false; return sock.sendMessage(jid,{text:'🔴 BOT APAGADO'}); }
    if(texto==='!bot on'){ if(!tienePermiso(userJid,'admin')) return; BOT_ON=true; return sock.sendMessage(jid,{text:'🟢 BOT PRENDIDO'}); }
    if(!BOT_ON) return;

    if(texto.startsWith('!asignar')){
        if(!tienePermiso(userJid,'owner3')) return sock.sendMessage(jid,{text:'❌ Solo owner/owner2/owner3 pueden asignar - Tu rol: '+getRol(userJid)});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        const parts=texto.split(' '); const rolNuevo=parts[parts.length-1].toLowerCase();
        let target=mentioned; if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target||!Object.keys(PERMISOS).includes(rolNuevo)) return sock.sendMessage(jid,{text:'❌ Uso: !asignar @usuario <rol>\nRoles: owner, owner2, owner3, co-owner, propietario, propietario2, propietario3, admin, mod, helper, policia, ems, mecanico, verificado'});
        // Proteccion jerarquia
        if(['owner','owner2','owner3'].includes(rolNuevo) && getRol(userJid)!=='owner') return sock.sendMessage(jid,{text:'❌ Solo OWNER principal puede dar owner/owner2/owner3'});
        if(['co-owner','propietario','propietario2','propietario3'].includes(rolNuevo) && !tienePermiso(userJid,'owner3')) return sock.sendMessage(jid,{text:'❌ Solo owners pueden dar propietario'});
        roles[target]=rolNuevo; guardarRoles(); 
        return sock.sendMessage(jid,{text:`✅ Rol ${rolNuevo} a @${target.split('@')[0]}`,mentions:[target]});
    }

    // === WARN SYSTEM FIX: NO SE PUEDE DAR WARN A OWNERS + AUTO EXPULSION 3 WARNS ===
    if(texto.startsWith('!warns') || texto.startsWith('!infractions')){
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        let target=mentioned||userJid;
        const lista=warns[target]||[];
        if(lista.length===0) return sock.sendMessage(jid,{text:`✅ @${target.split('@')[0]} no tiene warns`,mentions:[target]});
        let txt=`⚠️ *WARNS de @${target.split('@')[0]}* (${lista.length}/3)\n\n`;
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
        if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target) return sock.sendMessage(jid,{text:'❌ Uso: !warn @usuario razon'});
        // PROTECCION: NO WARN A OWNERS
        if(esOwnerProtegido(target)) return sock.sendMessage(jid,{text:'❌ No puedes dar warn a un OWNER / PROPIETARIO'});
        if(tienePermiso(target,'admin') && !tienePermiso(userJid,'owner3')) return sock.sendMessage(jid,{text:'❌ No puedes dar warn a un admin'});
        const razon=parts.slice(2).join(' ') || 'Sin razon';
        if(!warns[target]) warns[target]=[];
        warns[target].push({razon, by:userJid, fecha:new Date().toLocaleDateString()});
        guardarWarns();
        const total=warns[target].length;
        let msgWarn=`⚠️ *WARN ${total}/3*\n👤 @${target.split('@')[0]}\n📝 ${razon}\n👮 Por: @${userJid.split('@')[0]}`;
        if(total>=3){
            msgWarn+=`\n\n🚨 *3/3 WARNS - EXPULSANDO DEL GRUPO*`;
            await sock.sendMessage(jid,{text:msgWarn,mentions:[target,userJid]});
            try{
                await sock.groupParticipantsUpdate(jid,[target],'remove');
                await sock.sendMessage(jid,{text:`✅ @${target.split('@')[0]} expulsado por 3 warns`,mentions:[target]});
            }catch(e){
                await sock.sendMessage(jid,{text:`⚠️ No pude expulsar a @${target.split('@')[0]} - Hazme admin del grupo`,mentions:[target]});
            }
            warns[target]=[]; guardarWarns();
            return;
        }
        return sock.sendMessage(jid,{text:msgWarn,mentions:[target,userJid]});
    }
    // === FIN WARN SYSTEM ===

    if(texto==='!menu' || texto==='!help'){
        return sock.sendMessage(jid,{text:`🌃 *GREENVILLENIGHT FF - MENU COMPLETO*\n\n*✅ VERIFICACION:*\n!verificar <userRoblox> -> te da rol verificado automaticamente\n\n*⚠️ MODERACION (solo mod/admin):*\n!warn @user razon (no se puede a owners)\n!warns @user\n!delwarn @user\n3 warns = expulsion automatica\n\n*👑 ROLES:*\nowner (principal)\nowner2 (segundo propietario)\nowner3 (tercer propietario)\npropietario, propietario2, propietario3\nadmin, mod, helper, policia, ems, mecanico, verificado\n\n*STAFF:*\n!asignar @usuario <rol>\n!mirol !roles\n!bot on/off\n\n*🔑 OWNER:*\n!owner Greenville2026`});
    }

    if(texto==='!menuadmin'){
        if(!tienePermiso(userJid,'helper')) return sock.sendMessage(jid,{text:'❌ Solo staff - Tu rol: '+getRol(userJid)});
        return sock.sendMessage(jid,{text:`🌃 *MENU ADMIN*\nTu rol: ${getRol(userJid)}\n\n*MOD:* !warn @user\n*ADMIN:* !delwarn @user !asignar @user rol\n*OWNER:* !bot on/off\n\nRoles disponibles: owner2, owner3, propietario, propietario2, propietario3, admin, mod, verificado`});
    }

    if(texto==='!mirol') return sock.sendMessage(jid,{text:`🎖️ Tu rol: *${getRol(userJid)}*`,mentions:[userJid]});
    if(texto==='!roles'){ let l='📋 *ROLES GreenvilleNight FF*\n\n'; for(const [k,v] of Object.entries(roles)) l+=`@${k.split('@')[0]} - ${v}\n`; return sock.sendMessage(jid,{text:l||'Sin roles',mentions:Object.keys(roles)}); }

    }catch(err){ console.log('Error mensaje:', err.message); }
    });

    if(texto.startsWith('!verificar')){
        const username=texto.split(' ')[1]; if(!username) return sock.sendMessage(jid,{text:'Uso: !verificar <usuarioRoblox>'});
        try{
            const r1=await axios.post('https://users.roblox.com/v1/usernames/users',{usernames:[username],excludeBannedUsers:true});
            if(!r1.data.data.length) return sock.sendMessage(jid,{text:`❌ No encontré ${username}`});
            const user=r1.data.data[0]; const thumb=await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${user.id}&size=720x720&format=Png&isCircular=false`);
            const avatarUrl=thumb.data.data[0].imageUrl; const info=await axios.get(`https://users.roblox.com/v1/users/${user.id}`);
            verificaciones.set(userJid,{userId:user.id,avatarInicial:avatarUrl,username:user.name});
            const buttons=[{buttonId:`verif_si_${user.id}`,buttonText:{displayText:'✅ Si es mi cuenta'},type:1},{buttonId:`verif_no_${user.id}`,buttonText:{displayText:'❌ No es'},type:1}];
            await sock.sendMessage(jid,{image:{url:avatarUrl},caption:`🌃 *GreenvilleNight FF*\n👤 ${info.data.name} (${info.data.displayName})\n¿Es tu cuenta?`,buttons:buttons,headerType:4});
        }catch(e){ sock.sendMessage(jid,{text:'Error API Roblox'}); }
    }
  });
}
startBot();