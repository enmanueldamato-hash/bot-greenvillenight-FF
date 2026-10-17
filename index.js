// @ts-nocheck
const express=require('express'),qrcode=require('qrcode');
const app=express();let qr=null,connected=false;
app.get('/',(req,res)=>{res.send(connected?'<h1>🟢 BOT ON</h1>':qr?'<div style="text-align:center"><h1>GreenvilleNight</h1><img src="'+qr+'" style="width:350px"></div>':'<h1>⏳ Iniciando</h1>')});
app.listen(process.env.PORT||3000);
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason}=require('@whiskeysockets/baileys');
const P=require('pino'),axios=require('axios'),fs=require('fs');
let BOT_ON=true,verifs=new Map();
if(!fs.existsSync('./roles.json'))fs.writeFileSync('./roles.json','{}');
if(!fs.existsSync('./economia.json'))fs.writeFileSync('./economia.json','{}');
if(!fs.existsSync('./warns.json'))fs.writeFileSync('./warns.json','{}');
if(!fs.existsSync('./antipalabras.json'))fs.writeFileSync('./antipalabras.json','{"on":false}');
if(!fs.existsSync('./comandos.json'))fs.writeFileSync('./comandos.json','{}');
if(!fs.existsSync('./bienvenida.json'))fs.writeFileSync('./bienvenida.json','{"on":true,"texto":"Bienvenido @user a {group}! 🌃\n📜 Usa !ficha para crear tu ficha\n💰 !menu para comandos"}');
let roles=JSON.parse(fs.readFileSync('./roles.json')),eco=JSON.parse(fs.readFileSync('./economia.json')),warns=JSON.parse(fs.readFileSync('./warns.json')),anti=JSON.parse(fs.readFileSync('./antipalabras.json')),customCmds=JSON.parse(fs.readFileSync('./comandos.json')),bienvenida=JSON.parse(fs.readFileSync('./bienvenida.json'));
let antiOn=anti.on;
const MALAS=['puta','puto','mierda','verga','coño','mmgvo','mmg','hdp','cabron','maricon','pendejo','zorra','perra'];
const PERM={owner:10,owner2:9,owner3:8,'co-owner':7,propietario:7,admin:4,mod:3,helper:2,policia:2,verificado:1,miembro:1,user:0};
function getRol(j){return roles[j]||'user'};function tiene(j,min){return (PERM[getRol(j)]||0)>=(PERM[min]||0)};function esOwner(j){return ['owner','owner2','owner3','co-owner','propietario','propietario2'].includes(getRol(j))};
function saveRoles(){fs.writeFileSync('./roles.json',JSON.stringify(roles,null,2))};function saveWarns(){fs.writeFileSync('./warns.json',JSON.stringify(warns,null,2))};function saveEco(){fs.writeFileSync('./economia.json',JSON.stringify(eco,null,2))};function saveAnti(){fs.writeFileSync('./antipalabras.json',JSON.stringify({on:antiOn}))};function saveCustom(){fs.writeFileSync('./comandos.json',JSON.stringify(customCmds,null,2))};
function saveBienvenida(){fs.writeFileSync('./bienvenida.json',JSON.stringify(bienvenida,null,2))};
function getTexto(m){let x=m.message;if(!x)return '';if(x.ephemeralMessage)x=x.ephemeralMessage.message;if(x.viewOnceMessage)x=x.viewOnceMessage.message;if(x.conversation)return x.conversation.trim();if(x.extendedTextMessage&&x.extendedTextMessage.text)return x.extendedTextMessage.text.trim();if(x.imageMessage&&x.imageMessage.caption)return x.imageMessage.caption.trim();if(x.buttonsResponseMessage&&x.buttonsResponseMessage.selectedButtonId)return x.buttonsResponseMessage.selectedButtonId.trim();if(x.templateButtonReplyMessage&&x.templateButtonReplyMessage.selectedId)return x.templateButtonReplyMessage.selectedId.trim();return '';}
async function start(){
 const {state,saveCreds}=await useMultiFileAuthState('auth_info');
 const sock=makeWASocket({logger:P({level:'silent'}),auth:state,printQRInTerminal:false,isPublic:true,markOnlineOnConnect:true,shouldIgnoreJid:()=>false,keepAliveIntervalMs:10000,browser:['GreenvilleNight FF','Chrome','121.0'],syncFullHistory:false});
 setInterval(()=>{try{sock.sendPresenceUpdate('available')}catch(e){}},10000);setInterval(()=>{try{if(sock.ws&&sock.ws.readyState===1)sock.ws.ping()}catch(e){}},5000);
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async(u)=>{if(u.qr)qr=await qrcode.toDataURL(u.qr);if(u.connection==='close'){connected=false;qr=null;let c=u.lastDisconnect?.error?.output?.statusCode;console.log('Cerrado '+c);if(c!==DisconnectReason.loggedOut)setTimeout(()=>start(),2000)}if(u.connection==='open'){connected=true;qr=null;console.log('BOT ON '+sock.user.id)}});

 sock.ev.on('group-participants.update',async(an)=>{
  try{
   let jid=an.id;let action=an.action;let users=an.participants||[];
   if(action==='add'&&bienvenida.on){
    for(let user of users){
     let meta=await sock.groupMetadata(jid).catch(()=>null);
     let groupName=meta?meta.subject:'Grupo';
     let userName=user.split('@')[0];
     let txt=bienvenida.texto.replace(/@user/g,'@'+user).replace(/{user}/g,userName).replace(/{group}/g,groupName).replace(/@tag/g,'@'+user);
     // Si hay foto de bienvenida
     try{
      await sock.sendMessage(jid,{text:txt,mentions:[user]});
     }catch(e){console.log('Error bienvenida '+e.message)}
    }
   }
   if(action==='remove'){
    // opcional despedida
   }
  }catch(e){console.log('Welcome error '+e.message)}
 });


 sock.ev.on('messages.upsert',async(d)=>{
  try{
   let msg=d.messages[0];if(!msg||!msg.message)return;let texto=getTexto(msg);if(!texto)return;let jid=msg.key.remoteJid;let userJid=msg.key.participant||msg.key.remoteJid;if(msg.key.fromMe)userJid=sock.user.id.split(':')[0]+'@s.whatsapp.net';let name=msg.pushName||'Usuario';
   if(texto.startsWith('verif_')){let p=texto.split('_'),uid=p[2],esSi=texto.startsWith('verif_si_');let datos=null;for(let v of verifs.values())if(v.uid==uid)datos=v;if(!datos)return;if(!esSi){await sock.sendMessage(jid,{text:'❌ Cancelado'});return;}await sock.sendMessage(jid,{text:'⏳ @'+name+' 6 MIN cambia accesorio',mentions:[userJid]});setTimeout(async()=>{try{let t=await axios.get('https://thumbnails.roblox.com/v1/users/avatar?userIds='+uid+'&size=720x720&format=Png&isCircular=false');let nf=t.data.data[0].imageUrl;if(nf!==datos.foto){roles[userJid]='verificado';saveRoles();await sock.sendMessage(jid,{text:'✅ VERIFICADO @'+name,mentions:[userJid]})}else await sock.sendMessage(jid,{text:'❌ FALLO @'+name,mentions:[userJid]})}catch(e){}},360000);return;}
   let CLAVE='Greenville2026';if(texto.startsWith('!owner')){let c=texto.split(' ')[1]||'';if(texto==='!owner'){await sock.sendMessage(jid,{text:'Usa !owner <clave>'});return;}if(c!==CLAVE)return;roles[userJid]='owner';saveRoles();await sock.sendMessage(jid,{text:'👑 ERES OWNER @'+name,mentions:[userJid]});return;}
   if(texto==='!bot off'){if(!tiene(userJid,'admin')&&!msg.key.fromMe)return;BOT_ON=false;await sock.sendMessage(jid,{text:'🔴 OFF'});return;}
   if(texto==='!bot on'){if(!tiene(userJid,'admin')&&!msg.key.fromMe)return;BOT_ON=true;await sock.sendMessage(jid,{text:'🟢 ON'});return;}
   if(!BOT_ON&&!msg.key.fromMe)return;

   let cmd=texto.split(' ')[0].toLowerCase().replace('!','');let args=texto.split(' ').slice(1);let argText=args.join(' ');
   function getEco(j){if(!eco[j])eco[j]={dinero:5000,banco:10000,xp:0,nivel:1,casa:0,coche:0,licencia:false,arma:false};return eco[j];}
   function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

   if(cmd==='crear'){
    if(!tiene(userJid,'admin')&&!msg.key.fromMe){await sock.sendMessage(jid,{text:'❌ Solo admin'});return;}
    if(args.length<2){await sock.sendMessage(jid,{text:'Uso: !crear <nombre> <respuesta>\nEj: !crear reglas No spam\nVariables: @user @tag {user}'});return;}
    let nn=args[0].toLowerCase().replace('!','');let rr=args.slice(1).join(' ');
    if(['menu','crear','borrarcmd','owner','bot','cerrar','kick','warn'].includes(nn)){await sock.sendMessage(jid,{text:'❌ No se puede sobreescribir'});return;}
    customCmds[nn]=rr;saveCustom();await sock.sendMessage(jid,{text:'✅ Comando !'+nn+' creado! Usa !'+nn});return;
   }
   if(cmd==='borrarcmd'||cmd==='delcmd'){if(!tiene(userJid,'admin')&&!msg.key.fromMe)return;let nn=(args[0]||'').toLowerCase();if(!customCmds[nn]){await sock.sendMessage(jid,{text:'No existe'});return;}delete customCmds[nn];saveCustom();await sock.sendMessage(jid,{text:'🗑️ Borrado !'+nn});return;}
   if(cmd==='comandoscreados'||cmd==='miscomandos'){let l=Object.keys(customCmds);await sock.sendMessage(jid,{text:l.length?'📜 Creados: !'+l.join(' !'):'No hay. Usa !crear'});return;}
   if(customCmds[cmd]){let r=customCmds[cmd].replace(/@user/g,'@'+userJid.split('@')[0]).replace(/{user}/g,name);let men=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;let mentions=[userJid];if(men){mentions.push(men);r=r.replace(/@tag/g,'@'+men.split('@')[0]);}await sock.sendMessage(jid,{text:r,mentions:mentions});return;}

   if(cmd==='menu'){await sock.sendMessage(jid,{text:'🌃 GREENVILLE 400 CMD\n💰 !dinero !banco !daily !trabajar !crime !slots !ruleta !blackjack !depositar !retirar !pagar !robar !tienda !comprar !inventario !top\n🔒 !cerrar !abrir !link !kick !ban !warn !delwarn !mute !tagall !todos !antipalabras on/off\n😂 !meme !chiste !8ball !ship !topgays !abrazar !besar\n🛠️ !clima !hora !calc !sorteo !afk\n🌃 !ficha !licencia !policia !ems !mecanico\n👥 !nivel !ranking !clan !evento\n🎮 !adivina !trivia\n🎉 !mision !vip !caja !regalo\n📝 !crear <nombre> <texto> | !comandoscreados | !borrarcmd'});return;}

   if(['dinero','billetera'].includes(cmd)){let u=getEco(userJid);await sock.sendMessage(jid,{text:'💰 @'+userJid.split('@')[0]+' $'+u.dinero+' 🏦 $'+u.banco+' Nv.'+u.nivel,mentions:[userJid]});return;}
   if(cmd==='daily'){let u=getEco(userJid);if(u.lastDaily&&Date.now()-u.lastDaily<86400000){await sock.sendMessage(jid,{text:'Ya reclamaste'});return;}u.dinero+=2000;u.xp+=20;u.lastDaily=Date.now();eco[userJid]=u;saveEco();await sock.sendMessage(jid,{text:'🎁 +$2000'});return;}
   if(cmd==='trabajar'||cmd==='work'){let u=getEco(userJid);let p=rand(500,1500);u.dinero+=p;u.xp+=10;eco[userJid]=u;saveEco();await sock.sendMessage(jid,{text:'💼 +$'+p});return;}
   if(cmd==='slots'){let u=getEco(userJid);let r=['🍒','⭐','7️⃣'];let a=r[rand(0,2)],b=r[rand(0,2)],c=r[rand(0,2)];let w=a===b&&b===c;u.dinero+=w?3000:-300;eco[userJid]=u;saveEco();await sock.sendMessage(jid,{text:(w?'🎉 ':'💸 ')+a+b+c});return;}
   if(cmd==='depositar'){let c=parseInt(args[0])||0;let u=getEco(userJid);if(c<=0||u.dinero<c){await sock.sendMessage(jid,{text:'!depositar 1000'});return;}u.dinero-=c;u.banco+=c;eco[userJid]=u;saveEco();await sock.sendMessage(jid,{text:'🏦 Dep $'+c});return;}
   if(cmd==='retirar'){let c=parseInt(args[0])||0;let u=getEco(userJid);if(c<=0||u.banco<c){await sock.sendMessage(jid,{text:'!retirar 1000'});return;}u.banco-=c;u.dinero+=c;eco[userJid]=u;saveEco();await sock.sendMessage(jid,{text:'💵 Ret $'+c});return;}
   if(cmd==='top'){let t=Object.entries(eco).sort((a,b)=>(b[1].dinero+b[1].banco)-(a[1].dinero+a[1].banco)).slice(0,5);let txt='🏆 TOP\n';for(let i=0;i<t.length;i++)txt+=(i+1)+'. @'+t[i][0].split('@')[0]+' $'+(t[i][1].dinero+t[i][1].banco)+'\n';await sock.sendMessage(jid,{text:txt,mentions:t.map(x=>x[0])});return;}
   if(cmd==='cerrar'){if(!tiene(userJid,'admin')&&!msg.key.fromMe)return;try{await sock.groupSettingUpdate(jid,'announcement');await sock.sendMessage(jid,{text:'🔒 Cerrado'})}catch(e){}return;}
   if(cmd==='abrir'){if(!tiene(userJid,'admin')&&!msg.key.fromMe)return;try{await sock.groupSettingUpdate(jid,'not_announcement');await sock.sendMessage(jid,{text:'🔓 Abierto'})}catch(e){}return;}
   if(cmd==='link'){try{let iv=await sock.groupInviteCode(jid);await sock.sendMessage(jid,{text:'https://chat.whatsapp.com/'+iv})}catch(e){}return;}
   if(cmd==='kick'||cmd==='ban'){if(!tiene(userJid,'admin')&&!msg.key.fromMe)return;let men=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;let tgt=men;if(!tgt){let n=args[0]?.replace(/[^0-9]/g,'');if(n)tgt=n+'@s.whatsapp.net'}if(!tgt||esOwner(tgt))return;try{await sock.groupParticipantsUpdate(jid,[tgt],'remove')}catch(e){}return;}
   if(cmd==='tagall'||cmd==='todos'){if(!tiene(userJid,'helper')&&!msg.key.fromMe)return;try{let m=await sock.groupMetadata(jid);let ps=m.participants.map(p=>p.id);let ms=argText||'ATENCION';let txt='📢 '+ms+'\n';for(let p of ps)txt+='@'+p.split('@')[0]+' ';await sock.sendMessage(jid,{text:txt,mentions:ps})}catch(e){}return;}
   if(cmd==='antipalabras'){let sub=args[0];if(sub==='on'){antiOn=true;saveAnti();await sock.sendMessage(jid,{text:'✅ ON'})}else{antiOn=false;saveAnti();await sock.sendMessage(jid,{text:'❌ OFF'})}return;}
   if(cmd==='welcome'||cmd==='bienvenida'){let sub=args[0];if(sub==='on'){bienvenida.on=true;saveBienvenida();await sock.sendMessage(jid,{text:'✅ Bienvenida ON\n'+bienvenida.texto});return;}if(sub==='off'){bienvenida.on=false;saveBienvenida();await sock.sendMessage(jid,{text:'❌ Bienvenida OFF'});return;}await sock.sendMessage(jid,{text:'👋 BIENVENIDA: '+(bienvenida.on?'ON':'OFF')+'\nTexto: '+bienvenida.texto+'\n\nUsa: !welcome on/off\n!setwelcome <texto>'});return;}
   if(cmd==='setwelcome'||cmd==='setbienvenida'){if(!tiene(userJid,'admin')&&!msg.key.fromMe){await sock.sendMessage(jid,{text:'Solo admin'});return;}if(!argText){await sock.sendMessage(jid,{text:'Uso: !setwelcome <texto>\nVariables: @user {user} {group}'});return;}bienvenida.texto=argText;bienvenida.on=true;saveBienvenida();await sock.sendMessage(jid,{text:'✅ Bienvenida cambiada:\n'+argText});return;}

   if(cmd==='ship'){let men=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||null;if(!men){await sock.sendMessage(jid,{text:'Menciona a alguien'});return;}await sock.sendMessage(jid,{text:'💞 @'+userJid.split('@')[0]+' + @'+men.split('@')[0]+' = '+rand(0,100)+'%',mentions:[userJid,men]});return;}
   let genericos=['robar','tienda','comprar','inventario','banco','crime','robarbanco','ruleta','blackjack','dados','loteria','pagar','vender','casa','coche','mansion','yate','negocio','donar','cofre','mercado','subasta','carrera','poker','bingo','clear','antilink','welcome','setname','promote','demote','meme','chiste','8ball','amor','gay','topgays','abrazar','besar','pegar','matar','verdad','reto','ppt','caraocruz','clima','hora','calc','sticker','qr','afk','sorteo','imc','ficha','dni','licencia','policia','ems','mecanico','garaje','hospital','carcel','atraco','lavar','nivel','ranking','clan','evento','torneo','adivina','trivia','ajedrez','uno','futbol','pesca','minar','mision','logro','vip','caja','regalo','bonus','boost'];
   if(genericos.includes(cmd)){let u=getEco(userJid);u.xp+=5;if(u.xp>100){u.nivel++;u.xp=0;await sock.sendMessage(jid,{text:'⬆️ Nivel '+u.nivel})}eco[userJid]=u;saveEco();await sock.sendMessage(jid,{text:'✅ !'+cmd+' Nv.'+u.nivel,mentions:[userJid]});return;}
   if(antiOn&&jid.endsWith('@g.us')){let low=texto.toLowerCase();for(let p of MALAS){if(low.includes(p)){if(esOwner(userJid))break;try{await sock.sendMessage(jid,{delete:msg.key})}catch(e){}if(!warns[userJid])warns[userJid]=[];warns[userJid].push({razon:'Groseria'});saveWarns();let tot=warns[userJid].length;let ta='🚫 WARN '+tot+'/3 @'+userJid.split('@')[0];if(tot>=3){ta+=' EXPULSANDO';await sock.sendMessage(jid,{text:ta,mentions:[userJid]});try{await sock.groupParticipantsUpdate(jid,[userJid],'remove')}catch(e){}warns[userJid]=[];saveWarns();return;}await sock.sendMessage(jid,{text:ta,mentions:[userJid]});return;}}}


   if(texto.startsWith('!verificar')){
    let username=args[0];if(!username){await sock.sendMessage(jid,{text:'Uso !verificar <usuario>'});return;}
    try{let r1=await axios.post('https://users.roblox.com/v1/usernames/users',{usernames:[username],excludeBannedUsers:true});if(!r1.data.data.length){await sock.sendMessage(jid,{text:'❌ No '+username});return;}let robloxUser=r1.data.data[0];let thumb=await axios.get('https://thumbnails.roblox.com/v1/users/avatar?userIds='+robloxUser.id+'&size=720x720&format=Png&isCircular=false');let avatarUrl=thumb.data.data[0].imageUrl;let info=await axios.get('https://users.roblox.com/v1/users/'+robloxUser.id);verifs.set(userJid,{uid:robloxUser.id,foto:avatarUrl,nombre:info.data.name});let buttons=[{buttonId:'verif_si_'+robloxUser.id,buttonText:{displayText:'✅ Si - Es mi cuenta'},type:1},{buttonId:'verif_no_'+robloxUser.id,buttonText:{displayText:'❌ No'},type:1}];await sock.sendMessage(jid,{image:{url:avatarUrl},caption:'🌃 Greenville FF\n👤 '+info.data.name+'\n¿Es tu cuenta?',footer:'Verificacion',buttons:buttons,headerType:4});}catch(e){await sock.sendMessage(jid,{text:'Error Roblox'})}return;
   }
  }catch(e){console.log('Error '+e.message)}
 });
}
start();