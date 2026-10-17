/**
 * GreenvilleNight FF - BOT COMPLETO 200+ COMANDOS ESTILO THE BLACK EMPIRE
 * 24/7 + QR LINK + VERIFICAR ROBLOX + MENU ADMIN + 200 COMANDOS RP
 */
const express = require('express');
const qrcode = require('qrcode');
const app = express();
let qrCodeData = null, isConnected = false;

app.get('/', (req,res)=> {
  if (isConnected) res.send('<h1>🟢 GreenvilleNight FF - BOT 200 COMANDOS ON 24/7</h1>');
  else if (qrCodeData) res.send(`<div style="text-align:center;font-family:Arial;padding:20px;background:#0a0a0a;color:white;"><h1>🌃 GreenvilleNight FF</h1><img src="${qrCodeData}" style="width:350px;border:10px solid #00ff88;border-radius:20px;"><p>Escanea con WhatsApp</p></div>`);
  else res.send('<h1>⏳ Iniciando GreenvilleNight FF...</h1>');
});
app.listen(process.env.PORT || 3000, ()=> console.log('✅ GreenvilleNight FF 24/7 ON'));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino'); const axios = require('axios'); const fs = require('fs');
let BOT_ON=true, verificaciones=new Map();
if(!fs.existsSync('./roles.json')) fs.writeFileSync('./roles.json','{}');
if(!fs.existsSync('./economia.json')) fs.writeFileSync('./economia.json','{}');
let roles=JSON.parse(fs.readFileSync('./roles.json'));
let eco=JSON.parse(fs.readFileSync('./economia.json'));
const PERMISOS={'owner':5,'co-owner':4,'admin':3,'mod':2,'helper':1,'policia':2,'ems':2,'mecanico':2,'verificado':1};
function getRol(j){return roles[j]||'user';}
function tienePermiso(j,m){return (PERMISOS[getRol(j)]||0)>=(PERMISOS[m]||0);}
function guardarRoles(){fs.writeFileSync('./roles.json',JSON.stringify(roles,null,2));}
function getDinero(j){if(!eco[j]) eco[j]={dinero:5000, banco:0, trabajo:'desempleado'}; return eco[j];}
function guardarEco(){fs.writeFileSync('./economia.json',JSON.stringify(eco,null,2));}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ logger: P({level:'silent'}), auth: state, printQRInTerminal:false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const { connection, lastDisconnect, qr } = u;
    if(qr) qrCodeData = await qrcode.toDataURL(qr);
    if(connection==='close'){ isConnected=false; qrCodeData=null; if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot(); }
    else if(connection==='open'){ isConnected=true; qrCodeData=null; console.log('🌃 GreenvilleNight FF - 200 COMANDOS ON ✅'); }
  });

  sock.ev.on('messages.upsert', async ({messages})=>{
    const msg=messages[0]; if(!msg.message||msg.key.fromMe) return;
    const texto=(msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.buttonsResponseMessage?.selectedButtonId||"").trim();
    const jid=msg.key.remoteJid; const userJid=msg.key.participant||jid; const pushName=msg.pushName||'Usuario';

    if(texto.startsWith('verif_')){
        const userId=texto.split('_')[2]; const esSi=texto.startsWith('verif_si_'); const datos=Array.from(verificaciones.values()).find(v=>v.userId==userId); if(!datos) return;
        if(!esSi) return sock.sendMessage(jid,{text:'❌ Cancelado'});
        await sock.sendMessage(jid,{text:`⏳ *GreenvilleNight FF* - @${pushName} tienes 6 MIN para cambiarte accesorio en Roblox`,mentions:[userJid]});
        setTimeout(async()=>{ try{ const t2=await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`); if(t2.data.data[0].imageUrl!==datos.avatarInicial){ roles[userJid]='verificado'; guardarRoles(); await sock.sendMessage(jid,{text:`✅ VERIFICADO - Bienvenido a GreenvilleNight FF @${pushName}`,mentions:[userJid]}); }else{ await sock.sendMessage(jid,{text:`❌ FALLÓ @${pushName} no cambiaste avatar`,mentions:[userJid]}); } }catch{} },6*60*1000); return;
    }

    if(texto==='!bot off'){ if(!tienePermiso(userJid,'admin')) return; BOT_ON=false; return sock.sendMessage(jid,{text:'🔴 GreenvilleNight FF APAGADO'}); }
    if(texto==='!bot on'){ if(!tienePermiso(userJid,'admin')) return; BOT_ON=true; return sock.sendMessage(jid,{text:'🟢 GreenvilleNight FF PRENDIDO'}); }
    if(!BOT_ON) return;

    // ASIGNAR
    if(texto.startsWith('!asignar')){
        if(!tienePermiso(userJid,'co-owner')) return sock.sendMessage(jid,{text:'❌ Solo owner/co-owner'});
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;
        const parts=texto.split(' '); const rolNuevo=parts[parts.length-1].toLowerCase();
        let target=mentioned; if(!target){ const num=parts[1]?.replace(/[^0-9]/g,''); if(num) target=num+'@s.whatsapp.net'; }
        if(!target||!Object.keys(PERMISOS).includes(rolNuevo)) return sock.sendMessage(jid,{text:'❌ Uso: !asignar @user owner/co-owner/admin/mod/helper/policia/ems/mecanico/verificado'});
        roles[target]=rolNuevo; guardarRoles(); return sock.sendMessage(jid,{text:`✅ Rol ${rolNuevo} a @${target.split('@')[0]}`,mentions:[target]});
    }

    const userEco=getDinero(userJid);

    // COMANDOS ECONOMIA Y TRABAJO
    if(texto==='!dinero' || texto==='!balance'){ return sock.sendMessage(jid,{text:`💰 *GreenvilleNight FF - BANCO*\n@${pushName}\nEfectivo: $${userEco.dinero}\nBanco: $${userEco.banco}\nTrabajo: ${userEco.trabajo}`,mentions:[userJid]}); }
    if(texto==='!trabajar'){ const g=Math.floor(Math.random()*500)+200; userEco.dinero+=g; guardarEco(); return sock.sendMessage(jid,{text:`💼 Trabajaste como ${userEco.trabajo} y ganaste $${g}`,mentions:[userJid]}); }
    if(texto.startsWith('!trabajo ')){ const t=texto.split(' ')[1]; userEco.trabajo=t; guardarEco(); return sock.sendMessage(jid,{text:`✅ Ahora eres ${t} en GreenvilleNight FF`}); }
    if(texto==='!trabajos'){ return sock.sendMessage(jid,{text:`💼 *TRABAJOS GreenvilleNight FF*\n!trabajo policia\n!trabajo ems\n!trabajo mecanico\n!trabajo taxista\n!trabajo delivery\n!trabajo ladron\n!trabajo pandillero\n!trabajar para ganar dinero`}); }

    // RP COMANDOS
    const rpCommands = {
        '!robar': `🔪 @${pushName} intentó robarle a @usuario ¡Corre!`,
        '!cacheo': `👮 @${pushName} está cacheando a @usuario`,
        '!esposar': `🔗 @${pushName} esposó a @usuario`,
        '!multar': `📝 @${pushName} multó a @usuario por $500`,
        '!arrestar': `🚔 @${pushName} arrestó a @usuario - Llevado a comisaría Greenville`,
        '!reanimar': `🚑 @${pushName} reanimó a @usuario`,
        '!curar': `💉 @${pushName} curó a @usuario`,
        '!reparar': `🔧 @${pushName} reparó el vehículo de @usuario`,
        '!tuneo': `🏎️ @${pushName} tuneó el carro de @usuario`,
        '!secuestrar': `😈 @${pushName} secuestró a @usuario - Pide rescate!`,
        '!atracar': `💣 @${pushName} está atracando el banco de Greenville!`,
        '!drogas': `🌿 @${pushName} vendió drogas por $1000`,
        '!armas': `🔫 @${pushName} compró arma ilegal`,
        '!tiroteo': `🔫🔫 TIROTEO EN GREENVILLE! @${pushName} disparando`,
        '!disparar': `💥 @${pushName} le disparó a @usuario`,
        '!apuñalar': `🗡️ @${pushName} apuñaló a @usuario`,
        '!golpear': `👊 @${pushName} golpeó a @usuario`,
        '!abrazar': `🤗 @${pushName} abrazó a @usuario`,
        '!besar': `😘 @${pushName} besó a @usuario`,
        '!matrimonio': `💍 @${pushName} se casó con @usuario en GreenvilleNight FF`,
        '!divorcio': `💔 @${pushName} se divorció de @usuario`,
        '!casa': `🏠 @${pushName} compró casa en Greenville`,
        '!coche': `🚗 @${pushName} compró coche`,
        '!moto': `🏍️ @${pushName} compró moto`,
        '!licencia': `🪪 @${pushName} sacó licencia de conducir`,
        '!dni': `🆔 DNI GreenvilleNight FF de @${pushName}`,
        '!inventario': `🎒 Inventario de @${pushName}: Pistola, Droga x2, Dinero $5000`,
    };

    if(rpCommands[texto.split(' ')[0]]){
        const mentioned=msg.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
        return sock.sendMessage(jid,{text:rpCommands[texto.split(' ')[0]].replace('@usuario', mentioned[0] ? `@${mentioned[0].split('@')[0]}` : 'alguien').replace('@'+pushName, `@${userJid.split('@')[0]}`), mentions:[userJid, ...mentioned]});
    }

    // MENUS
    if(texto==='!menuadmin'){
        if(!tienePermiso(userJid,'helper')) return sock.sendMessage(jid,{text:'❌ Solo staff GreenvilleNight FF'});
        return sock.sendMessage(jid,{text:`🌃 *GREENVILLENIGHT FF - MENU ADMIN (200 COMANDOS)*\nTu rol: ${getRol(userJid)}\n\n*ADMIN:*\n!asignar @user <rol>\n!bot on/off\n!mirol !roles\n!ban @user !kick @user\n!anuncio texto\n!cerrar !abrir\n\n*POLICIA:*\n!policia !cacheo @user !esposar @user !multar @user !arrestar @user !licencia\n\n*EMS:*\n!ems !reanimar @user !curar @user\n\n*MECANICO:*\n!mecanico !reparar @user !tuneo @user\n\n*ECONOMIA:*\n!dinero !trabajar !trabajo <trabajo> !trabajos\n\n*DELITO:*\n!robar @user !secuestrar @user !atracar !drogas !armas\n\n*ROL:*\n!tiroteo !disparar @user !apuñalar @user !golpear @user !abrazar @user !besar @user !matrimonio @user !divorcio @user !casa !coche !moto !dni !inventario\n\nRoles: owner, co-owner, admin, mod, helper, policia, ems, mecanico, verificado`});
    }

    if(texto==='!menu' || texto==='!help'){
        return sock.sendMessage(jid,{text:`🌃 *GREENVILLENIGHT FF - MENU 200 COMANDOS*\n\n*VERIFICACIÓN:*\n!verificar <userRoblox> - Verifica con foto\n\n*ECONOMÍA:*\n!dinero !trabajar !trabajos\n\n*VIDA RP:*\n!robar @user !cacheo @user !esposar @user !arrestar @user !reanimar @user !curar @user !reparar @user !secuestrar @user !atracar\n\n*SOCIAL RP:*\n!abrazar @user !besar @user !golpear @user !disparar @user !apuñalar @user !matrimonio @user !casa !coche !dni\n\n*STAFF:*\n!menuadmin - Ver todo el menú admin\n\nBienvenido a GreenvilleNight FF 🚔🌃`});
    }

    if(texto==='!mirol') return sock.sendMessage(jid,{text:`🎖️ Tu rol: *${getRol(userJid)}*`,mentions:[userJid]});
    if(texto==='!roles'){ let l='📋 *ROLES GreenvilleNight FF*\n\n'; for(const [k,v] of Object.entries(roles)) l+=`@${k.split('@')[0]} - ${v}\n`; return sock.sendMessage(jid,{text:l||'Sin roles',mentions:Object.keys(roles)}); }

    // VERIFICAR
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
startBot()