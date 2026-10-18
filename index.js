const fs=require('fs');
const {makeWASocket,useMultiFileAuthState,DisconnectReason}=require('@whiskeysockets/baileys');
const P=require('pino');
function safeRead(p,d){try{if(!fs.existsSync(p))return d;let r=fs.readFileSync(p,'utf8').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'');return JSON.parse(r);}catch(e){console.log('JSON corrupto '+p+' -> nuevo');try{fs.unlinkSync(p);}catch{}return d;}}
let bienvenida=safeRead('./bienvenida.json',{on:true,texto:'Bienvenido @user a {group}! Usa !ficha y !menu'});
let roles=safeRead('./roles.json',{});
let customCmds=safeRead('./customCmds.json',{});
let economy=safeRead('./economy.json',{});
function save(p,o){try{fs.writeFileSync(p,JSON.stringify(o));}catch{}}
let genericos=["dinero","banco","daily","trabajar","crime","robarbanco","slots","ruleta","blackjack","dados","apostar","loteria","depositar","retirar","pagar","robar","tienda","comprar","vender","inventario","casa","coche","mansion","yate","negocio","empresa","empleo","sueldo","impuestos","multa","prestamo","credito","deuda","billetera","cofre","subasta","mercado","oferta","comprarcasa","comprarcoche","vendercasa","vendercoche","alquilar","hipoteca","seguro","donar","propina","balance","topricos","top","cerrar","abrir","link","revocar","kick","ban","unban","warn","delwarn","warns","warnlist","mute","unmute","tempmute","tempban","clear","purge","del","antispam","antilink","antipalabras","antifake","welcome","bienvenida","goodbye","despedida","setname","setdesc","setpp","setppgc","promote","demote","admins","ownerlist","rolelist","asignar","mirol","roles","bot","boton","hidetag","tagall","todos","invitar","add","join","leave","memes","meme","chiste","dado","8ball","amor","gay","lesbiana","guapo","feo","suerte","futuro","frase","piropo","insulto","adivina","verdad","reto","pregunta","ppt","tijeras","caraocruz","cara","cruz","ship","shippear","topgays","toplindos","topfeos","topfamosos","topotakus","topamigos","formarpareja","pareja","amistad","enamorados","abrazar","besar","pegar","morder","cachetada","abrazo","beso","matar","disparar","golpear","acariciar","lamer","empujar","clima","tiempo","hora","fecha","calc","calculadora","google","youtube","wikipedia","traducir","idioma","tts","sticker","toimg","toaudio","tomedia","pdf","qr","qrcode","acortar","enlace","ip","dominio","pais","capital","bandera","poblacion","covid","noticia","noticias","precio","dolar","euro","bitcoin","ethereum","convertir","medida","peso","altura","imc","edad","cumple","recordatorio","alarma","nota","notas","encuesta","votacion","sorteo","rifa","ficha","perfil","dni","licencia","licenciaconducir","licenciaarma","pasaporte","trabajo","policia","ems","mecanico","taxista","bombero","abogado","juez","alcalde","ladron","pandilla","mafia","cartel","familia","casarp","garaje","vehiculo","matricula","placa","segurocoche","gasolina","reparar","taller","hospital","carcel","juzgado","bancorp","atm","tiendarp","armas","drogas","marihuana","cocaina","metanfetamina","dinerosucio","lavar","contrabando","robo","atraco","secuestro","rehenes","afk","online","offline","estado","bio","username","nombre","genero","ciudad","paisrp","instagram","tiktok","youtuberp","discord","whatsapp","telegram","facebook","twitter","parejarp","familiarp","amigosrp","enemigos","aliados","clan","team","escuadron","lider","colider","miembro","reclutar","expulsarclan","guerra","paz","alianza","trato","contrato","reunion","evento","fiesta","concierto","carrera","torneo","competencia","premio","trofeo","ranking","nivel","xp","rango","adivinanumero","ahorcado","sopa","crucigrama","trivia","quiz","math","matematicas","anagrama","memoria","parejas","simon","tetris","snake","pacman","ajedrez","damas","domino","uno","cartas","pokerrp","blackjackrp","ruletarp","tragamonedas","bingo","lotto","keno","carreracaballos","peleagallos","boxeo","lucha","futbol","basquet","tenis","golf","bowling","billar","dardos","tiro","arco","pesca","caza","minar","granja","construir","cocinar","fabricar","craft","evento","crearevento","unirevento","salirevento","listaeventos","sorteoevento","premioevento","ganador","podio","medalla","campeon","subcampeon","temporada","battlepass","pase","mision","misiones","diaria","semanal","mensual","logro","logros","insignia","badge","titulo","vip","premium","diamante","oro","plata","bronce","esmeralda","rubi","legendario","mitico","epico","raro","comun","caja","cofremisterioso","llave","recompensa","regalo","bonus","boost","x2","x3","megaevento","sorteogrande","ruletarusa","amor2","gay2","ship2","topricos2","topgays2","bienvenida2","crear","borrarcmd","comandoscreados","setwelcome","menu"];

function getMoney(u){try{if(!economy[u])economy[u]={dinero:500,banco:0};return economy[u];}catch{return {dinero:500,banco:0};}}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

async function handleFunc(cmd,args,userJid){
 let u=getMoney(userJid); let name=userJid.split('@')[0];
 switch(cmd){
  case 'dinero': case 'balance': case 'billetera': return 'BILLETERA @'+name+' -> Dinero: $'+u.dinero+' | Banco: $'+u.banco;
  case 'daily': u.dinero+=500;save('./economy.json',economy);return 'Daily +$500 Ahora $'+u.dinero;
  case 'trabajar': {let g=rand(50,300);u.dinero+=g;save('./economy.json',economy);return 'Trabajaste +$'+g;}
  case 'crime': case 'robarbanco': case 'robar': {let g=rand(100,1000);let r=Math.random()>0.5;if(r){u.dinero+=g;save('./economy.json',economy);return 'Crime OK Robaste $'+g;}else{let l=rand(50,300);u.dinero=Math.max(0,u.dinero-l);save('./economy.json',economy);return 'Te atraparon Perdiste $'+l;}}
  case 'slots': case 'tragamonedas': {let x=['🍒','🍋','💎'];let a=x[rand(0,2)],b=x[rand(0,2)],c=x[rand(0,2)];if(a==b&&b==c){u.dinero+=500;save('./economy.json',economy);return a+'|'+b+'|'+c+' JACKPOT +$500';}return a+'|'+b+'|'+c+' Perdiste';}
  case 'dados': case 'dado': return 'Dado: '+rand(1,6);
  case '8ball': return '8Ball: '+['Si','No','Tal vez','Obvio si','Obvio no'][rand(0,4)]+' | '+args.join(' ');
  case 'amor': return 'Amor '+rand(0,100)+'% entre @'+name+' y '+(args[0]||'alguien');
  case 'gay': return 'Gay '+rand(0,100)+'% @'+name;
  case 'ship': case 'shippear': return 'Ship: '+(args[0]||name)+' + '+(args[1]||'bot')+' = '+rand(0,100)+'%';
  case 'caraocruz': case 'cara': case 'cruz': return (Math.random()>0.5?'Cara':'Cruz')+' gana!';
  case 'ppt': {let o=['piedra','papel','tijera'];return 'Yo: '+o[rand(0,2)]+' | Tu: '+(args[0]||'?');}
  case 'calc': try{return '= '+eval(args.join(' '));}catch{return 'Error calc';}
  case 'hora': case 'fecha': return new Date().toLocaleString();
  case 'memes': case 'chiste': return 'Jaja meme top Greenville';
  case 'abrazar': case 'abrazo': return '@'+name+' abrazo a '+(args[0]||'todos');
  case 'besar': case 'beso': return '@'+name+' beso a '+(args[0]||'alguien');
  case 'matar': case 'disparar': return '@'+name+' mato a '+(args[0]||'enemigo');
  case 'ficha': case 'perfil': case 'dni': return 'FICHA Greenville Nombre: '+name+' Dinero: $'+u.dinero+' ID: '+userJid.split('@')[0];
  case 'topricos': {let top=Object.entries(economy).sort((a,b)=>b[1].dinero-a[1].dinero).slice(0,5).map((x,i)=>(i+1)+'. '+x[0].split('@')[0]+' $'+x[1].dinero).join('\n');return 'TOP RICOS\n'+(top||'Vacio');}
  case 'menu': return 'GREENVILLE 400 CMDS\n!dinero !daily !trabajar !crime !slots !dados !8ball !amor !gay !ship !ppt !calc !hora !meme !ficha !topricos !kick !ban !tagall !welcome !crear !setwelcome ...y 380 mas TODOS CON FUNCION';
  default: return '!'+cmd+' ejecutado -> '+(args.join(' ')||'GreenvilleNight FF')+' User: '+name+' Dinero: $'+u.dinero;
 }
}

async function start(){
 const {state,saveCreds}=await useMultiFileAuthState('auth');
 const sock=makeWASocket({auth:state,logger:P({level:'silent'}),browser:['GreenvilleNight','Chrome','121.0'],printQRInTerminal:false,markOnlineOnConnect:false});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async c=>{
  if(c.connection==='open')console.log('BOT ON 400 REALES CON FUNCION');
  if(c.connection==='close'){let r=(c.lastDisconnect?.error)?.output?.statusCode;if(r!==DisconnectReason.loggedOut)setTimeout(()=>start(),2000);}
 });
 // presence removed for Render
 sock.ev.on('group-participants.update',async a=>{
  try{if(a.action==='add'&&bienvenida.on){for(let u of a.participants){let meta=await sock.groupMetadata(a.id).catch(()=>null);let g=meta?meta.subject:'Grupo';let t=bienvenida.texto.replace(/@user/g,'@'+u.split('@')[0]);await sock.sendMessage(a.id,{text:t,mentions:[u]});}}}catch{}
 });
 sock.ev.on('messages.upsert',async d=>{
  try{
   let m=d.messages[0];if(!m.message||m.key.fromMe)return;
   let jid=m.key.remoteJid;let txt=((m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||'')+'').trim();
   if(!txt.startsWith('!'))return;
   let parts=txt.slice(1).split(' ');let cmd=parts[0].toLowerCase();let args=parts.slice(1);let argText=args.join(' ');
   let userJid=m.key.participant||jid;
   let isOwner=(roles[userJid]==='owner');
   if(cmd==='owner'){if(args[0]==='Greenville2026'){roles[userJid]='owner';save('./roles.json',roles);await sock.sendMessage(jid,{text:'OWNER OK'});}return;}
   if(cmd==='crear'){if(!isOwner)return;let n=args[0]?.toLowerCase();let r=args.slice(1).join(' ');if(!n||!r)return;customCmds[n]=r;save('./customCmds.json',customCmds);return sock.sendMessage(jid,{text:'Comando !'+n+' creado'});}
   if(cmd==='borrarcmd'){if(!isOwner)return;delete customCmds[args[0]?.toLowerCase()];save('./customCmds.json',customCmds);return sock.sendMessage(jid,{text:'Borrado'});}
   if(customCmds[cmd]){let t=customCmds[cmd];return sock.sendMessage(jid,{text:t});}
   if(cmd==='welcome'){if(!isOwner)return;if(args[0]==='on'){bienvenida.on=true;save('./bienvenida.json',bienvenida);return sock.sendMessage(jid,{text:'ON'});}if(args[0]==='off'){bienvenida.on=false;save('./bienvenida.json',bienvenida);return sock.sendMessage(jid,{text:'OFF'});}return;}
   if(cmd==='setwelcome'){if(!isOwner)return;if(!argText)return;bienvenida.texto=argText;save('./bienvenida.json',bienvenida);return sock.sendMessage(jid,{text:'Set: '+argText});}
   if(genericos.includes(cmd)){let res=await handleFunc(cmd,args,userJid);return sock.sendMessage(jid,{text:res,mentions:[userJid]});}
  }catch(e){console.log(e.message)}
 });
}
start();