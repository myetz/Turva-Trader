import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase.js";

// ── Constants ──────────────────────────────────────────────────────────
const CATS = ['Raro Exclusivo','Raro Rotativo','Mobi HC','Raro Promocional','Raro Colecionável','Ecotron','Loot Box Grená Jun/2026','Loot Bot Orgulho Jun/2026'];
const CAT_C = {'Raro Exclusivo':'#1e90ff','Raro Rotativo':'#00ced1','Mobi HC':'#d4a017','Raro Promocional':'#cc0000','Raro Colecionável':'#b08f4f','Ecotron':'#7fff00','Loot Box Grená Jun/2026':'#722f5b','Loot Bot Orgulho Jun/2026':'#ff1493','Raro Comum':'#aaa','Outros':'#868e96'};
const G='#FFD700',G2='#CCA800',BG='#0a0804',BG2='#130f0a',BG3='#1a1208';
const FANSITE_BADGE='data:image/png;base64,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';

// ── Helpers ────────────────────────────────────────────────────────────
const fmtDate=s=>{if(!s)return'—';const p=String(s).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(s);};
const fmtTime=s=>{if(!s)return'';const d=new Date(s);return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const calcAvg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
const timeLeft=exp=>{const d=new Date(exp)-new Date();if(d<=0)return'Expirado';const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?`${h}h ${m}m`:`${m}m`;};

// ── Micro-components ──────────────────────────────────────────────────
const Badge=({cat})=>{const c=CAT_C[cat]||'#aaa';return<span style={{background:c+'22',border:`1px solid ${c}55`,color:c,padding:'2px 8px',fontSize:'12px'}}>{cat}</span>;};

const Flash=({msg})=>{if(!msg?.text)return null;const m={error:{bg:'#1a0000',b:'#f44',t:'#f88'},success:{bg:'#001500',b:'#4f4',t:'#8f8'},info:{bg:'#1a1000',b:G,t:G}};const c=m[msg.type]||m.info;return<div style={{background:c.bg,borderBottom:`2px solid ${c.b}`,padding:'9px 24px',fontSize:'17px',color:c.t,textAlign:'center',fontFamily:"'VT323',monospace"}}>{msg.text}</div>;};

const ChartTip=({active,payload,label})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return<div style={{background:'#1a1208',border:`2px solid ${G}`,padding:'10px 14px',fontFamily:"'VT323',monospace"}}><div style={{color:'#b3a075',fontSize:'15px',marginBottom:'4px'}}>{fmtDate(label)}</div><div style={{color:G,fontFamily:"'Press Start 2P',monospace",fontSize:'12px',marginBottom:'4px'}}>{payload[0].value}c <span style={{fontSize:'9px',color:'#cdac72'}}>média/un</span></div><div style={{color:'#7dffaa',fontSize:'16px'}}>{d.units} unidade{d.units!==1?'s':''} negociada{d.units!==1?'s':''}</div></div>;};

const Corners=()=><>{['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'10px',height:'10px',background:G,top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}</>;

const Img=({url,alt,size=36})=>(
  <div style={{width:size,height:size,flexShrink:0,border:`1px solid #2a1f0d`,background:BG,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
    {url?<img src={url} alt={alt} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#2a1f0d',fontSize:size*0.4}}>◈</span>}
  </div>
);

// ── Paginator ─────────────────────────────────────────────────────────
const Paginator=({page,setPage,total,size=15,isMobile})=>{
  const pages=Math.ceil(total/size);
  if(pages<=1)return null;
  const from=page*size+1,to=Math.min((page+1)*size,total);
  const btnS={background:'#1a1000',border:`1px solid ${G}`,color:G,padding:isMobile?'8px 16px':'5px 12px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  return(
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 16px',borderTop:'1px solid #1a1000',justifyContent:'center',fontFamily:"'VT323',monospace",fontSize:'17px',background:'#0a0800',flexWrap:'wrap'}}>
      <button style={{...btnS,...(page===0?{opacity:.3,cursor:'default'}:{})}} disabled={page===0} onClick={()=>setPage(p=>p-1)}>◀ anterior</button>
      <span style={{color:'#cdac72'}}>{from}–{to}</span>
      <span style={{color:'#9a7d45'}}>de <span style={{color:G}}>{total}</span></span>
      <span style={{color:'#7a6035'}}>·</span>
      <span style={{color:'#b89545'}}>pág {page+1}/{pages}</span>
      <button style={{...btnS,...(page>=pages-1?{opacity:.3,cursor:'default'}:{})}} disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)}>próxima ▶</button>
    </div>
  );
};

// ── Modal wrapper ─────────────────────────────────────────────────────
const Modal=({show,onClose,title,children,width='490px'})=>{
  if(!show)return null;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'16px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{background:BG2,border:`2px solid ${G}`,boxShadow:`8px 8px 0 #2a1800`,padding:'20px',width,maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',position:'relative',animation:'sd .2s ease'}}>
        <Corners/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',borderBottom:`1px solid #2a1800`,paddingBottom:'12px'}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'10px',color:G,letterSpacing:'1px'}}>{title}</div>
          <span style={{color:'#443300',cursor:'pointer',fontSize:'22px',lineHeight:1}} onClick={onClose}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────────────────
export default function App(){
  // Auth
  const [screen,setScreen]=useState('loading');
  const [user,setUser]=useState(null);
  const [lF,setLF]=useState({u:'',p:''});
  const [rF,setRF]=useState({u:'',p:'',c:''});
  // Nav
  const [tab,setTab]=useState('mercado');
  const [sidebarOpen,setSidebarOpen]=useState(true);
  // Data
  const [trades,setTrades]=useState([]);
  const [rarities,setRarities]=useState([]);
  const [portfolio,setPortfolio]=useState([]);
  const [orders,setOrders]=useState([]);
  const [pendingTrades,setPendingTrades]=useState([]);
  const [messages,setMessages]=useState([]);
  // Mercado
  const [search,setSearch]=useState('');
  const [selRaro,setSelRaro]=useState(null);
  const [quickRaro,setQuickRaro]=useState(null);
  const [histView,setHistView]=useState('dia');
  const [mSort,setMSort]=useState('lastDate');
  const [mSortDir,setMSortDir]=useState('desc');
  // Painel
  const [pSearch,setPSearch]=useState('');
  const [pSort,setPSort]=useState('raro');
  const [pSortDir,setPSortDir]=useState('asc');
  const [pStatusFilter,setPStatusFilter]=useState('todos');
  // Orders
  const [orderFilter,setOrderFilter]=useState('todos');
  // Moderation
  const [modSearch,setModSearch]=useState('');
  const [chatModSearch,setChatModSearch]=useState('');
  const [viewUser,setViewUser]=useState('');
  const [viewUserData,setViewUserData]=useState(null);
  const [allUsers,setAllUsers]=useState([]);
  const [allUsersFull,setAllUsersFull]=useState([]);
  const [accessLogs,setAccessLogs]=useState([]);
  const [pwResetUser,setPwResetUser]=useState('');
  const [pwResetVal,setPwResetVal]=useState('');
  // Chat
  const [chatOpen,setChatOpen]=useState(false);
  const [chatInput,setChatInput]=useState('');
  const chatRef=useRef(null);
  // Modals
  const [showTM,setShowTM]=useState(false);
  const [showTroca,setShowTroca]=useState(false);
  const [trF,setTrF]=useState(null);
  const [convertingId,setConvertingId]=useState(null);
  const [showTutorial,setShowTutorial]=useState(false);
  const [showAccount,setShowAccount]=useState(false);
  const [accForm,setAccForm]=useState({atual:'',nova:'',confirma:''});
  const [showTutorialOverlay,setShowTutorialOverlay]=useState(false);
  const [tutorialStep,setTutorialStep]=useState(0);
  const [showOM,setShowOM]=useState(false);
  const [showOrderModal,setShowOrderModal]=useState(false);
  const [showEditModal,setShowEditModal]=useState(false);
  const [showPEdit,setShowPEdit]=useState(false);
  const [editingTrade,setEditingTrade]=useState(null);
  const [editingP,setEditingP]=useState(null);
  const [editingOrder,setEditingOrder]=useState(null);
  // Misc
  const [msg,setMsg]=useState({text:'',type:'info'});
  const [loading,setLoading]=useState(false);
  const [isMobile,setIsMobile]=useState(typeof window!=='undefined'&&window.innerWidth<768);
  const [menuOpen,setMenuOpen]=useState(false);
  const [hoverTab,setHoverTab]=useState(null);
  // Pagination
  const [mPage,setMPage]=useState(0);
  const [pPage,setPPage]=useState(0);
  const [modPPage,setModPPage]=useState(0);
  const [modAPage,setModAPage]=useState(0);
  const [modCPage,setModCPage]=useState(0);
  const PAGE=15;
  const today=new Date().toISOString().split('T')[0];
  const eTroca={ladoA:[{raro:'',qtd:1}],ladoB:[{raro:'',qtd:1}],moedasA:'',moedasB:'',valorManual:'',data:today,jogadorA:'',jogadorB:''};
  const eT={raro:'',quantidade:1,categoria:'Raro Exclusivo',priceMode:'total',precoVenda:'',precoPorUnidade:'',precoBarras:'',data:today,vendedor:'',comprador:''};
  const eO={raro:'',quantidade:1,tipo:'compra',precoTotal:'',precoPorUnidade:'',precoBarras:'',data:today,priceMode:'total'};
  const eOrder={tipo:'compra',items:[{raro:'',quantidade:1,preco:''}],observacao:''};
  const [tF,setTF]=useState(eT);
  const [oF,setOF]=useState(eO);
  const [orderForm,setOrderForm]=useState(eOrder);

  // ── Global CSS ──────────────────────────────────────────────────────
  useEffect(()=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';document.head.appendChild(link);
    const s=document.createElement('style');
    s.textContent=`
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:${BG};overflow:hidden}
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:${BG2}}
      ::-webkit-scrollbar-thumb{background:#3a2a10}
      ::-webkit-scrollbar-thumb:hover{background:${G}}
      input,select,button,textarea{font-family:'VT323',monospace}
      @keyframes sd{from{transform:translateY(-14px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
      @keyframes chatpop{from{transform:scale(.95) translateY(10px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      .anim{animation:sd .22s ease}
      .blink{animation:blink 1.3s infinite}
      .rrow:hover{background:#1a1000!important;cursor:pointer}
      .ch:hover{border-left-color:${G}!important;background:#180f00!important;cursor:pointer}
      .cs{border-left-color:${G}!important;background:#180f00!important}
      .inp:focus{outline:none!important;border-color:${G}!important;box-shadow:0 0 0 1px ${G}44}
      input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.8) sepia(1) saturate(5) hue-rotate(5deg);cursor:pointer}
      .tab-a{color:${G}!important;border-bottom:3px solid ${G}!important;background:linear-gradient(to bottom,#1a1000,#0f0800)!important}
      .tab-i:hover{color:#aa8833!important;background:#110900!important}
      .chat-anim{animation:chatpop .2s ease}
      /* Mobile */
      @media(max-width:768px){
        body{overflow:auto!important;-webkit-text-size-adjust:100%}
        .tab-bar{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
        .tab-bar::-webkit-scrollbar{display:none}
        .tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .modal-box{width:100%!important;max-width:100vw!important;margin:0!important;border-radius:0!important;height:100vh!important;max-height:100vh!important}
        .stat-grid{grid-template-columns:1fr 1fr!important}
        .chat-widget{width:calc(100vw - 16px)!important;right:8px!important}
      }
    `;
    document.head.appendChild(s);
    const su=localStorage.getItem('tt-user');
    if(su){const u=JSON.parse(su);setUser(u);loadAll(u.username);setScreen('dashboard');logAccess(u.username);}
    else setScreen('login');
    const onResize=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener('resize',onResize);
    return()=>window.removeEventListener('resize',onResize);
  },[]);

  // Chat polling
  useEffect(()=>{
    if(screen!=='dashboard')return;
    loadMessages();
    const id=setInterval(loadMessages,6000);
    return()=>clearInterval(id);
  },[screen]);

  useEffect(()=>{if(chatRef.current&&chatOpen)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages,chatOpen]);

  // ── Data ───────────────────────────────────────────────────────────
  async function loadAll(uname){
    const un=uname||user?.username;
    if(!un)return;
    try{
      const {data:uData}=await supabase.from('users').select('is_admin').eq('username',un).maybeSingle();
      const isAdm=!!(uData?.is_admin);
      const baseQ=[
        supabase.from('trades').select('*').eq('status','approved').order('data',{ascending:true}),
        supabase.from('rarities').select('*'),
        supabase.from('portfolio').select('*').eq('username',un).order('data',{ascending:false}),
        supabase.from('orders').select('*').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
        ...(isAdm?[supabase.from('trades').select('*').eq('status','pending').order('created_at',{ascending:false})]:[]),
      ];
      const [tR,rR,pR,oR,...rest]=await Promise.all(baseQ);
      if(tR?.data)setTrades(tR.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por,trocaInfo:x.troca_info})));
      if(rR?.data)setRarities(rR.data);
      if(pR?.data)setPortfolio(pR.data.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade:x.preco_por_unidade})));
      if(oR?.data)setOrders(oR.data);
      if(rest[0]?.data)setPendingTrades(rest[0].data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por,trocaInfo:x.troca_info})));
      setUser(prev=>{
        const updated=prev?{...prev,is_admin:isAdm}:prev;
        if(updated)localStorage.setItem('tt-user',JSON.stringify(updated));
        return updated;
      });
      if(isAdm)loadAdminUsers();
    }catch(e){console.warn('loadAll:',e);}
  }

  async function loadMessages(){
    const {data}=await supabase.from('messages').select('*').order('created_at',{ascending:true}).limit(200);
    if(data)setMessages(data);
  }

  async function deleteMessage(id){
    await supabase.from('messages').delete().eq('id',id);
    await loadMessages();
  }

  async function loadAdminUsers(){
    // Busca todos os usuários e quem tem registros no portfólio
    const [usersR,portR]=await Promise.all([
      supabase.from('users').select('id,username,is_admin').order('username',{ascending:true}),
      supabase.from('portfolio').select('username'),
    ]);
    if(usersR.data){
      const comRegistro=new Set((portR.data||[]).map(p=>p.username));
      setAllUsersFull(usersR.data); // lista completa (p/ reset de senha)
      setAllUsers(usersR.data.filter(u=>comRegistro.has(u.username))); // só com registros (p/ painel)
    }
    // Carrega logs de acesso (últimos 2000)
    const {data:logs}=await supabase.from('access_logs').select('*').neq('username','Bot').order('created_at',{ascending:false}).limit(2000);
    if(logs)setAccessLogs(logs);
  }

  async function doResetPassword(){
    if(!pwResetUser){flash('Selecione um usuário.','error');return;}
    if(!pwResetVal||pwResetVal.length<4){flash('Senha mínima: 4 caracteres.','error');return;}
    setLoading(true);
    const hashed=await hashPassword(pwResetVal);
    const {error}=await supabase.from('users').update({password:hashed}).eq('username',pwResetUser);
    setLoading(false);
    if(error){flash('Erro ao redefinir senha.','error');return;}
    flash(`Senha de "${pwResetUser}" redefinida com sucesso!`,'success');
    setPwResetUser('');setPwResetVal('');
  }

  async function doChangePassword(){
    if(!accForm.atual||!accForm.nova||!accForm.confirma){flash('Preencha todos os campos.','error');return;}
    if(accForm.nova!==accForm.confirma){flash('A nova senha e a confirmação não conferem.','error');return;}
    if(accForm.nova.length<4){flash('A nova senha precisa ter no mínimo 4 caracteres.','error');return;}
    setLoading(true);
    // Verifica a senha atual (testa hash novo e legado)
    const hashedAtual=await hashPassword(accForm.atual);
    let {data:check}=await supabase.from('users').select('id,password').eq('username',user.username).maybeSingle();
    if(!check||(check.password!==hashedAtual&&check.password!==accForm.atual)){
      setLoading(false);flash('Senha atual incorreta.','error');return;
    }
    const hashedNova=await hashPassword(accForm.nova);
    const {error}=await supabase.from('users').update({password:hashedNova}).eq('username',user.username);
    setLoading(false);
    if(error){flash('Erro ao alterar senha.','error');return;}
    // Atualiza a sessão salva localmente
    const updated={...user,password:hashedNova};
    setUser(updated);localStorage.setItem('tt-user',JSON.stringify(updated));
    setShowAccount(false);setAccForm({atual:'',nova:'',confirma:''});
    flash('Senha alterada com sucesso! 🔒','success');
  }

  async function loadViewUser(uname){
    if(!uname){setViewUserData(null);return;}
    const {data:p}=await supabase.from('portfolio').select('*').eq('username',uname).order('data',{ascending:false});
    if(!p){setViewUserData(null);return;}
    const ops=p.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade:x.preco_por_unidade}));
    const map={};
    ops.forEach(op=>{if(!map[op.raro])map[op.raro]={raro:op.raro,c:[],v:[]};map[op.raro][op.tipo==='compra'?'c':'v'].push(op);});
    const stats=Object.values(map).map(item=>{
      const qC=item.c.reduce((s,o)=>s+o.quantidade,0),qV=item.v.reduce((s,o)=>s+o.quantidade,0);
      const inv2=item.c.reduce((s,o)=>s+o.precoTotal,0),rec2=item.v.reduce((s,o)=>s+o.precoTotal,0);
      const custo=qC?Math.round(inv2/qC):0;
      return{raro:item.raro,comprados:qC,vendidos:qV,estoque:qC-qV,custo,investido:inv2,vendido:rec2,lucro:Math.round(rec2-(qV*custo))};
    });
    const inv2=stats.reduce((s,i)=>s+i.investido,0),rec2=stats.reduce((s,i)=>s+i.vendido,0);
    setViewUserData({stats,totals:{inv:inv2,rec:rec2,balanco:rec2-inv2,lucroTotal:stats.reduce((s,i)=>s+i.lucro,0),parado:stats.reduce((s,i)=>s+(i.estoque*i.custo),0)}});
  }

  const flash=(text,type='info')=>{setMsg({text,type});setTimeout(()=>setMsg({text:'',type:'info'}),3500);};

  // ── Auth ───────────────────────────────────────────────────────────
  // Gera hash SHA-256 da senha (com sal fixo do site) para nunca trafegar/armazenar senha pura
  async function hashPassword(pw){
    const enc=new TextEncoder().encode('turva-trader-salt-v1::'+pw);
    const buf=await crypto.subtle.digest('SHA-256',enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function logAccess(uname){
    try{await supabase.from('access_logs').insert({username:uname,event:'login'});}catch(e){console.warn('log:',e);}
  }

  async function doLogin(){
    if(!lF.u||!lF.p){flash('Preencha todos os campos.','error');return;}
    setLoading(true);
    const hashed=await hashPassword(lF.p);
    // tenta primeiro com hash (novo padrão); se não achar, tenta senha pura (legado) e migra
    let {data,error}=await supabase.from('users').select('*').eq('username',lF.u).eq('password',hashed).maybeSingle();
    if(!data&&!error){
      const legacy=await supabase.from('users').select('*').eq('username',lF.u).eq('password',lF.p).maybeSingle();
      if(legacy.data){
        // migra a senha legada para hash automaticamente
        await supabase.from('users').update({password:hashed}).eq('id',legacy.data.id);
        data={...legacy.data,password:hashed};
      }
    }
    setLoading(false);
    if(error||!data){flash('Usuário ou senha incorretos.','error');return;}
    setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
    try{await loadAll(data.username);}catch(e){console.warn(e);}
    setLF({u:'',p:''});setScreen('dashboard');
    logAccess(data.username);
    if(!localStorage.getItem('tt-tutorial-done')){setTutorialStep(0);setShowTutorialOverlay(true);}
  }

  async function doRegister(){
    if(!rF.u.trim()||!rF.p){flash('Preencha todos os campos.','error');return;}
    if(rF.p!==rF.c){flash('As senhas não conferem.','error');return;}
    if(rF.p.length<4){flash('Senha mínima: 4 chars.','error');return;}
    setLoading(true);
    const {data:ex}=await supabase.from('users').select('id').eq('username',rF.u.trim()).maybeSingle();
    if(ex){setLoading(false);flash('Usuário já existe.','error');return;}
    const hashed=await hashPassword(rF.p);
    const {data,error}=await supabase.from('users').insert({username:rF.u.trim(),password:hashed}).select().single();
    setLoading(false);
    if(error||!data){flash('Erro ao criar conta.','error');return;}
    setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
    try{await loadAll(data.username);}catch(e){console.warn(e);}
    setRF({u:'',p:'',c:''});setScreen('dashboard');flash('Bem-vindo(a)!','success');
    logAccess(data.username);
    setTutorialStep(0);setShowTutorialOverlay(true);
  }

  function doLogout(){setUser(null);setSelRaro(null);setTrades([]);setPortfolio([]);setRarities([]);setOrders([]);setMessages([]);localStorage.removeItem('tt-user');setScreen('login');}

  // ── Trades ─────────────────────────────────────────────────────────
  // Conversão de barras: 1 barra = 50c
  const BARRA=50;
  async function doAddTrade(){
    const priceVal=tF.priceMode==='total'?tF.precoVenda:tF.priceMode==='unit'?tF.precoPorUnidade:tF.precoBarras;
    if(!tF.raro.trim()||!priceVal||!tF.vendedor.trim()||!tF.comprador.trim()||!tF.data){flash('Preencha todos os campos (*).','error');return;}
    const qtd=Math.max(1,parseInt(tF.quantidade)||1);
    let pv,ppu;
    if(tF.priceMode==='total'){pv=parseFloat(tF.precoVenda);ppu=Math.round(pv/qtd);}
    else if(tF.priceMode==='unit'){ppu=parseFloat(tF.precoPorUnidade);pv=ppu*qtd;}
    else{const barras=parseFloat(tF.precoBarras);pv=Math.round(barras*BARRA);ppu=Math.round(pv/qtd);}
    if(isNaN(pv)||pv<0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {error}=await supabase.from('trades').insert({raro:tF.raro.trim(),quantidade:qtd,categoria:tF.categoria,preco_venda:pv,preco_por_unidade:ppu,data:tF.data,vendedor:tF.vendedor.trim(),comprador:tF.comprador.trim(),lancado_por:user.username,status:user.is_admin?'approved':'pending'});
    setLoading(false);
    if(error){flash(`Erro ao salvar: ${error.message}`,'error');return;}
    await loadAll();setShowTM(false);setTF(eT);
    flash(user.is_admin?'Registrada!':'Enviada para aprovação ⏳','success');
  }

  // ── Avaliação de negociação (venda, troca ou mista, com moedas) ──
  // Moedas = valor exato (âncora forte). Raro conhecido = avgPrice estimado.
  function avaliarTroca(trf){
    if(!trf)return null;
    const info=(lado,moedas)=>{
      const itens=lado.filter(x=>x.raro.trim());
      const coins=Math.max(0,parseInt(moedas)||0);
      let rarosValue=0,confianca=0,hasUnknown=false;
      itens.forEach(x=>{
        const u=uRaros.find(r=>r.raro===x.raro);
        const qtd=Math.max(1,parseInt(x.qtd)||1);
        if(u&&u.count>0){rarosValue+=u.avgPrice*qtd;confianca+=u.count;}
        else hasUnknown=true;
      });
      return{itens,coins,rarosValue:Math.round(rarosValue),valor:Math.round(rarosValue)+coins,confianca,hasUnknown,isPureCoins:itens.length===0&&coins>0};
    };
    const A=info(trf.ladoA,trf.moedasA),B=info(trf.ladoB,trf.moedasB);
    const totalRaros=A.itens.length+B.itens.length;
    // cada lado precisa ter algo (raro ou moeda) e precisa existir ao menos 1 raro no total
    const valido=(A.itens.length>0||A.coins>0)&&(B.itens.length>0||B.coins>0)&&totalRaros>=1;
    const canA=!A.hasUnknown,canB=!B.hasUnknown; // lado totalmente avaliável
    let ancora=null,V=0,manual=false;
    if(canA&&canB){
      if(A.isPureCoins&&!B.isPureCoins)ancora='A';      // moedas = preço real pago
      else if(B.isPureCoins&&!A.isPureCoins)ancora='B';
      else ancora=A.confianca>=B.confianca?'A':'B';      // o mais negociado ancora
    }else if(canA)ancora='A';
    else if(canB)ancora='B';
    if(ancora)V=ancora==='A'?A.valor:B.valor;
    else{manual=true;V=Math.max(0,parseInt(trf.valorManual)||0);}
    // Ajuste manual sempre tem prioridade (negócio fora da curva)
    if(trf.valorManual!==''&&trf.valorManual!=null&&!isNaN(parseInt(trf.valorManual)))V=Math.max(0,parseInt(trf.valorManual));
    return{A,B,valido,ancora,V,manual};
  }

  async function doAddTroca(){
    const av=avaliarTroca(trF);
    if(!av||!av.valido){flash('Adicione ao menos um raro e preencha os dois lados.','error');return;}
    if(!trF.jogadorA.trim()||!trF.jogadorB.trim()||!trF.data){flash('Preencha os jogadores e a data.','error');return;}
    if(av.V<=0){flash('Defina o valor da negociação.','error');return;}
    // Distribui o valor entre os raros de cada lado. Para o lado âncora usa o valor de mercado;
    // para o outro, o restante após descontar as moedas do próprio lado.
    const distribui=(side,isAncora)=>{
      const target=isAncora?side.rarosValue:Math.max(0,av.V-side.coins);
      const itens=side.itens.map(x=>{
        const u=uRaros.find(r=>r.raro===x.raro);
        const qtd=Math.max(1,parseInt(x.qtd)||1);
        const peso=(u&&u.count>0?u.avgPrice:0)*qtd;
        return{raro:x.raro.trim(),qtd,peso};
      });
      const somaPeso=itens.reduce((s,i)=>s+i.peso,0);
      const somaQtd=itens.reduce((s,i)=>s+i.qtd,0);
      return itens.map(i=>{
        const fracao=somaPeso>0?i.peso/somaPeso:(somaQtd>0?i.qtd/somaQtd:0);
        const total=Math.round(target*fracao);
        return{...i,total,ppu:Math.round(total/i.qtd)};
      });
    };
    const distA=distribui(av.A,av.ancora==='A'),distB=distribui(av.B,av.ancora==='B');
    // Descrição de cada lado (raros + moedas) para o marcador 🔄
    const desc=(dist,coins)=>{const p=dist.map(i=>`${i.qtd}x ${i.raro}`);if(coins>0)p.push(`${coins}c`);return p.join(' + ');};
    const descA=desc(distA,av.A.coins),descB=desc(distB,av.B.coins);
    setLoading(true);
    const rows=[];
    const st=user.is_admin?'approved':'pending';
    // Lado A: jogadorA entregou (vendedor=A, comprador=B). É troca se o lado B tiver raros; senão é venda normal.
    distA.forEach(i=>{
      const cat=rarities.find(r=>r.raro===i.raro)?.categoria||'Outros';
      rows.push({raro:i.raro,quantidade:i.qtd,categoria:cat,preco_venda:i.total,preco_por_unidade:i.ppu,data:trF.data,vendedor:trF.jogadorA.trim(),comprador:trF.jogadorB.trim(),lancado_por:user.username,status:st,troca_info:av.B.itens.length>0?`🔄 trocado por: ${descB}`:null});
    });
    distB.forEach(i=>{
      const cat=rarities.find(r=>r.raro===i.raro)?.categoria||'Outros';
      rows.push({raro:i.raro,quantidade:i.qtd,categoria:cat,preco_venda:i.total,preco_por_unidade:i.ppu,data:trF.data,vendedor:trF.jogadorB.trim(),comprador:trF.jogadorA.trim(),lancado_por:user.username,status:st,troca_info:av.A.itens.length>0?`🔄 trocado por: ${descA}`:null});
    });
    const {error}=await supabase.from('trades').insert(rows);
    if(error){setLoading(false);flash(`Erro ao salvar: ${error.message}`,'error');return;}
    // Se está convertendo um trade antigo em troca, remove o registro original
    if(convertingId){await supabase.from('trades').delete().eq('id',convertingId);setConvertingId(null);}
    setLoading(false);
    await loadAll();setShowTroca(false);setTrF(eTroca);
    const ehTroca=av.A.itens.length>0&&av.B.itens.length>0;
    flash(user.is_admin?(ehTroca?'Troca registrada! 🔄':'Negociação registrada!'):'Enviada para aprovação ⏳','success');
  }

  function handleRaroSelect(raro){
    const found=rarities.find(r=>r.raro===raro);
    setTF(prev=>({...prev,raro,categoria:found?.categoria||prev.categoria}));
  }

  // ── Portfolio ──────────────────────────────────────────────────────
  async function doAddOp(){
    const qtd=Math.max(1,parseInt(oF.quantidade)||1);
    let pt,ppu;
    if(oF.priceMode==='total'){pt=parseFloat(oF.precoTotal);ppu=pt>=0?Math.round(pt/qtd):0;}
    else if(oF.priceMode==='unit'){ppu=parseFloat(oF.precoPorUnidade);pt=ppu*qtd;}
    else{const b=parseFloat(oF.precoBarras);pt=Math.round(b*BARRA);ppu=pt>=0?Math.round(pt/qtd):0;}
    if(!oF.raro.trim()||!oF.data){flash('Preencha todos os campos (*).','error');return;}
    if(isNaN(pt)||pt<0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {error}=await supabase.from('portfolio').insert({username:user.username,raro:oF.raro.trim(),quantidade:qtd,tipo:oF.tipo,preco_total:pt,preco_por_unidade:ppu,data:oF.data});
    setLoading(false);
    if(error){flash('Erro ao salvar.','error');return;}
    await loadAll();setShowOM(false);setOF(eO);flash(`${oF.tipo==='compra'?'Compra':'Venda'} registrada!`,'success');
  }

  function useCatalogPrice(){
    const cat=rarities.find(r=>r.raro===oF.raro);
    if(!cat){flash('Raro não encontrado no catálogo.','error');return;}
    const pc=cat.preco_catalogo||0;
    const qtd=Math.max(1,parseInt(oF.quantidade)||1);
    setOF({...oF,priceMode:'unit',precoPorUnidade:String(pc),precoTotal:String(pc*qtd),precoBarras:''});
    flash(pc===0?'Raro gratuito (0c).':`Preço do catálogo: ${pc}c/un`,'success');
  }

  async function deletePortfolioRaro(raro){
    if(!window.confirm(`Excluir TODOS os dados de "${raro}"?`))return;
    await supabase.from('portfolio').delete().eq('username',user.username).eq('raro',raro);
    await loadAll();flash('Dados excluídos.','info');
  }

  function openPEdit(item){setEditingP({raro:item.raro,comprados:item.comprados,investido:item.investido,vendidos:item.vendidos,vendido:item.vendido});setShowPEdit(true);}

  async function doEditPortfolioRaro(){
    if(!editingP)return;
    const qtdC=parseInt(editingP.comprados)||0,invst=parseFloat(editingP.investido)||0;
    const qtdV=parseInt(editingP.vendidos)||0,rec=parseFloat(editingP.vendido)||0;
    setLoading(true);
    await supabase.from('portfolio').delete().eq('username',user.username).eq('raro',editingP.raro);
    if(qtdC>0)await supabase.from('portfolio').insert({username:user.username,raro:editingP.raro,quantidade:qtdC,tipo:'compra',preco_total:invst,preco_por_unidade:qtdC?Math.round(invst/qtdC):0,data:today});
    if(qtdV>0)await supabase.from('portfolio').insert({username:user.username,raro:editingP.raro,quantidade:qtdV,tipo:'venda',preco_total:rec,preco_por_unidade:qtdV?Math.round(rec/qtdV):0,data:today});
    setLoading(false);await loadAll();setShowPEdit(false);setEditingP(null);flash('Dados atualizados!','success');
  }

  // ── Orders ─────────────────────────────────────────────────────────
  async function doSaveOrder(){
    const valid=orderForm.items.filter(it=>it.raro.trim()&&parseInt(it.quantidade)>0);
    if(!valid.length){flash('Adicione pelo menos 1 raro.','error');return;}
    setLoading(true);
    const payload={username:user.username,tipo:orderForm.tipo,items:valid.map(it=>({raro:it.raro.trim(),quantidade:parseInt(it.quantidade),preco:parseFloat(it.preco)||0})),observacao:orderForm.observacao||null,expires_at:new Date(Date.now()+72*3600000).toISOString()};
    const {error}=editingOrder?await supabase.from('orders').update(payload).eq('id',editingOrder.id):await supabase.from('orders').insert(payload);
    setLoading(false);
    if(error){flash('Erro ao salvar ordem.','error');return;}
    await loadAll();setShowOrderModal(false);setOrderForm(eOrder);setEditingOrder(null);
    flash(editingOrder?'Ordem atualizada!':'Publicada por 72h!','success');
  }

  async function deleteOrder(id){if(!window.confirm('Excluir esta ordem?'))return;await supabase.from('orders').delete().eq('id',id);await loadAll();flash('Ordem excluída.','info');}
  function openEditOrder(order){setEditingOrder(order);setOrderForm({tipo:order.tipo,items:order.items.map(it=>({...it})),observacao:order.observacao||''});setShowOrderModal(true);}
  const addOItem=()=>setOrderForm({...orderForm,items:[...orderForm.items,{raro:'',quantidade:1,preco:''}]});
  const rmOItem=i=>setOrderForm({...orderForm,items:orderForm.items.filter((_,j)=>j!==i)});
  const updOItem=(i,f,v)=>{const its=[...orderForm.items];its[i]={...its[i],[f]:v};setOrderForm({...orderForm,items:its});};

  // ── Moderation ─────────────────────────────────────────────────────
  async function approveTrade(id){await supabase.from('trades').update({status:'approved'}).eq('id',id);await loadAll();flash('Aprovada ✅','success');}
  async function rejectTrade(id){if(!window.confirm('Rejeitar e excluir?'))return;await supabase.from('trades').delete().eq('id',id);await loadAll();flash('Rejeitada.','info');}
  async function adminDeleteTrade(id){if(!window.confirm('Excluir esta negociação?'))return;await supabase.from('trades').delete().eq('id',id);await loadAll();flash('Excluída.','info');}
  function openEditTrade(t){setEditingTrade({id:t.id,raro:t.raro,quantidade:t.quantidade,categoria:t.categoria||'Raro Exclusivo',precoVenda:t.preco_venda||t.precoVenda,precoPorUnidade:t.preco_por_unidade||t.precoPorUnidade||0,priceMode:'total',data:t.data,vendedor:t.vendedor,comprador:t.comprador,trocaInfo:t.troca_info||t.trocaInfo||null});setShowEditModal(true);}
  async function doEditTrade(){
    const qtd=Math.max(1,parseInt(editingTrade.quantidade)||1);
    let pv,ppu;
    if(editingTrade.priceMode==='unit'){ppu=parseFloat(editingTrade.precoPorUnidade);pv=Math.round(ppu*qtd);}
    else if(editingTrade.priceMode==='barra'){const b=parseFloat(editingTrade.precoBarras);pv=Math.round(b*BARRA);ppu=Math.round(pv/qtd);}
    else{pv=parseFloat(editingTrade.precoVenda);ppu=Math.round(pv/qtd);}
    if(isNaN(pv)||pv<0){flash('Preço inválido.','error');return;}
    setLoading(true);
    await supabase.from('trades').update({raro:editingTrade.raro.trim(),quantidade:qtd,categoria:editingTrade.categoria,preco_venda:pv,preco_por_unidade:ppu,data:editingTrade.data,vendedor:editingTrade.vendedor.trim(),comprador:editingTrade.comprador.trim()}).eq('id',editingTrade.id);
    setLoading(false);await loadAll();setShowEditModal(false);setEditingTrade(null);flash('Atualizada!','success');
  }

  // ── Chat ───────────────────────────────────────────────────────────
  async function sendMessage(){
    if(!chatInput.trim())return;
    if(chatInput.length>200){flash('Mensagem muito longa (máx. 200 chars).','error');return;}
    await supabase.from('messages').insert({username:user.username,message:chatInput.trim()});
    setChatInput('');
    await loadMessages();
  }

  // ── Computed ───────────────────────────────────────────────────────
  // Expande negociações em unidades individuais até o limite N (mais recentes primeiro)
  function getLastNUnits(sortedItems,n){
    const units=[];
    for(const t of sortedItems){
      const qty=Math.max(1,t.quantidade||1);
      const toAdd=Math.min(qty,n-units.length);
      for(let i=0;i<toAdd;i++)units.push(t.precoPorUnidade);
      if(units.length>=n)break;
    }
    return units;
  }

  const uRaros=useMemo(()=>{
    const map={};
    rarities.forEach(r=>{map[r.raro]={raro:r.raro,categoria:r.categoria||'Outros',items:[]};});
    trades.forEach(t=>{if(!map[t.raro])map[t.raro]={raro:t.raro,categoria:t.categoria,items:[]};map[t.raro].items.push(t);});
    return Object.values(map).map(r=>{
      if(!r.items.length)return{...r,lastDate:null,avgPrice:0,lastPrice:0,count:0,trend:0};
      const s=[...r.items].sort((a,b)=>b.data.localeCompare(a.data));
      // Total de unidades vendidas (mostrado na coluna UNID.)
      const totalUnits=r.items.reduce((acc,t)=>acc+Math.max(1,t.quantidade||1),0);
      // Média das últimas 3 negociações (independente de quantidade)
      const last3=s.slice(0,3).map(t=>t.precoPorUnidade);
      const avg3=calcAvg(last3);
      // Tendência: últimas 3 negociações vs 3 anteriores
      const prev3=s.slice(3,6).map(t=>t.precoPorUnidade);
      const trend=prev3.length?calcAvg(last3)-calcAvg(prev3):0;
      return{...r,lastDate:s[0].data,avgPrice:avg3,lastPrice:s[0].precoPorUnidade,count:totalUnits,trend};
    }).sort((a,b)=>{if(a.lastDate&&!b.lastDate)return -1;if(!a.lastDate&&b.lastDate)return 1;if(a.lastDate&&b.lastDate)return b.lastDate.localeCompare(a.lastDate);return a.raro.localeCompare(b.raro);});
  },[trades,rarities]);

  const filtered=useMemo(()=>{const s=search.toLowerCase();return s?uRaros.filter(r=>r.raro.toLowerCase().includes(s)||r.categoria.toLowerCase().includes(s)):uRaros;},[uRaros,search]);

  const sortedURaros=useMemo(()=>{
    const r=[...filtered];
    const d=mSortDir==='desc'?-1:1;
    const sorts={
      raro:(a,b)=>d*a.raro.localeCompare(b.raro),
      categoria:(a,b)=>d*a.categoria.localeCompare(b.categoria),
      avgPrice:(a,b)=>d*(a.avgPrice-b.avgPrice),
      lastPrice:(a,b)=>d*(a.lastPrice-b.lastPrice),
      count:(a,b)=>d*(a.count-b.count),
      lastDate:(a,b)=>d*(a.lastDate||'').localeCompare(b.lastDate||''),
    };
    return r.sort(sorts[mSort]||sorts.lastDate);
  },[filtered,mSort,mSortDir]);

  function mColClick(col){if(mSort===col)setMSortDir(d=>d==='asc'?'desc':'asc');else{setMSort(col);setMSortDir('desc');}}
  const selInfo=useMemo(()=>selRaro?uRaros.find(r=>r.raro===selRaro):null,[uRaros,selRaro]);
  const selCatalog=useMemo(()=>selRaro?rarities.find(r=>r.raro===selRaro):null,[rarities,selRaro]);
  const quickCatalog=useMemo(()=>quickRaro?rarities.find(r=>r.raro===quickRaro):null,[rarities,quickRaro]);
  const quickInfo=useMemo(()=>quickRaro?uRaros.find(r=>r.raro===quickRaro):null,[uRaros,quickRaro]);
  const selTrades=useMemo(()=>selRaro?[...trades.filter(t=>t.raro===selRaro)].sort((a,b)=>b.data.localeCompare(a.data)):[],[trades,selRaro]);
  const chartData=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]={precos:[],units:0};const q=Math.max(1,t.quantidade||1);for(let i=0;i<q;i++)by[t.data].precos.push(t.precoPorUnidade);by[t.data].units+=q;});return Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,d])=>({date,preco:calcAvg(d.precos),units:d.units}));},[selTrades]);
  const dailyAvg=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]={precos:[],units:0};const q=Math.max(1,t.quantidade||1);for(let i=0;i<q;i++)by[t.data].precos.push(t.precoPorUnidade);by[t.data].units+=q;});
    // ordem cronológica (mais antigo primeiro) para calcular variação
    const asc=Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,d])=>({date,avg:calcAvg(d.precos),units:d.units}));
    asc.forEach((row,i)=>{row.change=i>0?row.avg-asc[i-1].avg:null;row.changePct=(i>0&&asc[i-1].avg>0)?Math.round((row.avg-asc[i-1].avg)/asc[i-1].avg*100):null;});
    return asc.reverse(); // mais recente primeiro para exibição
  },[selTrades]);

  const pStats=useMemo(()=>{
    const map={};
    portfolio.forEach(op=>{if(!map[op.raro])map[op.raro]={raro:op.raro,ops:[]};map[op.raro].ops.push(op);});
    return Object.values(map).map(item=>{
      // Ordena operações cronologicamente (data + id para empate)
      const ops=[...item.ops].sort((a,b)=>(a.data||'').localeCompare(b.data||'')||(a.id||0)-(b.id||0));
      // FIFO: fila de lotes comprados, vendas consomem do mais antigo
      const fifo=[]; // [{qty, ppu}, ...]
      let soldQty=0,revenue=0,costMatched=0;
      let totalComprado=0,totalInvestido=0;
      ops.forEach(op=>{
        const qty=Math.max(1,op.quantidade||1);
        const ppu=op.precoPorUnidade||0;
        if(op.tipo==='compra'){
          fifo.push({qty,ppu});
          totalComprado+=qty;
          totalInvestido+=op.precoTotal||0;
        }else{ // venda
          soldQty+=qty;
          revenue+=op.precoTotal||0;
          let rem=qty;
          while(rem>0&&fifo.length>0){
            const first=fifo[0];
            const take=Math.min(rem,first.qty);
            costMatched+=take*first.ppu;
            first.qty-=take;rem-=take;
            if(first.qty===0)fifo.shift();
          }
          // Se vendeu mais do que comprou, custo das extras = 0 (presente etc.)
        }
      });
      const estoque=fifo.reduce((s,l)=>s+l.qty,0);
      const custoEstoque=fifo.reduce((s,l)=>s+l.qty*l.ppu,0);
      const custoMedioEstoque=estoque>0?Math.round(custoEstoque/estoque):0;
      const mktPrice=uRaros.find(r=>r.raro===item.raro)?.avgPrice||0;
      const valorMercadoEstoque=estoque*mktPrice;
      // Valor de cada unidade do estoque: mercado se houver, senão o custo (fallback)
      const valorCarteiraItem=mktPrice>0?valorMercadoEstoque:custoEstoque;
      const lucroPotencial=mktPrice>0?valorMercadoEstoque-custoEstoque:0;
      const profitFIFO=revenue-costMatched;
      const ativo=totalComprado>0||soldQty>0;
      const status=!ativo?'vazio':(estoque>0?(soldQty>0?'misto':'andamento'):'completo');
      const categoria=rarities.find(r=>r.raro===item.raro)?.categoria||'Outros';
      return{
        raro:item.raro,categoria,
        comprados:totalComprado,vendidos:soldQty,estoque,
        investidoTotal:totalInvestido,investidoEstoque:custoEstoque,
        custoMedioEstoque,custoFIFOVendas:Math.round(costMatched),
        vendido:revenue,lucroRealizado:Math.round(profitFIFO),
        mktPrice,valorMercadoEstoque,valorCarteiraItem,lucroPotencial:Math.round(lucroPotencial),
        status,
        // compatibilidade com filtros antigos da tabela
        custo:custoMedioEstoque,investido:totalInvestido,lucro:Math.round(profitFIFO),mktValue:valorMercadoEstoque,
      };
    });
  },[portfolio,uRaros,rarities]);

  const filteredPStats=useMemo(()=>{
    let r=[...pStats];
    if(pStatusFilter==='vendidos')r=r.filter(i=>i.vendidos>0);
    else if(pStatusFilter==='estoque')r=r.filter(i=>i.estoque>0);
    if(pSearch)r=r.filter(i=>i.raro.toLowerCase().includes(pSearch.toLowerCase()));
    const numSort=(key)=>(a,b)=>pSortDir==='desc'?b[key]-a[key]:a[key]-b[key];
    const strSort=(a,b)=>pSortDir==='desc'?b.raro.localeCompare(a.raro):a.raro.localeCompare(b.raro);
    const sorts={raro:strSort,estoque:numSort('estoque'),investido:numSort('investido'),lucro:numSort('lucro'),comprados:numSort('comprados'),vendidos:numSort('vendidos'),vendido:numSort('vendido'),custo:numSort('custo'),mktValue:numSort('mktValue'),mktPrice:numSort('mktPrice'),custoFIFOVendas:numSort('custoFIFOVendas'),lucroRealizado:numSort('lucroRealizado'),lucroPotencial:numSort('lucroPotencial'),investidoEstoque:numSort('investidoEstoque'),valorMercadoEstoque:numSort('valorMercadoEstoque')};
    return r.sort(sorts[pSort]||strSort);
  },[pStats,pSearch,pSort,pSortDir,pStatusFilter]);

  // ── Totais agregados da aba Meu Painel ──
  const totals=useMemo(()=>{
    // Valor total da carteira: para cada raro em estoque, usa valor de mercado;
    // se não houver mercado, usa o custo médio do estoque como fallback
    const valorCarteira=pStats.reduce((s,i)=>s+i.valorCarteiraItem,0);
    // Total Investido: custo do que ainda está em carteira (estoque atual)
    const totalInvestido=pStats.reduce((s,i)=>s+i.investidoEstoque,0);
    // Receita Total: tudo que foi vendido
    const receitaTotal=pStats.reduce((s,i)=>s+i.vendido,0);
    // Quantidade total de raros em estoque + breakdown por categoria
    const qtdRaros=pStats.reduce((s,i)=>s+i.estoque,0);
    const porCategoria={};
    pStats.forEach(i=>{if(i.estoque>0){porCategoria[i.categoria]=(porCategoria[i.categoria]||0)+i.estoque;}});
    // Lucro realizado: receita - custo FIFO das vendas
    const lucroRealizado=pStats.reduce((s,i)=>s+i.lucroRealizado,0);
    // Lucro potencial: se vender todo o estoque pelo preço de mercado, considera só raros com preço
    const lucroPotencial=pStats.reduce((s,i)=>s+i.lucroPotencial,0);
    return{valorCarteira,totalInvestido,receitaTotal,qtdRaros,porCategoria,lucroRealizado,lucroPotencial};
  },[pStats]);

  const filteredOrders=useMemo(()=>orderFilter==='todos'?orders:orders.filter(o=>o.tipo===orderFilter),[orders,orderFilter]);

  // ── Insights / Analytics ──
  const insights=useMemo(()=>{
    const now=new Date();
    const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const start7=startToday-6*86400000;
    const start30=startToday-29*86400000;
    let hoje=0,semana=0,mes=0;
    const usersToday=new Set(),usersWeek=new Set();
    const porUsuario={},porHora=Array(24).fill(0),porDia={};
    accessLogs.forEach(l=>{
      const t=new Date(l.created_at).getTime();
      if(t>=startToday){hoje++;usersToday.add(l.username);}
      if(t>=start7){semana++;usersWeek.add(l.username);}
      if(t>=start30)mes++;
      if(!porUsuario[l.username])porUsuario[l.username]={username:l.username,total:0,ultimo:l.created_at};
      porUsuario[l.username].total++;
      if(l.created_at>porUsuario[l.username].ultimo)porUsuario[l.username].ultimo=l.created_at;
      porHora[new Date(l.created_at).getHours()]++;
      const dk=l.created_at.split('T')[0];
      porDia[dk]=(porDia[dk]||0)+1;
    });
    const ranking=Object.values(porUsuario).sort((a,b)=>b.total-a.total);
    const horaPico=porHora.indexOf(Math.max(...porHora));
    const dias14=[];
    for(let i=13;i>=0;i--){
      const d=new Date(startToday-i*86400000);
      const k=d.toISOString().split('T')[0];
      dias14.push({date:k,count:porDia[k]||0});
    }
    return{hoje,semana,mes,usersToday:usersToday.size,usersWeek:usersWeek.size,ranking,horaPico,porHora,dias14,totalLogins:accessLogs.length};
  },[accessLogs]);

  // Reset pages on filter change
  useEffect(()=>setMPage(0),[search,mSort,mSortDir]);
  useEffect(()=>setPPage(0),[pSearch,pSort,pSortDir]);

  // Paginated slices
  const mItems=useMemo(()=>sortedURaros.slice(mPage*PAGE,(mPage+1)*PAGE),[sortedURaros,mPage]);
  const pItems=useMemo(()=>filteredPStats.slice(pPage*10,(pPage+1)*10),[filteredPStats,pPage]);
  const modPItems=useMemo(()=>pendingTrades.slice(modPPage*PAGE,(modPPage+1)*PAGE),[pendingTrades,modPPage]);
  const modAItems=useMemo(()=>{const f=trades.filter(t=>!modSearch||t.raro.toLowerCase().includes(modSearch.toLowerCase())).sort((a,b)=>b.data.localeCompare(a.data));return f.slice(modAPage*PAGE,(modAPage+1)*PAGE);},[trades,modSearch,modAPage]);
  const modCItems=useMemo(()=>{const f=[...messages].filter(m=>!chatModSearch||m.username.toLowerCase().includes(chatModSearch.toLowerCase())).reverse();return f.slice(modCPage*10,(modCPage+1)*10);},[messages,chatModSearch,modCPage]);
  const modATotal=useMemo(()=>trades.filter(t=>!modSearch||t.raro.toLowerCase().includes(modSearch.toLowerCase())).length,[trades,modSearch]);
  const modCTotal=useMemo(()=>messages.filter(m=>!chatModSearch||m.username.toLowerCase().includes(chatModSearch.toLowerCase())).length,[messages,chatModSearch]);

  // ── Style primitives ───────────────────────────────────────────────
  const secHdr={fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:G,padding:'10px 16px',background:`linear-gradient(135deg,${BG3},${BG2})`,borderBottom:`1px solid #2a1800`,letterSpacing:'1px',display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:`4px solid ${G2}`};
  const card={background:BG2,border:`1px solid #2a1800`,borderLeft:`3px solid ${G2}`,boxShadow:`3px 3px 12px rgba(0,0,0,.6)`};
  const inp={background:'#080500',border:`1px solid #2a1800`,color:G,padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace",colorScheme:'dark'};
  const sel={background:'#080500',border:`1px solid #2a1800`,color:G,padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace"};
  const btnY={background:G,border:`2px solid ${G2}`,color:'#000',padding:'8px 18px',fontSize:'19px',fontFamily:"'VT323',monospace",cursor:'pointer',boxShadow:`3px 3px 0 #664400`,fontWeight:'bold',transition:'all .1s',letterSpacing:'1px'};
  const btnD={background:BG3,border:`1px solid ${G}`,color:G,padding:'8px 16px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  const btnG={background:'transparent',border:`1px solid #2a1800`,color:'#b89545',padding:'8px 14px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer'};
  const btnGreen={background:'#002200',border:'2px solid #4f4',color:'#4f4',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  const btnRed={background:'#220000',border:'2px solid #f44',color:'#f44',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  const th={background:`linear-gradient(135deg,#1a1000,#0f0800)`,color:G,padding:'9px 12px',textAlign:'left',borderBottom:`1px solid #2a1800`,fontFamily:"'Press Start 2P',monospace",fontSize:'8px',letterSpacing:'.5px',whiteSpace:'nowrap'};
  const td={padding:'8px 12px',borderBottom:`1px solid #160a00`,color:'#c8a870',whiteSpace:'nowrap'};
  const lbl={display:'block',color:'#c9a85f',fontSize:'14px',marginBottom:'5px'};

  // ── Loading ────────────────────────────────────────────────────────
  // ── Tutorial overlay steps ──────────────────────────────────────────
  const TUTORIAL_STEPS=[
    {icon:'🏆',title:'BEM-VINDO AO TURVA TRADER!',color:G,
      desc:'Este é o mercado de raros oficial do Turva.com.br! Aqui você acompanha preços, controla seus investimentos em raros e negocia com outros jogadores. Vamos te mostrar tudo em 3 passos rápidos.',
      dicas:['👉 Você pode rever este tutorial quando quiser pelo botão "? TUTORIAL" no topo']},
    {icon:'⚔',title:'1. ABA MERCADO',color:'#7bb8ff',
      desc:'É a página de cotações dos raros. Aqui você descobre quanto cada raro está valendo de verdade, com base nas negociações reais entre jogadores.',
      dicas:['💡 BENEFÍCIO: saiba o preço justo antes de comprar ou vender um raro','📊 A coluna MÉDIA mostra o valor médio das últimas 20 unidades vendidas','🔍 Clique em qualquer raro para ver o gráfico de evolução do preço e o histórico','ℹ O botão ℹ abre uma ficha rápida com preço de lançamento, pixels e data','⬆⬇ Clique nos títulos das colunas para ordenar (mais caro, mais negociado, etc.)','➕ Registrou uma troca? Use o botão REGISTRAR no topo direito']},
    {icon:'📊',title:'2. ABA MEU PAINEL',color:'#69db7c',
      desc:'É a sua carteira pessoal de raros. Registre tudo que você compra e vende para saber exatamente quanto lucrou e quanto seu acervo vale hoje.',
      dicas:['💡 BENEFÍCIO: descubra se você está tendo lucro ou prejuízo de verdade','💰 VALOR DE MERCADO mostra quanto seu estoque vale pelo preço atual','📈 MARGEM DE LUCRO mostra em % o quanto você ganhou sobre o investido','🛒 Use + OPERAÇÃO para registrar uma compra ou venda','📦 "Usar preço do catálogo" preenche o valor automaticamente','🎁 Ganhou um raro de presente? Registre com preço 0c']},
    {icon:'🤝',title:'3. ABA NEGOCIAÇÕES',color:'#e599f7',
      desc:'É o mural de compra e venda. Anuncie o que você quer comprar ou vender, e veja o que os outros jogadores estão procurando.',
      dicas:['💡 BENEFÍCIO: encontre compradores e vendedores sem ficar perguntando no hotel','📢 Publique uma ordem com + NOVA ORDEM (pode incluir vários raros de uma vez)','⏱ Cada ordem fica ativa por 72 horas e some sozinha depois','🛒 Filtre por COMPRO ou VENDO para achar rápido o que precisa','✎ Suas ordens podem ser editadas ou apagadas a qualquer momento','🎉 Pronto! Agora é só explorar o site. Bons negócios!']},
  ];

  function completeTutorial(){localStorage.setItem('tt-tutorial-done','1');setShowTutorialOverlay(false);setTutorialStep(0);}

  if(screen==='loading')return<div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'Press Start 2P',monospace",fontSize:'14px',color:G,textShadow:`2px 2px 0 #664400`}} className="blink">◈ TURVA TRADER ◈</span></div>;

  // ── Auth ───────────────────────────────────────────────────────────
  if(screen==='login'||screen==='register'){
    const isL=screen==='login';
    return(
      <div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',backgroundImage:`radial-gradient(ellipse at center,#1a1000 0%,${BG} 70%)`}}>
        <div style={{position:'fixed',inset:0,backgroundImage:`linear-gradient(${G}06 1px,transparent 1px),linear-gradient(90deg,${G}06 1px,transparent 1px)`,backgroundSize:'48px 48px',pointerEvents:'none'}}/>
        <div style={{textAlign:'center',marginBottom:'28px',position:'relative',zIndex:1}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'18px',color:G,textShadow:`3px 3px 0 #664400,0 0 30px ${G}44`,marginBottom:'8px'}}>◈ TURVA TRADER ◈</div>
          <div style={{color:'#7a6035',fontSize:'16px',letterSpacing:'3px'}}>◆ MERCADO DE RAROS DO TURVA ◆</div>
        </div>
        <div style={{...card,width:'380px',padding:'28px 32px',position:'relative',zIndex:1,border:`2px solid ${G}`,boxShadow:`6px 6px 0 #332200,0 0 30px ${G}11`}} className="anim">
          <Corners/>
          <div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:G,textAlign:'center',marginBottom:'22px'}}>{isL?'» ENTRAR «':'» CRIAR CONTA «'}</div>
          <Flash msg={msg}/>
          {isL?(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','••••••']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'14px'}}><label style={lbl}>{l}</label><input className="inp" style={inp} type={t} placeholder={ph} value={lF[k]} onChange={e=>setLF({...lF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
            ))}
            <button style={{...btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?0.6:1}} onClick={doLogin} disabled={loading}>{loading?'AGUARDE...':'ENTRAR →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#7a6035'}}>Sem conta? <span style={{color:G,cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('register');setMsg({text:'',type:'info'});}}>Criar agora</span></div>
          </>):(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','mín. 4 chars'],['CONFIRMAR','c','password','repita']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'13px'}}><label style={lbl}>{l}</label><input className="inp" style={inp} type={t} placeholder={ph} value={rF[k]} onChange={e=>setRF({...rF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doRegister()}/></div>
            ))}
            <button style={{...btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?0.6:1}} onClick={doRegister} disabled={loading}>{loading?'AGUARDE...':'CRIAR CONTA →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#7a6035'}}>Já tem conta? <span style={{color:G,cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('login');setMsg({text:'',type:'info'});}}>Entrar</span></div>
          </>)}
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────
  const tabs=[['mercado','⚔ MERCADO'],['painel','📊 MEU PAINEL'],['negocios','🤝 NEGOCIAÇÕES'],...(user?.is_admin?[['mod','🛡 MODERAÇÃO'],['insights','📈 INSIGHTS']]:[])] ;
  const TAB_DESC={
    mercado:{t:'Cotações dos raros',d:'Veja os preços médios, o histórico e registre novas negociações (vendas e trocas).'},
    painel:{t:'Sua carteira pessoal',d:'Controle suas compras e vendas e acompanhe lucro, estoque e valor de mercado.'},
    negocios:{t:'Mural de ofertas',d:'Publique o que quer comprar ou vender e veja as ofertas de outros jogadores.'},
    mod:{t:'Painel do moderador',d:'Aprove negociações pendentes, edite registros, modere o chat e gerencie usuários.'},
    insights:{t:'Estatísticas do site',d:'Acessos por dia, usuários mais ativos e horários de pico.'},
  };

  return(
    <div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',color:'#c8a870',fontSize:'18px'}}>
      {/* ── Header ── */}
      {isMobile?(
        /* MOBILE: logo + hambúrguer */
        <header style={{background:`linear-gradient(to bottom,#1a1000,#0d0800)`,borderBottom:`3px solid ${G}`,display:'flex',alignItems:'center',justifyContent:'space-between',height:'48px',position:'sticky',top:0,zIndex:100,boxShadow:`0 4px 20px rgba(0,0,0,.9)`,padding:'0 12px'}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'10px',color:G,textShadow:`1px 1px 0 #664400`,display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{fontSize:'15px'}}>🏆</span> TURVA TRADER
          </div>
          <button aria-label="Abrir menu" style={{background:'#1a1000',border:`1px solid ${G}`,color:G,width:'38px',height:'32px',cursor:'pointer',fontSize:'20px',display:'flex',alignItems:'center',justifyContent:'center',padding:0,position:'relative'}} onClick={()=>setMenuOpen(true)}>
            ☰
            {user?.is_admin&&pendingTrades.length>0&&<span style={{position:'absolute',top:'-6px',right:'-6px',background:'#f44',color:'#fff',padding:'0 5px',fontSize:'11px',fontFamily:"'VT323',monospace",borderRadius:'8px'}}>{pendingTrades.length}</span>}
          </button>
        </header>
      ):(
        /* DESKTOP: barra de abas completa */
        <header className="tab-bar" style={{background:`linear-gradient(to bottom,#1a1000,#0d0800)`,borderBottom:`3px solid ${G}`,display:'flex',alignItems:'stretch',height:'54px',position:'sticky',top:0,zIndex:100,boxShadow:`0 4px 20px rgba(0,0,0,.9)`}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'11px',color:G,textShadow:`2px 2px 0 #664400,0 0 20px ${G}44`,padding:'0 18px',display:'flex',alignItems:'center',borderRight:`2px solid #2a1800`,gap:'8px',flexShrink:0}}>
            <span style={{fontSize:'18px'}}>🏆</span> TURVA TRADER
          </div>
          {tabs.map(([id,label])=>(
            <button key={id} className={`tab-btn ${tab===id?'tab-a':'tab-i'}`}
              style={{position:'relative',padding:'0 16px',fontSize:'12px',fontFamily:"'Press Start 2P',monospace",cursor:'pointer',border:'none',borderRight:`1px solid #1a1000`,borderBottom:'3px solid transparent',transition:'all .15s',background:'transparent',color:'#9a7d45',letterSpacing:'.3px',...(id==='mod'&&pendingTrades.length>0?{color:'#ff6b6b'}:{})}}
              onClick={()=>setTab(id)} onMouseEnter={()=>setHoverTab(id)} onMouseLeave={()=>setHoverTab(null)}>
              {label}{id==='mod'&&pendingTrades.length>0&&<span style={{marginLeft:'6px',background:'#f44',color:'#fff',padding:'0 5px',fontSize:'12px',fontFamily:"'VT323',monospace"}}>{pendingTrades.length}</span>}
              {hoverTab===id&&TAB_DESC[id]&&(
                <div style={{position:'absolute',top:'calc(100% + 6px)',left:'8px',width:'240px',background:BG2,border:`1px solid ${G}`,boxShadow:'0 6px 24px rgba(0,0,0,.8)',padding:'10px 12px',textAlign:'left',zIndex:120,animation:'sd .15s ease',pointerEvents:'none'}}>
                  <div style={{color:G,fontSize:'15px',fontFamily:"'VT323',monospace",marginBottom:'3px',fontWeight:'bold'}}>{TAB_DESC[id].t}</div>
                  <div style={{color:'#c9a85f',fontSize:'14px',fontFamily:"'VT323',monospace",lineHeight:1.35}}>{TAB_DESC[id].d}</div>
                </div>
              )}
            </button>
          ))}
          <div style={{flex:1}}/>
          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px'}}>
            <span style={{color:'#9a7d45',fontSize:'16px'}}>◈ <span style={{color:G}}>{user?.username}</span></span>
            {tab==='mercado'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro||'',categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR</button>}
            {tab==='painel'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onClick={()=>setShowOM(true)}>+ OPERAÇÃO</button>}
            {tab==='negocios'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onClick={()=>{setEditingOrder(null);setOrderForm(eOrder);setShowOrderModal(true);}}>+ NOVA ORDEM</button>}
            <button style={{...btnD,fontSize:'15px',padding:'5px 12px',background:'#1a1000',border:`1px solid ${G}`,color:G}} onClick={()=>{setTutorialStep(0);setShowTutorialOverlay(true);}}>? TUTORIAL</button>
            <button style={{...btnG,fontSize:'15px',padding:'5px 10px',border:'1px solid #2a1800',color:'#cdac72'}} onClick={()=>{setAccForm({atual:'',nova:'',confirma:''});setShowAccount(true);}}>⚙ MINHA CONTA</button>
            <button style={{...btnG,fontSize:'16px',padding:'5px 10px'}} onClick={doLogout}>SAIR</button>
          </div>
        </header>
      )}

      {/* ── Drawer mobile (menu hambúrguer) ── */}
      {isMobile&&menuOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:250}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)'}} onClick={()=>setMenuOpen(false)}/>
          <div style={{position:'absolute',top:0,right:0,height:'100%',width:'250px',maxWidth:'80vw',background:BG2,borderLeft:`2px solid ${G}`,boxShadow:'-8px 0 30px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',overflow:'auto',animation:'sd .25s ease'}}>
            <div style={{padding:'14px',borderBottom:`1px solid #2a1800`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#cdac72',fontSize:'16px'}}>◈ <span style={{color:G}}>{user?.username}</span></span>
              <span style={{color:'#9a7d45',fontSize:'22px',cursor:'pointer',lineHeight:1}} onClick={()=>setMenuOpen(false)}>✕</span>
            </div>
            <div style={{padding:'8px 0',borderBottom:`1px solid #2a1800`}}>
              <div style={{color:'#9a7d45',fontSize:'12px',padding:'4px 14px',letterSpacing:'1px',fontFamily:"'Press Start 2P',monospace"}}>NAVEGAÇÃO</div>
              {tabs.map(([id,label])=>(
                <div key={id} onClick={()=>{setTab(id);setMenuOpen(false);}} style={{padding:'12px 14px',color:tab===id?G:'#cdac72',background:tab===id?'#1a1000':'transparent',borderLeft:`3px solid ${tab===id?G:'transparent'}`,cursor:'pointer'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'17px'}}>
                    <span>{label}</span>
                    {id==='mod'&&pendingTrades.length>0&&<span style={{background:'#f44',color:'#fff',padding:'0 6px',fontSize:'13px'}}>{pendingTrades.length}</span>}
                  </div>
                  {TAB_DESC[id]&&<div style={{color:'#9a7d45',fontSize:'13px',marginTop:'2px',lineHeight:1.25}}>{TAB_DESC[id].d}</div>}
                </div>
              ))}
            </div>
            <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'9px'}}>
              <div style={{color:'#9a7d45',fontSize:'12px',letterSpacing:'1px',fontFamily:"'Press Start 2P',monospace",marginBottom:'2px'}}>AÇÕES</div>
              {tab==='mercado'&&<button style={{...btnY,textAlign:'center',fontSize:'17px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro||'',categoria:selInfo?.categoria||'Raro Exclusivo'});setMenuOpen(false);}}>+ REGISTRAR</button>}
              {tab==='painel'&&<button style={{...btnY,textAlign:'center',fontSize:'17px'}} onClick={()=>{setShowOM(true);setMenuOpen(false);}}>+ OPERAÇÃO</button>}
              {tab==='negocios'&&<button style={{...btnY,textAlign:'center',fontSize:'17px'}} onClick={()=>{setEditingOrder(null);setOrderForm(eOrder);setShowOrderModal(true);setMenuOpen(false);}}>+ NOVA ORDEM</button>}
              <button style={{...btnD,textAlign:'center',fontSize:'16px',background:'#1a1000',border:`1px solid ${G}`,color:G}} onClick={()=>{setTutorialStep(0);setShowTutorialOverlay(true);setMenuOpen(false);}}>? TUTORIAL</button>
              <button style={{...btnG,textAlign:'center',fontSize:'16px',border:'1px solid #2a1800',color:'#cdac72'}} onClick={()=>{setAccForm({atual:'',nova:'',confirma:''});setShowAccount(true);setMenuOpen(false);}}>⚙ MINHA CONTA</button>
              <button style={{...btnG,textAlign:'center',fontSize:'16px'}} onClick={()=>{setMenuOpen(false);doLogout();}}>SAIR</button>
            </div>
          </div>
        </div>
      )}
      <Flash msg={msg}/>

      {/* ══ TUTORIAL OVERLAY ══ */}
      {showTutorialOverlay&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:500,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'12px',overflow:'auto'}}>
          {/* Progress dots */}
          <div style={{display:'flex',gap:'7px',marginBottom:'14px'}}>
            {TUTORIAL_STEPS.map((_,i)=>(
              <div key={i} style={{width:i===tutorialStep?22:7,height:7,background:i===tutorialStep?G:'#2a1800',transition:'all .3s',cursor:'pointer'}} onClick={()=>setTutorialStep(i)}/>
            ))}
          </div>
          {/* Card */}
          <div style={{background:BG2,border:`2px solid ${TUTORIAL_STEPS[tutorialStep].color}`,boxShadow:`0 0 50px ${TUTORIAL_STEPS[tutorialStep].color}22`,padding:'20px 24px',maxWidth:'500px',width:'100%',position:'relative',animation:'sd .25s ease'}}>
            <div style={{textAlign:'center',marginBottom:'14px'}}>
              <div style={{fontSize:'32px',marginBottom:'6px'}}>{TUTORIAL_STEPS[tutorialStep].icon}</div>
              <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'11px',color:TUTORIAL_STEPS[tutorialStep].color,marginBottom:'10px',letterSpacing:'1px'}}>{TUTORIAL_STEPS[tutorialStep].title}</div>
              <div style={{color:'#d8b888',fontSize:'16px',lineHeight:1.45}}>{TUTORIAL_STEPS[tutorialStep].desc}</div>
            </div>
            {TUTORIAL_STEPS[tutorialStep].dicas.length>0&&(
              <div style={{background:'#080500',border:'1px solid #1a1000',padding:'12px 14px',marginBottom:'14px'}}>
                {TUTORIAL_STEPS[tutorialStep].dicas.map((d,i)=>(
                  <div key={i} style={{color:'#cdac72',fontSize:'15px',marginBottom:'6px',lineHeight:1.35}}>{d}</div>
                ))}
              </div>
            )}
            {/* Buttons */}
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              {tutorialStep>0&&<button style={{background:BG3,border:`1px solid #2a1800`,color:'#b89545',padding:'9px 14px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer'}} onClick={()=>setTutorialStep(s=>s-1)}>◀ anterior</button>}
              {tutorialStep<TUTORIAL_STEPS.length-1
                ?<button style={{background:TUTORIAL_STEPS[tutorialStep].color,border:'none',color:'#000',padding:'10px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer',flex:1,fontWeight:'bold',letterSpacing:'1px'}} onClick={()=>setTutorialStep(s=>s+1)}>PRÓXIMO ▶</button>
                :<button style={{background:G,border:'none',color:'#000',padding:'10px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer',flex:1,fontWeight:'bold',letterSpacing:'1px'}} onClick={completeTutorial}>✓ COMEÇAR A USAR!</button>
              }
            </div>
            <div style={{textAlign:'center',marginTop:'10px'}}>
              <span style={{color:'#9a7d45',fontSize:'14px',cursor:'pointer',textDecoration:'underline'}} onClick={completeTutorial}>pular tutorial</span>
            </div>
          </div>
          <div style={{color:'#9a7d45',fontSize:'14px',marginTop:'10px',fontFamily:"'VT323',monospace"}}>{tutorialStep+1} de {TUTORIAL_STEPS.length}</div>
        </div>
      )}

      {/* ══ MERCADO ══ */}
      {tab==='mercado'&&(
        <div style={{display:'flex',flexDirection:'column',height:isMobile?'auto':'calc(100vh - 90px)',overflow:isMobile?'visible':'hidden',minHeight:isMobile?'100vh':'auto'}}>
          <div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px solid #2a1800',borderLeft:`4px solid ${G}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:'14px',flexShrink:0}}>
            <span style={{fontSize:'20px'}}>⚔</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>MERCADO DE RAROS</div><div style={{color:'#c9a85f',fontSize:'15px'}}>Veja negociações e preços médios dos raros do Turva. Clique em um raro para ver histórico, gráfico de preços e dados do catálogo. Use ℹ para visão rápida.</div></div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:'18px',background:'#090600'}}>
            {!selRaro?(
              <div>
                <div style={{...secHdr,gap:'12px',flexWrap:'wrap'}}>
                  <span>◆ {sortedURaros.length} RAROS{!isMobile&&' — clique nas colunas para ordenar'}</span>
                  <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                    {isMobile&&(
                      <select className="inp" style={{...inp,padding:'4px 8px',fontSize:'15px'}} value={mSort+'|'+mSortDir} onChange={e=>{const[s,d]=e.target.value.split('|');setMSort(s);setMSortDir(d);}}>
                        <option value="lastDate|desc">Mais recentes</option>
                        <option value="avgPrice|desc">Maior preço médio</option>
                        <option value="avgPrice|asc">Menor preço médio</option>
                        <option value="count|desc">Mais negociados</option>
                        <option value="raro|asc">Nome (A-Z)</option>
                      </select>
                    )}
                    <input className="inp" style={{...inp,width:isMobile?'140px':'180px',padding:'4px 10px',fontSize:'16px'}} placeholder="🔍 buscar raro..." value={search} onChange={e=>setSearch(e.target.value)}/>
                    {(mSort!=='lastDate'||mSortDir!=='desc'||search)&&(
                      <button style={{...btnG,fontSize:'15px',padding:'4px 10px',color:'#cdac72',borderColor:'#664400'}} onClick={()=>{setMSort('lastDate');setMSortDir('desc');setSearch('');}}>✕ limpar</button>
                    )}
                  </div>
                </div>
                {isMobile?(
                  /* MOBILE: cards verticais com todas as infos */
                  <div>
                    {mItems.map((item)=>{
                      const cat=rarities.find(r=>r.raro===item.raro);
                      return(
                        <div key={item.raro} style={{background:BG2,border:'1px solid #2a1800',borderLeft:`3px solid ${G}`,padding:'10px',marginBottom:'9px'}} onClick={()=>setSelRaro(item.raro)}>
                          <div style={{display:'flex',alignItems:'center',gap:'9px',marginBottom:'9px'}}>
                            <Img url={cat?.imagem_url} alt={item.raro} size={42}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:G,fontSize:'17px',fontWeight:'bold',marginBottom:'4px'}}>{item.raro}</div>
                              <Badge cat={item.categoria}/>
                            </div>
                            <button style={{...btnD,padding:'4px 10px',fontSize:'16px',flexShrink:0}} onClick={e=>{e.stopPropagation();setQuickRaro(item.raro);}}>ℹ</button>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',borderTop:'1px solid #1a1000',paddingTop:'9px'}}>
                            <div><div style={{color:'#9a7d45',fontSize:'12px'}}>MÉDIA 20 UN</div><div style={{color:item.count?G:'#3a2a10',fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{item.count?`${item.avgPrice}c`:'—'} {item.count&&item.trend!==0?<span style={{color:item.trend>0?'#69db7c':'#f66',fontSize:'11px'}}>{item.trend>0?'▲':'▼'}</span>:''}</div></div>
                            <div><div style={{color:'#9a7d45',fontSize:'12px'}}>ÚLTIMO</div><div style={{color:'#cdac72',fontSize:'17px'}}>{item.count?`${item.lastPrice}c`:'—'}</div></div>
                            <div><div style={{color:'#9a7d45',fontSize:'12px'}}>UNID. VENDIDAS</div><div style={{color:'#b89545',fontSize:'17px'}}>{item.count}</div></div>
                            <div><div style={{color:'#9a7d45',fontSize:'12px'}}>ÚLTIMA NEG.</div><div style={{color:'#cdac72',fontSize:'17px'}}>{item.lastDate?fmtDate(item.lastDate):'—'}</div></div>
                          </div>
                        </div>
                      );
                    })}
                    {!sortedURaros.length&&<div style={{textAlign:'center',color:'#2a1800',padding:'56px'}}>{search?'Nenhum raro encontrado.':'Nenhum raro cadastrado.'}</div>}
                    <Paginator page={mPage} setPage={setMPage} total={sortedURaros.length} isMobile={isMobile}/>
                  </div>
                ):(
                  /* DESKTOP: tabela */
                  <div style={{...card,overflowX:'auto',padding:0}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>
                      <th style={th}></th>
                      {[['RARO','raro'],['CATEGORIA','categoria'],['MÉDIA ÚLT. 3','avgPrice'],['ÚLTIMO','lastPrice'],['UNID.','count'],['ÚLTIMA NEG.','lastDate']].map(([label,col])=>(
                        <th key={col} style={{...th,cursor:'pointer',userSelect:'none'}} onClick={()=>mColClick(col)}>
                          {label}{mSort===col?<span style={{marginLeft:'4px',color:G}}>{mSortDir==='desc'?'▼':'▲'}</span>:<span style={{marginLeft:'4px',color:'#7a6035',fontSize:'9px'}}>⇅</span>}
                        </th>
                      ))}
                      <th style={th}></th>
                    </tr></thead>
                    <tbody>
                      {mItems.map((item,i)=>{
                        const cat=rarities.find(r=>r.raro===item.raro);
                        return(
                          <tr key={item.raro} className="rrow" style={{background:i%2===0?'#0d0800':'#0a0600',cursor:'pointer'}}>
                            <td style={{...td,width:'44px',padding:'4px 8px'}} onClick={()=>setSelRaro(item.raro)}><Img url={cat?.imagem_url} alt={item.raro} size={34}/></td>
                            <td style={{...td,color:G,fontWeight:'bold'}} onClick={()=>setSelRaro(item.raro)}>{item.raro}</td>
                            <td style={td} onClick={()=>setSelRaro(item.raro)}><Badge cat={item.categoria}/></td>
                            <td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'13px',color:item.count?G:'#3a2a10'}} onClick={()=>setSelRaro(item.raro)}>{item.count?`${item.avgPrice}c`:'—'}</td>
                            <td style={{...td,color:'#cdac72'}} onClick={()=>setSelRaro(item.raro)}>{item.count?`${item.lastPrice}c`:'—'}</td>
                            <td style={{...td,color:'#b89545'}} onClick={()=>setSelRaro(item.raro)}>{item.count}</td>
                            <td style={{...td,color:'#9a7d45'}} onClick={()=>setSelRaro(item.raro)}>{item.lastDate?fmtDate(item.lastDate):'—'}</td>
                            <td style={td}><button style={{...btnD,padding:'4px 10px',fontSize:'16px'}} onClick={e=>{e.stopPropagation();setQuickRaro(item.raro);}}>ℹ</button></td>
                          </tr>
                        );
                      })}
                      {!sortedURaros.length&&<tr><td colSpan={8} style={{...td,textAlign:'center',color:'#2a1800',padding:'56px'}}>{search?'Nenhum raro encontrado.':'Nenhum raro cadastrado.'}</td></tr>}
                    </tbody>
                  </table>
                  <Paginator page={mPage} setPage={setMPage} total={sortedURaros.length} isMobile={isMobile}/>
                  </div>
                )}
              </div>
            ):(
              <div className="anim">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
                  <div>
                    <button style={{...btnG,fontSize:'15px',padding:'4px 10px',marginBottom:'8px'}} onClick={()=>setSelRaro(null)}>← voltar</button>
                    <div style={{fontFamily:"'Press Start 2P'",fontSize:'14px',color:G,marginBottom:'8px',textShadow:`2px 2px 0 #443300`}}>{selRaro}</div>
                    <Badge cat={selInfo?.categoria||''}/>
                  </div>
                  <button style={{...btnY,padding:'7px 14px',fontSize:'17px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro,categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR NEG.</button>
                </div>

                {selCatalog&&(
                  <div style={{...card,padding:'14px 18px',marginBottom:'16px',display:'flex',gap:'20px',flexWrap:'wrap',alignItems:'center'}}>
                    {selCatalog.imagem_url&&<Img url={selCatalog.imagem_url} alt={selRaro} size={90}/>}
                    <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#9a7d45',letterSpacing:'1px'}}>CATÁLOGO</div>
                      {selCatalog.preco_catalogo>=0&&<div><div style={{fontSize:'13px',color:'#b89545',marginBottom:'2px'}}>PREÇO DE LANÇAMENTO</div><div style={{color:'#e599f7',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.preco_catalogo}c</div></div>}
                      {selCatalog.pixels>=0&&selCatalog.pixels!==null&&<div><div style={{fontSize:'13px',color:'#b89545',marginBottom:'2px'}}>PIXELS</div><div style={{color:'#63e6be',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.pixels}px</div></div>}
                      {selCatalog.data_lancamento&&['Raro Exclusivo','Raro Rotativo','Raro Colecionável'].includes(selCatalog.categoria)&&<div><div style={{fontSize:'13px',color:'#b89545',marginBottom:'2px'}}>LANÇAMENTO</div><div style={{color:G,fontSize:'18px'}}>{fmtDate(selCatalog.data_lancamento)}</div></div>}
                    </div>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'16px'}}>
                  {[{l:'MÉDIA ÚLT. 3 NEG.',v:`${selInfo?.avgPrice||0}c`,hi:true},{l:'ÚLTIMO PREÇO',v:`${selInfo?.lastPrice||0}c`},{l:'UNID. VENDIDAS',v:String(selInfo?.count||0)},{l:'ÚLTIMA NEG.',v:fmtDate(selInfo?.lastDate)}].map(s=>(
                    <div key={s.l} style={{...card,padding:'12px',textAlign:'center',border:s.hi?`2px solid ${G}`:'1px solid #2a1800',boxShadow:s.hi?`3px 3px 0 #443300`:'3px 3px 12px rgba(0,0,0,.6)'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#9a7d45',marginBottom:'8px'}}>{s.l}</div>
                      <div style={{color:s.hi?G:'#aa8855',fontSize:'20px'}}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {chartData.length>1&&(
                  <div style={{...card,marginBottom:'16px',padding:0}}>
                    <div style={secHdr}>◆ EVOLUÇÃO DO PREÇO</div>
                    <div style={{padding:'16px 10px 10px 0',background:'#080500'}}>
                      <ResponsiveContainer width="100%" height={190}>
                        <LineChart data={chartData} margin={{top:5,right:20,left:10,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1000" vertical={false}/>
                          <XAxis dataKey="date" tickFormatter={v=>fmtDate(v)} tick={{fill:'#9a7d45',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#2a1800'}} tickLine={false}/>
                          <YAxis tick={{fill:'#9a7d45',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#2a1800'}} tickLine={false} width={55}/>
                          <Tooltip content={<ChartTip/>}/>
                          <Line type="monotone" dataKey="preco" stroke={G} strokeWidth={2.5} dot={{fill:G,r:4,strokeWidth:0}} activeDot={{r:6,fill:'#fff',stroke:G,strokeWidth:2}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div style={{...card,padding:0,marginBottom:'70px'}}>
                  <div style={{...secHdr,gap:'12px'}}>
                    <span>◆ {histView==='dia'?'MÉDIA POR DIA':'HISTÓRICO COMPLETO'}</span>
                    <button style={{...btnD,fontSize:'16px',padding:'5px 14px'}} onClick={()=>setHistView(v=>v==='dia'?'completo':'dia')}>
                      {histView==='dia'?'Ver negociações completas →':'Ver média por dia →'}
                    </button>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    {histView==='dia'?(
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                        <thead><tr>{['DATA','UNID. VENDIDAS','MÉDIA/UN','VARIAÇÃO'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {!dailyAvg.length&&<tr><td colSpan={3} style={{...td,textAlign:'center',color:'#2a1800',padding:'32px'}}>Sem negociações.</td></tr>}
                          {dailyAvg.map((row,i)=>(
                            <tr key={row.date} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                              <td style={{...td,color:'#bd9a5a'}}>{fmtDate(row.date)}</td>
                              <td style={{...td,color:'#b89545'}}>{row.units} un.</td>
                              <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{row.avg}c</td>
                              <td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'11px',color:row.change===null?'#3a2a10':row.change>0?'#69db7c':row.change<0?'#f66':'#aa8855'}}>
                                {row.change===null?'—':`${row.change>0?'▲ +':row.change<0?'▼ ':''}${row.change}c`}{row.changePct!==null&&row.change!==0?<span style={{fontSize:'10px',color:'#c9a85f'}}> ({row.changePct>0?'+':''}{row.changePct}%)</span>:''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ):(
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                        <thead><tr>{['DATA','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO POR'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {!selTrades.length&&<tr><td colSpan={7} style={{...td,textAlign:'center',color:'#2a1800',padding:'32px'}}>Sem negociações.</td></tr>}
                          {selTrades.map((t,i)=>(
                            <tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                              <td style={{...td,color:'#b08f4f'}}>{t.trocaInfo&&<span title={t.trocaInfo} style={{marginRight:'5px'}}>🔄</span>}{fmtDate(t.data)}</td>
                              <td style={{...td,color:'#bd9a5a'}}>{t.quantidade}</td>
                              <td style={{...td,color:'#cdac72'}}>{t.precoVenda}c</td>
                              <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                              <td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
                              <td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
                              <td style={{...td,color:'#9a7d45',fontSize:'15px'}}>{t.trocaInfo?<span title={t.trocaInfo} style={{color:'#c98fff'}}>🔄 troca</span>:(t.lancadoPor||'—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MEU PAINEL ══ */}
      {tab==='painel'&&(
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px solid #2a1800',borderLeft:`4px solid ${G}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:'14px',flexShrink:0}}>
            <span style={{fontSize:'20px'}}>📊</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>MEU PAINEL</div><div style={{color:'#c9a85f',fontSize:'15px'}}>Registre compras e vendas e saiba seu patrimônio em raros. Acompanhe lucro/prejuízo, capital parado e taxa de acerto — um gerenciador de carteira completo!</div></div>
          </div>
          <div style={{overflow:'auto',flex:1,padding:'18px',paddingBottom:'100px',background:'#090600'}}>

          {/* 6 CARDS PRINCIPAIS COM LEGENDAS */}
          <div className="stat-grid" style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fit,minmax(220px,1fr))',gap:'10px',marginBottom:'16px'}}>
            {[
              {l:'VALOR TOTAL DA CARTEIRA',v:totals.valorCarteira?`${totals.valorCarteira}c`:'—',sub:'Soma do valor de mercado dos seus raros (ou custo, se ainda não houver mercado)',color:G},
              {l:'TOTAL INVESTIDO',v:totals.totalInvestido?`${totals.totalInvestido}c`:'—',sub:'Quanto você gastou nos raros que ainda tem em estoque',color:'#7bb8ff'},
              {l:'RECEITA TOTAL',v:totals.receitaTotal?`${totals.receitaTotal}c`:'—',sub:'Total recebido em todas as suas vendas',color:'#ffa94d'},
              {l:'QUANTIDADE DE RAROS',v:String(totals.qtdRaros),sub:totals.qtdRaros?Object.entries(totals.porCategoria).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([c,n])=>`${n} ${c.split(' ')[0].toLowerCase()}`).join(' · ')+(Object.keys(totals.porCategoria).length>4?'…':''):'Itens em estoque, por categoria',color:'#c98fff'},
              {l:'LUCRO REALIZADO TOTAL',v:totals.receitaTotal?`${totals.lucroRealizado>=0?'+':''}${totals.lucroRealizado}c`:'—',sub:'Lucro/prejuízo das vendas que você já fez (FIFO: custo do raro comprado primeiro)',color:totals.lucroRealizado>=0?'#69db7c':'#f66'},
              {l:'LUCRO POTENCIAL',v:totals.totalInvestido?`${totals.lucroPotencial>=0?'+':''}${totals.lucroPotencial}c`:'—',sub:'Lucro se você vendesse todo o seu estoque pelo preço médio de mercado agora',color:totals.lucroPotencial>=0?'#63e6be':'#ff8855'},
            ].map(s=>(
              <div key={s.l} style={{...card,padding:'13px 16px',border:`1px solid ${s.color}33`,boxShadow:`3px 3px 0 ${s.color}11`}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#9a7d45',marginBottom:'7px',letterSpacing:'1px'}}>{s.l}</div>
                <div style={{color:s.color,fontSize:'23px',marginBottom:'4px',fontWeight:'bold'}}>{s.v}</div>
                <div style={{color:'#9a7d45',fontSize:'13px',lineHeight:1.3}}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{...card,padding:0}}>
            <div style={secHdr}>
              <span>◆ RESUMO POR RARO — {filteredPStats.length} itens</span>
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                <div style={{display:'flex',gap:'4px'}}>
                  {[['todos','Todos'],['vendidos','🤝 Vendidos'],['estoque','📦 Estoque']].map(([v,l])=>(
                    <button key={v} style={{padding:'4px 10px',fontSize:'14px',background:pStatusFilter===v?G:BG3,color:pStatusFilter===v?'#000':G,border:`1px solid ${pStatusFilter===v?G2:'#2a1800'}`,cursor:'pointer',fontFamily:"'VT323',monospace"}} onClick={()=>setPStatusFilter(v)}>{l}</button>
                  ))}
                </div>
                <input className="inp" style={{...inp,width:'130px',padding:'4px 10px',fontSize:'16px'}} placeholder="buscar..." value={pSearch} onChange={e=>setPSearch(e.target.value)}/>
                {(pSort!=='raro'||pSortDir!=='asc'||pSearch||pStatusFilter!=='todos')&&(
                  <button style={{...btnG,fontSize:'15px',padding:'4px 10px',color:'#cdac72',borderColor:'#664400'}} onClick={()=>{setPSort('raro');setPSortDir('asc');setPSearch('');setPStatusFilter('todos');}}>✕ limpar</button>
                )}
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              {(()=>{
                // Colunas por filtro
                const COLUMNS={
                  todos:[
                    {l:'',w:'44px',img:true},
                    {l:'RARO',k:'raro',raro:true},
                    {l:'COMPRADOS',k:'comprados',c:'#7bb8ff',v:i=>i.comprados},
                    {l:'VENDIDOS',k:'vendidos',c:'#7dffaa',v:i=>i.vendidos},
                    {l:'ESTOQUE',k:'estoque',v:i=>i.estoque,style:i=>({color:i.estoque>0?G:'#4a3010'})},
                    {l:'CUSTO MÉD',k:'custo',c:'#cdac72',v:i=>i.estoque>0?`${i.custoMedioEstoque}c`:'—'},
                    {l:'INVESTIDO',k:'investidoEstoque',c:'#7bb8ff',v:i=>`${i.investidoEstoque}c`},
                    {l:'P. MERC.',k:'mktPrice',v:i=>i.mktPrice>0?`${i.mktPrice}c`:'—',style:i=>({color:i.mktPrice>0?'#ffa94d':'#3a2a10',fontFamily:"'Press Start 2P'",fontSize:'12px'})},
                    {l:'VENDIDO',k:'vendido',c:'#7dffaa',v:i=>i.vendido?`${i.vendido}c`:'—'},
                    {l:'LUCRO REAL.',k:'lucroRealizado',v:i=>i.vendidos>0?`${i.lucroRealizado>=0?'+':''}${i.lucroRealizado}c`:'—',style:i=>({fontFamily:"'Press Start 2P'",fontSize:'11px',color:i.vendidos===0?'#3a2a10':(i.lucroRealizado>=0?'#69db7c':'#f66')})},
                  ],
                  vendidos:[
                    {l:'',w:'44px',img:true},
                    {l:'RARO',k:'raro',raro:true},
                    {l:'QTD VENDIDA',k:'vendidos',c:'#7dffaa',v:i=>i.vendidos},
                    {l:'CUSTO (FIFO)',k:'custoFIFOVendas',c:'#cdac72',v:i=>`${i.custoFIFOVendas}c`},
                    {l:'RECEITA',k:'vendido',c:'#ffa94d',v:i=>`${i.vendido}c`},
                    {l:'LUCRO REALIZADO',k:'lucroRealizado',v:i=>`${i.lucroRealizado>=0?'+':''}${i.lucroRealizado}c`,style:i=>({fontFamily:"'Press Start 2P'",fontSize:'12px',color:i.lucroRealizado>=0?'#69db7c':'#f66'})},
                  ],
                  estoque:[
                    {l:'',w:'44px',img:true},
                    {l:'RARO',k:'raro',raro:true},
                    {l:'QTD ESTOQUE',k:'estoque',v:i=>i.estoque,style:()=>({color:G,fontWeight:'bold'})},
                    {l:'CUSTO TOTAL',k:'investidoEstoque',c:'#7bb8ff',v:i=>`${i.investidoEstoque}c`},
                    {l:'CUSTO MÉD',k:'custo',c:'#cdac72',v:i=>`${i.custoMedioEstoque}c`},
                    {l:'P. MERC.',k:'mktPrice',v:i=>i.mktPrice>0?`${i.mktPrice}c`:'—',style:i=>({color:i.mktPrice>0?'#ffa94d':'#3a2a10',fontFamily:"'Press Start 2P'",fontSize:'12px'})},
                    {l:'VALOR MERC.',k:'valorMercadoEstoque',v:i=>i.mktPrice>0?`${i.valorMercadoEstoque}c`:'—',style:i=>({color:i.mktPrice>0?'#ffa94d':'#3a2a10',fontWeight:i.mktPrice>0?'bold':'normal'})},
                    {l:'LUCRO POT.',k:'lucroPotencial',v:i=>i.mktPrice>0?`${i.lucroPotencial>=0?'+':''}${i.lucroPotencial}c`:'—',style:i=>({fontFamily:"'Press Start 2P'",fontSize:'11px',color:!i.mktPrice?'#3a2a10':(i.lucroPotencial>=0?'#69db7c':'#f66')})},
                  ],
                };
                const cols=COLUMNS[pStatusFilter]||COLUMNS.todos;
                const totalCols=cols.length+1;
                return(
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>
                      {cols.map((c,idx)=>(
                        <th key={idx} style={{...th,...(c.k?{cursor:'pointer',userSelect:'none'}:{}),...(c.w?{width:c.w}:{})}}
                          onClick={()=>{if(!c.k)return;if(pSort===c.k)setPSortDir(d=>d==='asc'?'desc':'asc');else{setPSort(c.k);setPSortDir(c.k==='raro'?'asc':'desc');}}}>
                          {c.l}{c.k&&pSort===c.k?<span style={{marginLeft:'4px',color:G}}>{pSortDir==='desc'?'▼':'▲'}</span>:c.k?<span style={{marginLeft:'4px',color:'#7a6035',fontSize:'9px'}}>⇅</span>:null}
                        </th>
                      ))}
                      <th style={th}></th>
                    </tr></thead>
                    <tbody>
                      {!filteredPStats.length&&<tr><td colSpan={totalCols} style={{...td,textAlign:'center',color:'#2a1800',padding:'32px',fontSize:'16px'}}>{pStatusFilter==='vendidos'?'Nenhuma venda registrada.':pStatusFilter==='estoque'?'Nenhum raro em estoque.':'Use + OPERAÇÃO para registrar.'}</td></tr>}
                      {pItems.map((item,i)=>{
                        const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;
                        return(
                        <tr key={item.raro} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                          {cols.map((c,idx)=>{
                            if(c.img)return <td key={idx} style={{...td,width:'44px',padding:'4px 8px'}}><Img url={img} alt={item.raro} size={34}/></td>;
                            if(c.raro)return <td key={idx} style={{...td,color:G,fontWeight:'bold'}}><div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}><span>{item.raro}</span><Badge cat={item.categoria}/></div></td>;
                            const baseStyle=c.c?{color:c.c}:{};
                            const dynStyle=c.style?c.style(item):{};
                            return <td key={idx} style={{...td,...baseStyle,...dynStyle}}>{c.v(item)}</td>;
                          })}
                          <td style={{...td,whiteSpace:'nowrap'}}>
                            <div style={{display:'flex',gap:'5px'}}>
                              <button style={btnD} onMouseEnter={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background=BG3;e.currentTarget.style.color=G;}} onClick={()=>openPEdit(item)}>✎</button>
                              <button style={{...btnRed,padding:'4px 8px'}} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>deletePortfolioRaro(item.raro)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                );
              })()}
              <Paginator page={pPage} setPage={setPPage} total={filteredPStats.length} size={10} isMobile={isMobile}/>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ══ NEGOCIAÇÕES ══ */}
      {tab==='negocios'&&(
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px solid #2a1800',borderLeft:`4px solid ${G}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:'14px',flexShrink:0}}>
            <span style={{fontSize:'20px'}}>🤝</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>NEGOCIAÇÕES</div><div style={{color:'#c9a85f',fontSize:'15px'}}>Veja quem compra ou vende raros agora. Publique ordens com múltiplos itens — ativas por 72h e removidas automaticamente. Conecte-se com os traders do Turva!</div></div>
          </div>
          <div style={{overflow:'auto',flex:1,padding:'18px',background:'#090600'}}>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',alignItems:'center'}}>
            <span style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#9a7d45',marginRight:'4px'}}>FILTRO:</span>
            {[['todos','TODOS'],['compra','COMPRO'],['venda','VENDO']].map(([v,l])=>(
              <button key={v} style={{...btnG,fontSize:'17px',padding:'6px 14px',...(orderFilter===v?{background:BG3,border:`1px solid ${G}`,color:G}:{})}} onClick={()=>setOrderFilter(v)}>{l}</button>
            ))}
            <span style={{color:'#7a6035',fontSize:'16px',marginLeft:'8px'}}>{filteredOrders.length} ordens ativas</span>
          </div>
          {!filteredOrders.length&&<div style={{...card,padding:'48px',textAlign:'center',color:'#2a1800',fontSize:'18px'}}>Nenhuma ordem ativa. Clique em <span style={{color:G}}>+ NOVA ORDEM</span>!</div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'14px'}}>
            {filteredOrders.map(order=>{
              const isOwn=order.username===user?.username,canEdit=isOwn||user?.is_admin;
              const isBuy=order.tipo==='compra';
              return(
                <div key={order.id} style={{...card,padding:'16px',border:`1px solid ${isBuy?'#1a3300':'#330000'}`,borderLeft:`4px solid ${isBuy?'#69db7c':'#f66'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <div>
                      <span style={{background:isBuy?'#69db7c22':'#f6622',border:`1px solid ${isBuy?'#69db7c44':'#f6644'}`,color:isBuy?'#69db7c':'#f66',padding:'3px 10px',fontFamily:"'Press Start 2P',monospace",fontSize:'10px'}}>
                        {isBuy?'🛒 COMPRO':'💰 VENDO'}
                      </span>
                      <div style={{color:'#b89545',fontSize:'15px',marginTop:'6px'}}>por <span style={{color:G}}>{order.username}</span></div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:new Date(order.expires_at)<new Date()?'#f44':'#69db7c'}}>{timeLeft(order.expires_at)}</div>
                      {canEdit&&<div style={{display:'flex',gap:'4px',marginTop:'6px',justifyContent:'flex-end'}}>
                        <button style={{...btnD,padding:'3px 8px',fontSize:'16px'}} onClick={()=>openEditOrder(order)}>✎</button>
                        <button style={{...btnRed,padding:'3px 8px',fontSize:'16px'}} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>deleteOrder(order.id)}>✕</button>
                      </div>}
                    </div>
                  </div>
                  <div style={{borderTop:`1px solid #1a1000`,paddingTop:'10px'}}>
                    {order.items.map((it,i)=>{
                      const img=rarities.find(r=>r.raro===it.raro)?.imagem_url;
                      return(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:`1px solid #110800`}}>
                          <Img url={img} alt={it.raro} size={30}/>
                          <div style={{flex:1}}>
                            <div style={{color:'#c8a870',fontSize:'17px'}}>{it.raro}</div>
                            <div style={{color:'#9a7d45',fontSize:'15px'}}>Qtd: {it.quantidade}</div>
                          </div>
                          <div style={{fontFamily:"'Press Start 2P'",fontSize:'12px',color:G,flexShrink:0}}>{it.preco}c</div>
                        </div>
                      );
                    })}
                  </div>
                  {order.observacao&&<div style={{marginTop:'10px',color:'#b89545',fontSize:'16px',fontStyle:'italic'}}>"{order.observacao}"</div>}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* ══ MODERAÇÃO ══ */}
      {tab==='mod'&&user?.is_admin&&(
        <div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px',background:'#090600'}}>
          {pendingTrades.length===0
            ?<div style={{...card,padding:'20px',textAlign:'center',color:'#7a6035',fontSize:'17px',marginBottom:'18px'}}>Nenhuma pendente ✅</div>
            :<div style={{...card,padding:0,marginBottom:'18px'}}>
              <div style={{...secHdr,color:'#f66'}}>◆ AGUARDANDO APROVAÇÃO — {pendingTrades.length}</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                  <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','ENVIADO','AÇÕES'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{modPItems.map((t,i)=>(
                    <tr key={t.id} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                      <td style={{...td,color:'#b08f4f'}}>{fmtDate(t.data)}</td>
                      <td style={{...td,color:G,fontWeight:'bold'}}>{t.raro}</td>
                      <td style={{...td,color:'#bd9a5a'}}>{t.quantidade}</td>
                      <td style={{...td,color:'#cdac72'}}>{t.preco_venda}c</td>
                      <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.preco_por_unidade}c</td>
                      <td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
                      <td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
                      <td style={{...td,color:'#9a7d45',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                      <td style={{...td,whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:'5px'}}>
                          <button style={btnGreen} onMouseEnter={e=>{e.currentTarget.style.background='#4f4';e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background='#002200';e.currentTarget.style.color='#4f4';}} onClick={()=>approveTrade(t.id)}>✓</button>
                          <button style={{...btnD,padding:'4px 10px',fontSize:'17px'}} onMouseEnter={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background=BG3;e.currentTarget.style.color=G;}} onClick={()=>openEditTrade(t)}>✎</button>
                          <button style={btnRed} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>rejectTrade(t.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
                <Paginator page={modPPage} setPage={setModPPage} total={pendingTrades.length} isMobile={isMobile}/>
              </div>
            </div>}
          <div style={{...card,padding:0}}>
            <div style={secHdr}>
              <span>◆ NEGOCIAÇÕES APROVADAS — {trades.length}</span>
              <input className="inp" style={{...inp,width:'180px',padding:'4px 10px',fontSize:'16px'}} placeholder="filtrar..." value={modSearch} onChange={e=>setModSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO','AÇÕES'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>{modAItems.map((t,i)=>(
                  <tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                    <td style={{...td,color:'#b08f4f'}}>{fmtDate(t.data)}</td>
                    <td style={{...td,color:G,fontWeight:'bold'}}>{t.trocaInfo&&<span title={t.trocaInfo} style={{marginRight:'4px'}}>🔄</span>}{t.raro}</td>
                    <td style={{...td,color:'#bd9a5a'}}>{t.quantidade}</td>
                    <td style={{...td,color:'#cdac72'}}>{t.precoVenda}c</td>
                    <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                    <td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
                    <td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
                    <td style={{...td,color:'#9a7d45',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                    <td style={{...td,whiteSpace:'nowrap'}}>
                      <div style={{display:'flex',gap:'5px'}}>
                        <button style={{...btnD,padding:'4px 10px',fontSize:'17px'}} onMouseEnter={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background=BG3;e.currentTarget.style.color=G;}} onClick={()=>openEditTrade(t)}>✎</button>
                        <button style={btnRed} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>adminDeleteTrade(t.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              <Paginator page={modAPage} setPage={setModAPage} total={modATotal} isMobile={isMobile}/>
            </div>
          </div>

          {/* Chat moderation */}
          <div style={{...card,padding:0,marginTop:'18px'}}>
            <div style={secHdr}>
              <span>◆ MODERAÇÃO DO CHAT — {messages.length} mensagens</span>
              <input className="inp" style={{...inp,width:'160px',padding:'4px 10px',fontSize:'16px'}} placeholder="filtrar usuário..." value={chatModSearch} onChange={e=>setChatModSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['DATA/HORA','USUÁRIO','MENSAGEM',''].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {modCItems.map((m,i)=>(
                    <tr key={m.id} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                      <td style={{...td,color:'#bd9a5a',whiteSpace:'nowrap'}}>{fmtDate(m.created_at?.split('T')[0])} <span style={{color:'#9a7d45'}}>{fmtTime(m.created_at)}</span></td>
                      <td style={{...td,color:G,whiteSpace:'nowrap'}}>{m.username}</td>
                      <td style={{...td,color:'#c8a870',maxWidth:'400px',whiteSpace:'normal',wordBreak:'break-word'}}>{m.message}</td>
                      <td style={td}>
                        <button style={{...btnRed,padding:'3px 8px',fontSize:'16px'}} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>deleteMessage(m.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {!messages.length&&<tr><td colSpan={4} style={{...td,textAlign:'center',color:'#2a1800',padding:'24px'}}>Nenhuma mensagem no chat.</td></tr>}
                </tbody>
              </table>
              <Paginator page={modCPage} setPage={setModCPage} total={modCTotal} size={10} isMobile={isMobile}/>
            </div>
          </div>

          {/* Reset de senha */}
          <div style={{...card,padding:0,marginTop:'18px'}}>
            <div style={{...secHdr,color:'#ff8855'}}>🔑 REDEFINIR SENHA DE USUÁRIO</div>
            <div style={{padding:'14px 16px'}}>
              <div style={{color:'#c9a85f',fontSize:'15px',marginBottom:'12px'}}>Use esta ferramenta quando um jogador esquecer a senha. Você define uma senha nova, repassa para ele, e ele pode trocar depois.</div>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-end',flexWrap:'wrap'}}>
                <div style={{flex:'1 1 180px'}}>
                  <label style={{display:'block',color:'#c9a85f',fontSize:'14px',marginBottom:'5px'}}>USUÁRIO</label>
                  <select style={{...sel,padding:'8px 10px',fontSize:'17px'}} value={pwResetUser} onChange={e=>setPwResetUser(e.target.value)}>
                    <option value="">— selecionar —</option>
                    {allUsersFull.map(u=><option key={u.id} value={u.username}>{u.username}{u.is_admin?' (admin)':''}</option>)}
                  </select>
                </div>
                <div style={{flex:'1 1 180px'}}>
                  <label style={{display:'block',color:'#c9a85f',fontSize:'14px',marginBottom:'5px'}}>NOVA SENHA</label>
                  <input className="inp" style={{...inp,padding:'8px 10px'}} type="text" placeholder="mín. 4 caracteres" value={pwResetVal} onChange={e=>setPwResetVal(e.target.value)}/>
                </div>
                <button style={{...btnY,padding:'9px 18px',fontSize:'17px',opacity:loading?0.6:1}} onClick={doResetPassword} disabled={loading}>{loading?'...':'✓ REDEFINIR'}</button>
              </div>
            </div>
          </div>

          {/* User panel viewer */}
          <div style={{...card,padding:0,marginTop:'18px'}}>
            <div style={secHdr}>◆ PAINEL DE USUÁRIO</div>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #1a1000',display:'flex',gap:'8px',alignItems:'center'}}>
              <select style={{...sel,width:'220px',padding:'6px 10px',fontSize:'17px'}} value={viewUser} onChange={e=>{setViewUser(e.target.value);setViewUserData(null);}}>
                <option value="">— selecionar usuário —</option>
                {allUsers.map(u=><option key={u.id} value={u.username}>{u.username}{u.is_admin?' (admin)':''}</option>)}
              </select>
              <button style={{...btnY,padding:'6px 16px',fontSize:'17px'}} onClick={()=>loadViewUser(viewUser)} disabled={!viewUser}>Ver painel</button>
              {viewUserData&&<button style={{...btnG,padding:'6px 12px',fontSize:'16px'}} onClick={()=>{setViewUser('');setViewUserData(null);}}>✕ fechar</button>}
            </div>
            {viewUserData&&(
              <div style={{padding:'14px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px',marginBottom:'14px'}}>
                  {[
                    {l:'BALANÇO',v:`${viewUserData.totals.balanco>=0?'+':''}${viewUserData.totals.balanco}c`,color:viewUserData.totals.balanco>=0?'#69db7c':'#f66'},
                    {l:'LUCRO TOTAL',v:`${viewUserData.totals.lucroTotal>=0?'+':''}${viewUserData.totals.lucroTotal}c`,color:viewUserData.totals.lucroTotal>=0?'#63e6be':'#ff8855'},
                    {l:'INVESTIDO',v:`${viewUserData.totals.inv}c`,color:'#7bb8ff'},
                    {l:'PARADO',v:`${viewUserData.totals.parado}c`,color:G},
                  ].map(s=>(
                    <div key={s.l} style={{...card,padding:'10px',textAlign:'center',border:`1px solid ${s.color}33`}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#9a7d45',marginBottom:'6px'}}>{s.l}</div>
                      <div style={{color:s.color,fontSize:'20px',fontWeight:'bold'}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'16px'}}>
                    <thead><tr>{['RARO','COMPRADOS','VENDIDOS','ESTOQUE','CUSTO MÉD','INVESTIDO','VENDIDO','LUCRO'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {!viewUserData.stats.length&&<tr><td colSpan={8} style={{...td,textAlign:'center',color:'#2a1800',padding:'24px'}}>Sem operações registradas.</td></tr>}
                      {viewUserData.stats.map((item,i)=>(
                        <tr key={item.raro} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                          <td style={{...td,color:G,fontWeight:'bold'}}>{item.raro}</td>
                          <td style={{...td,color:'#7bb8ff'}}>{item.comprados}</td>
                          <td style={{...td,color:'#7dffaa'}}>{item.vendidos}</td>
                          <td style={{...td,color:item.estoque>0?G:'#4a3010'}}>{item.estoque}</td>
                          <td style={{...td,color:'#cdac72'}}>{item.custo}c</td>
                          <td style={{...td,color:'#7bb8ff'}}>{item.investido}c</td>
                          <td style={{...td,color:'#7dffaa'}}>{item.vendido}c</td>
                          <td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.lucro>=0?'#69db7c':'#f66'}}>{item.lucro>=0?'+':''}{item.lucro}c</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {viewUser&&!viewUserData&&<div style={{padding:'20px',textAlign:'center',color:'#9a7d45',fontSize:'16px'}}>Clique em "Ver painel" para carregar os dados.</div>}
          </div>
        </div>
      )}

      {/* ══ INSIGHTS ══ */}
      {tab==='insights'&&user?.is_admin&&(
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px solid #2a1800',borderLeft:`4px solid ${G}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:'14px',flexShrink:0}}>
            <span style={{fontSize:'20px'}}>📈</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>INSIGHTS DO SITE</div><div style={{color:'#c9a85f',fontSize:'15px'}}>Estatísticas de acesso e atividade dos usuários do Turva Trader.</div></div>
          </div>
          <div style={{overflow:'auto',flex:1,padding:'18px',paddingBottom:'100px',background:'#090600'}}>
            {/* Cards de resumo */}
            <div className="stat-grid" style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fit,minmax(180px,1fr))',gap:'10px',marginBottom:'16px'}}>
              {[
                {l:'LOGINS HOJE',v:String(insights.hoje),sub:`${insights.usersToday} usuário(s) único(s)`,color:'#69db7c'},
                {l:'LOGINS NA SEMANA',v:String(insights.semana),sub:`${insights.usersWeek} usuário(s) único(s)`,color:'#7bb8ff'},
                {l:'LOGINS NO MÊS',v:String(insights.mes),sub:'últimos 30 dias',color:'#e599f7'},
                {l:'TOTAL DE ACESSOS',v:String(insights.totalLogins),sub:'desde o início',color:G},
                {l:'HORÁRIO DE PICO',v:`${String(insights.horaPico).padStart(2,'0')}h`,sub:'mais movimentado',color:'#ffa94d'},
              ].map(s=>(
                <div key={s.l} style={{...card,padding:'14px 16px',border:`1px solid ${s.color}33`,boxShadow:`3px 3px 0 ${s.color}11`}}>
                  <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#9a7d45',marginBottom:'8px',letterSpacing:'1px'}}>{s.l}</div>
                  <div style={{color:s.color,fontSize:'26px',marginBottom:'4px',fontWeight:'bold'}}>{s.v}</div>
                  <div style={{color:'#9a7d45',fontSize:'14px'}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Gráfico de acessos por dia (14 dias) */}
            <div style={{...card,marginBottom:'16px',padding:0}}>
              <div style={secHdr}>◆ ACESSOS POR DIA — ÚLTIMOS 14 DIAS</div>
              <div style={{padding:'16px 10px 10px 0',background:'#080500'}}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={insights.dias14} margin={{top:5,right:20,left:10,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1000" vertical={false}/>
                    <XAxis dataKey="date" tickFormatter={v=>fmtDate(v).slice(0,5)} tick={{fill:'#9a7d45',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#2a1800'}} tickLine={false}/>
                    <YAxis allowDecimals={false} tick={{fill:'#9a7d45',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#2a1800'}} tickLine={false} width={35}/>
                    <Tooltip contentStyle={{background:'#1a1208',border:`2px solid ${G}`,fontFamily:"'VT323',monospace"}} labelFormatter={v=>fmtDate(v)} formatter={v=>[`${v} acesso(s)`,'']}/>
                    <Line type="monotone" dataKey="count" stroke={G} strokeWidth={2.5} dot={{fill:G,r:3,strokeWidth:0}} activeDot={{r:6,fill:'#fff',stroke:G,strokeWidth:2}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking de usuários */}
            <div style={{...card,padding:0}}>
              <div style={secHdr}>◆ RANKING DE USUÁRIOS MAIS ATIVOS</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                  <thead><tr>{['#','USUÁRIO','TOTAL DE ACESSOS','ÚLTIMO ACESSO'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {!insights.ranking.length&&<tr><td colSpan={4} style={{...td,textAlign:'center',color:'#2a1800',padding:'32px'}}>Nenhum acesso registrado ainda.</td></tr>}
                    {insights.ranking.map((u,i)=>(
                      <tr key={u.username} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                        <td style={{...td,color:i<3?G:'#4a3010',fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{i+1}º</td>
                        <td style={{...td,color:G,fontWeight:'bold'}}>{u.username}</td>
                        <td style={{...td,color:'#7dffaa',fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{u.total}</td>
                        <td style={{...td,color:'#cdac72'}}>{fmtDate(u.ultimo.split('T')[0])} <span style={{color:'#9a7d45'}}>{fmtTime(u.ultimo)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CHAT WIDGET ══ */}
      <div className="chat-widget" style={{position:'fixed',bottom:'32px',right:'20px',zIndex:90,width:isMobile?'calc(100vw - 16px)':'300px'}}>
        {/* Header */}
        <div onClick={()=>setChatOpen(p=>!p)} style={{background:`linear-gradient(135deg,#1a1000,${BG3})`,border:`2px solid ${G}`,borderBottom:chatOpen?`1px solid ${G2}`:`2px solid ${G}`,padding:'8px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',userSelect:'none'}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:G,display:'flex',alignItems:'center',gap:'8px'}}>
            💬 CHAT
            <span style={{background:'#1a1800',border:`1px solid ${G2}`,color:'#aa8833',padding:'1px 6px',fontSize:'11px',fontFamily:"'VT323',monospace"}}>{messages.length}</span>
          </div>
          <span style={{color:G,fontSize:'18px',lineHeight:1}}>{chatOpen?'▼':'▲'}</span>
        </div>
        {/* Body */}
        {chatOpen&&(
          <div style={{background:'#0a0600',border:`2px solid ${G}`,borderTop:'none',display:'flex',flexDirection:'column'}} className="chat-anim">
            {/* Messages */}
            <div ref={chatRef} style={{height:'240px',overflow:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'6px'}}>
              {!messages.length&&<div style={{color:'#7a6035',fontSize:'16px',textAlign:'center',marginTop:'80px'}}>Nenhuma mensagem ainda.</div>}
              {messages.map(m=>{
                const isMe=m.username===user?.username;
                return(
                  <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
                    <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:isMe?G2:'#664400',marginBottom:'2px'}}>{m.username} <span style={{color:'#7a6035',fontFamily:"'VT323',monospace",fontSize:'13px'}}>{fmtTime(m.created_at)}</span></div>
                    <div style={{background:isMe?'#1a1000':'#130f0a',border:`1px solid ${isMe?G2:'#2a1800'}`,padding:'6px 10px',fontSize:'16px',color:isMe?'#e8c870':'#c8a870',maxWidth:'85%',wordBreak:'break-word'}}>
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Input */}
            <div style={{borderTop:`1px solid #1a1000`,padding:'8px',display:'flex',gap:'6px'}}>
              <input className="inp" style={{...inp,flex:1,padding:'7px 10px',fontSize:'17px'}} placeholder="mensagem..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} maxLength={200}/>
              <button style={{...btnY,padding:'7px 12px',fontSize:'18px',flexShrink:0}} onClick={sendMessage}>▶</button>
            </div>
          </div>
        )}
      </div>

      {/* ══ QUICK INFO MODAL (catálogo) ══ */}
      <Modal show={!!quickRaro} onClose={()=>setQuickRaro(null)} title={`ℹ ${quickRaro||''}`} width="440px">
        {quickRaro&&quickCatalog&&(
          <div>
            <div style={{display:'flex',gap:'20px',marginBottom:'18px',alignItems:'flex-start'}}>
              {quickCatalog.imagem_url&&<Img url={quickCatalog.imagem_url} alt={quickRaro} size={90}/>}
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'13px',color:G,marginBottom:'8px'}}>{quickRaro}</div>
                <Badge cat={quickCatalog.categoria||quickInfo?.categoria||''}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              {[
                {l:'PREÇO DE LANÇAMENTO',v:`${quickCatalog.preco_catalogo??'—'}c`,c:'#e599f7'},
                {l:'PIXELS',v:quickCatalog.pixels!=null?`${quickCatalog.pixels}px`:'—',c:'#63e6be'},
                ...(['Raro Exclusivo','Raro Rotativo','Raro Colecionável'].includes(quickCatalog.categoria)?[{l:'DATA DE LANÇAMENTO',v:quickCatalog.data_lancamento?fmtDate(quickCatalog.data_lancamento):'—',c:G}]:[]),
                {l:'CATEGORIA',v:quickCatalog.categoria||'—',c:'#aaa'},
              ].map(s=>(
                <div key={s.l} style={{...card,padding:'12px',textAlign:'center'}}>
                  <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#9a7d45',marginBottom:'8px'}}>{s.l}</div>
                  <div style={{color:s.c,fontSize:'18px'}}>{s.v}</div>
                </div>
              ))}
            </div>
            {quickInfo?.count>0&&(
              <div style={{borderTop:`1px solid #1a1000`,paddingTop:'14px'}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#9a7d45',marginBottom:'10px',letterSpacing:'1px'}}>DADOS DE MERCADO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                  {[{l:'MÉDIA ÚLT. 3 NEG.',v:`${quickInfo.avgPrice}c`,c:G},{l:'ÚLTIMO',v:`${quickInfo.lastPrice}c`,c:'#aa8855'},{l:'UNID. VENDIDAS',v:String(quickInfo.count),c:'#664400'}].map(s=>(
                    <div key={s.l} style={{...card,padding:'10px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#9a7d45',marginBottom:'6px'}}>{s.l}</div>
                      <div style={{color:s.c,fontSize:'17px'}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button style={{...btnY,width:'100%',textAlign:'center',marginTop:'16px',fontSize:'17px'}} onClick={()=>{setSelRaro(quickRaro);setQuickRaro(null);setTab('mercado');}}>Ver histórico completo →</button>
          </div>
        )}
        {quickRaro&&!quickCatalog&&(
          <div style={{textAlign:'center',padding:'32px',color:'#9a7d45',fontSize:'17px'}}>Este raro não tem dados no catálogo ainda.</div>
        )}
      </Modal>

      {/* ══ MODALS ══ */}
      {/* Registrar Negociação */}
      <Modal show={showTM} onClose={()=>setShowTM(false)} title="◆ REGISTRAR NEGOCIAÇÃO">
        <Flash msg={msg}/>
        {/* Raro - auto-fill category */}
        <div style={{marginBottom:'13px'}}>
          <label style={lbl}>RARO *</label>
          <input className="inp" style={inp} placeholder="ex: Holo Mano" value={tF.raro}
            onChange={e=>handleRaroSelect(e.target.value)} list="rl1"/>
          <datalist id="rl1">{rarities.map(r=><option key={r.raro} value={r.raro}/>)}{uRaros.filter(r=>!rarities.find(x=>x.raro===r.raro)).map(r=><option key={r.raro} value={r.raro}/>)}</datalist>
          {tF.raro&&rarities.find(r=>r.raro===tF.raro)&&(
            <div style={{fontSize:'14px',color:'#69db7c',marginTop:'4px'}}>✓ Categoria auto-preenchida: <span style={{color:G}}>{tF.categoria}</span></div>
          )}
        </div>
        {/* Price toggle */}
        <div style={{marginBottom:'13px'}}>
          <label style={lbl}>COMO DESEJA INFORMAR O PREÇO? *</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'10px'}}>
            {[['total','💰 TOTAL'],['unit','📦 POR UNIDADE'],['barra','🍫 EM BARRAS']].map(([v,l])=>(
              <button key={v} style={{...btnD,textAlign:'center',fontSize:'15px',padding:'10px 4px',background:tF.priceMode===v?G:BG3,color:tF.priceMode===v?'#000':G,border:`2px solid ${tF.priceMode===v?G2:'#2a1800'}`,transition:'all .15s',fontWeight:tF.priceMode===v?'bold':'normal'}} onClick={()=>setTF({...tF,priceMode:v})}>{l}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={tF.quantidade} onChange={e=>setTF({...tF,quantidade:e.target.value})}/></div>
            <div>
              <label style={lbl}>{tF.priceMode==='total'?'PREÇO TOTAL (c) *':tF.priceMode==='unit'?'PREÇO POR UNIDADE (c) *':'TOTAL EM BARRAS *'}</label>
              {tF.priceMode==='total'&&<input className="inp" style={inp} type="number" min="0" placeholder="ex: 850" value={tF.precoVenda} onChange={e=>setTF({...tF,precoVenda:e.target.value})}/>}
              {tF.priceMode==='unit'&&<input className="inp" style={inp} type="number" min="0" placeholder="ex: 425" value={tF.precoPorUnidade} onChange={e=>setTF({...tF,precoPorUnidade:e.target.value})}/>}
              {tF.priceMode==='barra'&&<input className="inp" style={inp} type="number" min="0" step="0.5" placeholder="ex: 17" value={tF.precoBarras} onChange={e=>setTF({...tF,precoBarras:e.target.value})}/>}
            </div>
          </div>
        </div>
        {/* Preview */}
        {(tF.precoVenda!==''||tF.precoPorUnidade!==''||tF.precoBarras!=='')&&parseInt(tF.quantidade)>=1&&(()=>{
          const qtd=Math.max(1,parseInt(tF.quantidade)||1);
          let pv;
          if(tF.priceMode==='total')pv=parseFloat(tF.precoVenda||0);
          else if(tF.priceMode==='unit')pv=parseFloat(tF.precoPorUnidade||0)*qtd;
          else pv=parseFloat(tF.precoBarras||0)*BARRA;
          const ppu=Math.round(pv/qtd);
          const barras=pv/BARRA;
          return<div style={{background:'#080500',border:`1px solid #2a1800`,padding:'8px 14px',marginBottom:'13px',fontSize:'15px',color:'#c9a85f',display:'flex',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}>
            <span>Total: <span style={{color:'#cdac72'}}>{Math.round(pv)}c</span></span>
            <span>Por unidade: <span style={{color:G,fontFamily:"'Press Start 2P'",fontSize:'11px'}}>{ppu}c</span></span>
            <span>Em barras: <span style={{color:'#ffd700'}}>🍫 {barras%1===0?barras:barras.toFixed(1)}</span></span>
          </div>;
        })()}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} placeholder="nick do vendedor" value={tF.vendedor} onChange={e=>setTF({...tF,vendedor:e.target.value})}/></div>
          <div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} placeholder="nick do comprador" value={tF.comprador} onChange={e=>setTF({...tF,comprador:e.target.value})}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
          <div>
            <label style={lbl}>CATEGORIA {tF.raro&&rarities.find(r=>r.raro===tF.raro)?'(automática)':'*'}</label>
            <select className="inp" style={{...sel,opacity:tF.raro&&rarities.find(r=>r.raro===tF.raro)?0.6:1}} value={tF.categoria} onChange={e=>setTF({...tF,categoria:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={tF.data} onChange={e=>setTF({...tF,data:e.target.value})}/></div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doAddTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
          <button style={btnG} onClick={()=>setShowTM(false)}>CANCELAR</button>
        </div>
      </Modal>

      {/* Registrar Negociação (venda, troca ou mista) */}
      <Modal show={showTroca} onClose={()=>{setShowTroca(false);setConvertingId(null);}} title="◆ REGISTRAR NEGOCIAÇÃO" width="560px">
        <Flash msg={msg}/>
        {trF&&(()=>{
          const av=avaliarTroca(trF);
          const renderLado=(lado,key,moedasKey,titulo,cor)=>(
            <div style={{background:'#0d0800',border:`1px solid ${cor}44`,borderLeft:`3px solid ${cor}`,padding:'12px',marginBottom:'10px'}}>
              <div style={{color:cor,marginBottom:'8px',fontFamily:"'Press Start 2P'",fontSize:'9px',letterSpacing:'1px'}}>{titulo}</div>
              {trF[key].map((item,idx)=>(
                <div key={idx} style={{display:'flex',gap:'6px',marginBottom:'7px',alignItems:'center'}}>
                  <input className="inp" list="raros-list" style={{...inp,flex:1,padding:'6px 9px',fontSize:'15px'}} placeholder="nome do raro" value={item.raro} onChange={e=>{const n=[...trF[key]];n[idx]={...n[idx],raro:e.target.value};setTrF({...trF,[key]:n});}}/>
                  <input className="inp" type="number" min="1" style={{...inp,width:'58px',padding:'6px',fontSize:'15px',textAlign:'center'}} value={item.qtd} onChange={e=>{const n=[...trF[key]];n[idx]={...n[idx],qtd:e.target.value};setTrF({...trF,[key]:n});}}/>
                  {trF[key].length>1&&<button style={{background:'transparent',border:'none',color:'#f66',cursor:'pointer',fontSize:'18px',padding:'0 4px'}} onClick={()=>{const n=trF[key].filter((_,i)=>i!==idx);setTrF({...trF,[key]:n});}}>✕</button>}
                </div>
              ))}
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px',marginBottom:'6px'}}>
                <span style={{color:'#ffd700',fontSize:'15px'}}>💰 moedas:</span>
                <input className="inp" type="number" min="0" style={{...inp,width:'110px',padding:'5px 8px',fontSize:'15px'}} placeholder="0c" value={trF[moedasKey]} onChange={e=>setTrF({...trF,[moedasKey]:e.target.value})}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'4px'}}>
                <button style={{background:'transparent',border:`1px dashed ${cor}66`,color:cor,cursor:'pointer',fontSize:'14px',padding:'4px 10px',fontFamily:"'VT323',monospace"}} onClick={()=>setTrF({...trF,[key]:[...trF[key],{raro:'',qtd:1}]})}>+ adicionar raro</button>
                {(()=>{const side=key==='ladoA'?av?.A:av?.B;if(!side)return null;if(side.itens.length===0&&side.coins>0)return null;return !side.hasUnknown&&side.itens.length?<span style={{color:'#9a7d45',fontSize:'13px'}}>≈ {side.valor}c</span>:side.itens.length?<span style={{color:'#9400d3',fontSize:'13px'}}>raro sem preço ainda</span>:null;})()}
              </div>
            </div>
          );
          return(
            <div>
              <datalist id="raros-list">{rarities.map(r=><option key={r.raro} value={r.raro}/>)}</datalist>
              {convertingId&&<div style={{background:'#1a0a2a',border:'1px solid #9400d3',padding:'9px 12px',marginBottom:'12px',color:'#c98fff',fontSize:'15px'}}>🔄 Convertendo uma negociação antiga em troca. O Lado A já foi preenchido com o raro original — adicione no Lado B o que foi recebido. O registro antigo será substituído ao salvar.</div>}
              <div style={{color:'#c9a85f',fontSize:'15px',marginBottom:'14px'}}>Registre uma <b style={{color:G}}>venda</b> (raro por moedas), uma <b style={{color:'#c98fff'}}>troca</b> (raro por raro) ou <b style={{color:'#69db7c'}}>mista</b> (raro + moedas). Coloque as moedas no lado em que elas entraram. O sistema calcula os preços automaticamente.</div>

              {renderLado(trF.ladoA,'ladoA','moedasA','LADO A — O QUE O JOGADOR A ENTREGOU','#7bb8ff')}
              <div style={{textAlign:'center',color:'#9400d3',fontSize:'22px',margin:'2px 0 8px'}}>⇅</div>
              {renderLado(trF.ladoB,'ladoB','moedasB','LADO B — O QUE O JOGADOR A RECEBEU','#69db7c')}

              {/* Resultado da avaliação */}
              {av?.valido&&(
                <div style={{background:'#130f0a',border:`1px solid ${G}55`,padding:'12px 14px',marginBottom:'14px'}}>
                  {av.manual?(
                    <div>
                      <div style={{color:'#ffa94d',fontSize:'15px',marginBottom:'8px'}}>⚠ Nenhum dos raros tem preço de mercado ainda. Informe o valor total estimado desta negociação (uma vez só):</div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                        <input className="inp" type="number" min="0" style={{...inp,width:'140px'}} placeholder="valor total (c)" value={trF.valorManual} onChange={e=>setTrF({...trF,valorManual:e.target.value})}/>
                        <span style={{color:'#9a7d45',fontSize:'14px'}}>moedas no total</span>
                      </div>
                    </div>
                  ):(
                    <div>
                      <div style={{color:'#9a7d45',fontSize:'13px',marginBottom:'4px'}}>Referência: <span style={{color:G}}>{av.ancora==='A'?'Lado A':'Lado B'}</span> {(av.ancora==='A'?av.A:av.B).isPureCoins?'(moedas = preço real)':'(mais negociado)'} · define o valor</div>
                      <div style={{color:G,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>Valor da negociação: {av.V}c</div>
                      <div style={{marginTop:'8px'}}>
                        <label style={{...lbl,fontSize:'13px'}}>Ajustar valor (opcional, se foi um negócio fora da curva):</label>
                        <input className="inp" type="number" min="0" style={{...inp,width:'140px'}} placeholder={`${av.V}`} value={trF.valorManual} onChange={e=>setTrF({...trF,valorManual:e.target.value})}/>
                        <span style={{color:'#9a7d45',fontSize:'13px',marginLeft:'8px'}}>{trF.valorManual?'usando valor ajustado':'deixe vazio p/ usar o sugerido'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
                <div><label style={lbl}>JOGADOR A (entregou) *</label><input className="inp" style={inp} placeholder="nick" value={trF.jogadorA} onChange={e=>setTrF({...trF,jogadorA:e.target.value})}/></div>
                <div><label style={lbl}>JOGADOR B (recebeu) *</label><input className="inp" style={inp} placeholder="nick" value={trF.jogadorB} onChange={e=>setTrF({...trF,jogadorB:e.target.value})}/></div>
              </div>
              <div style={{marginBottom:'18px'}}><label style={lbl}>DATA *</label><input className="inp" style={{...inp,maxWidth:'200px'}} type="date" value={trF.data} onChange={e=>setTrF({...trF,data:e.target.value})}/></div>

              <div style={{display:'flex',gap:'10px'}}>
                <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doAddTroca} disabled={loading}>{loading?'SALVANDO...':'✓ REGISTRAR'}</button>
                <button style={btnG} onClick={()=>{setShowTroca(false);setConvertingId(null);}}>CANCELAR</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Registrar Operação */}
      <Modal show={showOM} onClose={()=>setShowOM(false)} title="◆ REGISTRAR OPERAÇÃO" width="450px">
        <Flash msg={msg}/>
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>TIPO *</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[['compra','🛒 COMPRA'],['venda','💰 VENDA']].map(([v,l])=>(
              <button key={v} style={{...btnD,textAlign:'center',fontSize:'18px',background:oF.tipo===v?G:BG3,color:oF.tipo===v?'#000':G,transition:'all .15s'}} onClick={()=>setOF({...oF,tipo:v})}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:'13px'}}>
          <label style={lbl}>RARO *</label>
          <input className="inp" style={inp} placeholder="ex: Holo Mano" value={oF.raro} onChange={e=>setOF({...oF,raro:e.target.value})} list="rl2"/>
          <datalist id="rl2">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}{rarities.map(r=><option key={r.raro+'_'} value={r.raro}/>)}</datalist>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={oF.quantidade} onChange={e=>setOF({...oF,quantidade:e.target.value})}/></div>
          <div>
            <label style={lbl}>
              <span style={{cursor:'pointer',color:oF.priceMode==='total'?G:'#664400',textDecoration:'underline'}} onClick={()=>setOF({...oF,priceMode:'total'})}>💰 TOTAL</span>
              <span style={{color:'#7a6035',margin:'0 6px'}}>|</span>
              <span style={{cursor:'pointer',color:oF.priceMode==='unit'?G:'#664400',textDecoration:'underline'}} onClick={()=>setOF({...oF,priceMode:'unit'})}>📦 POR UN.</span>
              <span style={{color:'#7a6035',margin:'0 6px'}}>|</span>
              <span style={{cursor:'pointer',color:oF.priceMode==='barra'?G:'#664400',textDecoration:'underline'}} onClick={()=>setOF({...oF,priceMode:'barra'})}>🍫 BARRAS</span>
            </label>
            {oF.priceMode==='total'&&<input className="inp" style={inp} type="number" min="0" placeholder="preço total (c)" value={oF.precoTotal} onChange={e=>setOF({...oF,precoTotal:e.target.value})}/>}
            {oF.priceMode==='unit'&&<input className="inp" style={inp} type="number" min="0" placeholder="preço/un (c)" value={oF.precoPorUnidade} onChange={e=>setOF({...oF,precoPorUnidade:e.target.value})}/>}
            {oF.priceMode==='barra'&&<input className="inp" style={inp} type="number" min="0" step="0.5" placeholder="total em barras" value={oF.precoBarras} onChange={e=>setOF({...oF,precoBarras:e.target.value})}/>}
          </div>
        </div>
        {/* Preview */}
        {(oF.precoTotal!==''||oF.precoPorUnidade!==''||oF.precoBarras!=='')&&parseInt(oF.quantidade)>=1&&(()=>{
          const qtd=Math.max(1,parseInt(oF.quantidade)||1);
          let pt;
          if(oF.priceMode==='total')pt=parseFloat(oF.precoTotal||0);
          else if(oF.priceMode==='unit')pt=parseFloat(oF.precoPorUnidade||0)*qtd;
          else pt=parseFloat(oF.precoBarras||0)*BARRA;
          const ppu=Math.round(pt/qtd),barras=pt/BARRA;
          return<div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12px',marginBottom:'13px',fontSize:'15px',color:'#c9a85f',display:'flex',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}>
            <span>Total: <span style={{color:'#cdac72'}}>{pt===0?'0 (presente!)':Math.round(pt)+'c'}</span></span>
            <span>P/ un: <span style={{color:G,fontFamily:"'Press Start 2P'",fontSize:'11px'}}>{ppu}c</span></span>
            <span>Barras: <span style={{color:'#ffd700'}}>🍫 {barras%1===0?barras:barras.toFixed(1)}</span></span>
          </div>;
        })()}
        {/* Catalog price button */}
        {oF.raro&&rarities.find(r=>r.raro===oF.raro)&&(
          <button style={{...btnD,width:'100%',textAlign:'center',marginBottom:'13px',fontSize:'17px',borderStyle:'dashed'}} onClick={useCatalogPrice}>
            📦 Usar preço do catálogo ({rarities.find(r=>r.raro===oF.raro)?.preco_catalogo??0}c/un)
          </button>
        )}
        <div style={{marginBottom:'20px'}}><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={oF.data} onChange={e=>setOF({...oF,data:e.target.value})}/></div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doAddOp} disabled={loading}>{loading?'SALVANDO...':'✓ CONFIRMAR'}</button>
          <button style={btnG} onClick={()=>setShowOM(false)}>CANCELAR</button>
        </div>
      </Modal>

      {/* Nova/Editar Ordem */}
      <Modal show={showOrderModal} onClose={()=>{setShowOrderModal(false);setEditingOrder(null);setOrderForm(eOrder);}} title={editingOrder?'✎ EDITAR ORDEM':'◆ NOVA ORDEM'} width="520px">
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>TIPO *</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[['compra','🛒 COMPRO'],['venda','💰 VENDO']].map(([v,l])=>(
              <button key={v} style={{...btnD,textAlign:'center',fontSize:'18px',background:orderForm.tipo===v?(v==='compra'?'#69db7c':'#f66'):BG3,color:orderForm.tipo===v?'#000':(v==='compra'?'#69db7c':'#f66'),border:`1px solid ${v==='compra'?'#69db7c44':'#f6644'}`,transition:'all .15s'}} onClick={()=>setOrderForm({...orderForm,tipo:v})}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{fontFamily:"'Press Start 2P'",fontSize:'9px',color:'#9a7d45',marginBottom:'10px',letterSpacing:'1px'}}>RAROS</div>
        {orderForm.items.map((it,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 100px 32px',gap:'8px',marginBottom:'8px',alignItems:'flex-end'}}>
            <div>{i===0&&<label style={{...lbl,marginBottom:'4px'}}>RARO</label>}<input className="inp" style={inp} placeholder="nome do raro" value={it.raro} onChange={e=>updOItem(i,'raro',e.target.value)} list="rl-ord"/></div>
            <div>{i===0&&<label style={{...lbl,marginBottom:'4px'}}>QTD</label>}<input className="inp" style={inp} type="number" min="1" value={it.quantidade} onChange={e=>updOItem(i,'quantidade',e.target.value)}/></div>
            <div>{i===0&&<label style={{...lbl,marginBottom:'4px'}}>PREÇO/UN</label>}<input className="inp" style={inp} type="number" min="0" placeholder="0" value={it.preco} onChange={e=>updOItem(i,'preco',e.target.value)}/></div>
            <button style={{...btnRed,padding:'9px 8px',fontSize:'18px'}} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>rmOItem(i)}>✕</button>
          </div>
        ))}
        <datalist id="rl-ord">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist>
        <button style={{...btnG,width:'100%',textAlign:'center',marginBottom:'14px',fontSize:'17px'}} onClick={addOItem}>+ Adicionar raro</button>
        <div style={{marginBottom:'20px'}}><label style={lbl}>OBSERVAÇÃO (opcional)</label><input className="inp" style={inp} placeholder="ex: aceito trocas" value={orderForm.observacao} onChange={e=>setOrderForm({...orderForm,observacao:e.target.value})}/></div>
        <div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12px',marginBottom:'18px',fontSize:'16px',color:'#9a7d45'}}>
          ⏱ Ativa por <span style={{color:G}}>72 horas</span> e desaparece automaticamente.
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doSaveOrder} disabled={loading}>{loading?'SALVANDO...':`✓ ${editingOrder?'ATUALIZAR':'PUBLICAR'}`}</button>
          <button style={btnG} onClick={()=>{setShowOrderModal(false);setEditingOrder(null);setOrderForm(eOrder);}}>CANCELAR</button>
        </div>
      </Modal>

      {/* Editar Trade */}
      <Modal show={showEditModal&&!!editingTrade} onClose={()=>{setShowEditModal(false);setEditingTrade(null);}} title="✎ EDITAR NEGOCIAÇÃO">
        {editingTrade&&<>
          {editingTrade.trocaInfo&&<div style={{background:'#1a0a2a',border:'1px solid #9400d3',padding:'8px 12px',marginBottom:'13px',color:'#c98fff',fontSize:'15px'}}>🔄 Esta negociação faz parte de uma troca ({editingTrade.trocaInfo.replace('🔄 trocado por: ','trocado por: ')}). Editar aqui altera só este lado.</div>}
          <div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input className="inp" style={inp} value={editingTrade.raro} onChange={e=>setEditingTrade({...editingTrade,raro:e.target.value})} list="rl-edit"/><datalist id="rl-edit">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist></div>
          <div style={{marginBottom:'13px'}}>
            <label style={lbl}>COMO REPRECIFICAR</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
              {[['total','💰 TOTAL'],['unit','📊 P/ UNIDADE'],['barra','🍫 BARRAS']].map(([v,l])=>(
                <button key={v} style={{...btnD,textAlign:'center',fontSize:'14px',padding:'8px 4px',background:editingTrade.priceMode===v?G:BG3,color:editingTrade.priceMode===v?'#000':G}} onClick={()=>setEditingTrade({...editingTrade,priceMode:v})}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
            <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={editingTrade.quantidade} onChange={e=>setEditingTrade({...editingTrade,quantidade:e.target.value})}/></div>
            {editingTrade.priceMode==='unit'&&<div><label style={lbl}>PREÇO POR UNIDADE (c) *</label><input className="inp" style={inp} type="number" min="0" value={editingTrade.precoPorUnidade} onChange={e=>setEditingTrade({...editingTrade,precoPorUnidade:e.target.value})}/></div>}
            {editingTrade.priceMode==='barra'&&<div><label style={lbl}>TOTAL EM BARRAS *</label><input className="inp" style={inp} type="number" min="0" step="0.5" placeholder="ex: 17" value={editingTrade.precoBarras||''} onChange={e=>setEditingTrade({...editingTrade,precoBarras:e.target.value})}/></div>}
            {editingTrade.priceMode!=='unit'&&editingTrade.priceMode!=='barra'&&<div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={inp} type="number" min="0" value={editingTrade.precoVenda} onChange={e=>setEditingTrade({...editingTrade,precoVenda:e.target.value})}/></div>}
          </div>
          {(()=>{
            const q=parseInt(editingTrade.quantidade)||1;
            let pv=0;
            if(editingTrade.priceMode==='unit')pv=(parseFloat(editingTrade.precoPorUnidade)||0)*q;
            else if(editingTrade.priceMode==='barra')pv=(parseFloat(editingTrade.precoBarras)||0)*BARRA;
            else pv=parseFloat(editingTrade.precoVenda)||0;
            const ppu=Math.round(pv/q),barras=pv/BARRA;
            return <div style={{color:'#9a7d45',fontSize:'14px',marginBottom:'13px',display:'flex',gap:'12px',flexWrap:'wrap'}}><span>Total: <b style={{color:'#cdac72'}}>{Math.round(pv)}c</b></span><span>P/ un.: <b style={{color:G}}>{ppu}c</b></span><span>Barras: <b style={{color:'#ffd700'}}>🍫 {barras%1===0?barras:barras.toFixed(1)}</b></span></div>;
          })()}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
            <div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} value={editingTrade.vendedor} onChange={e=>setEditingTrade({...editingTrade,vendedor:e.target.value})}/></div>
            <div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} value={editingTrade.comprador} onChange={e=>setEditingTrade({...editingTrade,comprador:e.target.value})}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div><label style={lbl}>CATEGORIA *</label><select className="inp" style={sel} value={editingTrade.categoria} onChange={e=>setEditingTrade({...editingTrade,categoria:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={editingTrade.data} onChange={e=>setEditingTrade({...editingTrade,data:e.target.value})}/></div>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doEditTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
            <button style={btnG} onClick={()=>{setShowEditModal(false);setEditingTrade(null);}}>CANCELAR</button>
          </div>
        </>}
      </Modal>

      {/* Editar Portfólio */}
      <Modal show={showPEdit&&!!editingP} onClose={()=>{setShowPEdit(false);setEditingP(null);}} title="✎ EDITAR PORTFÓLIO" width="420px">
        {editingP&&<>
          <div style={{color:G,fontSize:'22px',marginBottom:'16px',borderBottom:`1px solid #1a1000`,paddingBottom:'10px'}}>{editingP.raro}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div><label style={lbl}>QTD COMPRADA</label><input className="inp" style={inp} type="number" min="0" value={editingP.comprados} onChange={e=>setEditingP({...editingP,comprados:e.target.value})}/></div>
            <div><label style={lbl}>TOTAL INVESTIDO (c)</label><input className="inp" style={inp} type="number" min="0" value={editingP.investido} onChange={e=>setEditingP({...editingP,investido:e.target.value})}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div><label style={lbl}>QTD VENDIDA</label><input className="inp" style={inp} type="number" min="0" value={editingP.vendidos} onChange={e=>setEditingP({...editingP,vendidos:e.target.value})}/></div>
            <div><label style={lbl}>TOTAL RECEBIDO (c)</label><input className="inp" style={inp} type="number" min="0" value={editingP.vendido} onChange={e=>setEditingP({...editingP,vendido:e.target.value})}/></div>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doEditPortfolioRaro} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
            <button style={btnG} onClick={()=>{setShowPEdit(false);setEditingP(null);}}>CANCELAR</button>
          </div>
        </>}
      </Modal>

      {/* Minha Conta - trocar senha */}
      <Modal show={showAccount} onClose={()=>setShowAccount(false)} title="⚙ MINHA CONTA" width="420px">
        <Flash msg={msg}/>
        <div style={{color:G,fontSize:'20px',marginBottom:'6px'}}>{user?.username}</div>
        <div style={{color:'#c9a85f',fontSize:'15px',marginBottom:'18px',borderBottom:'1px solid #1a1000',paddingBottom:'14px'}}>Altere sua senha abaixo. Você precisa informar a senha atual para confirmar que é você.</div>
        <div style={{marginBottom:'13px'}}><label style={{display:'block',color:'#c9a85f',fontSize:'14px',marginBottom:'5px'}}>SENHA ATUAL *</label><input className="inp" style={inp} type="password" placeholder="sua senha de agora" value={accForm.atual} onChange={e=>setAccForm({...accForm,atual:e.target.value})}/></div>
        <div style={{marginBottom:'13px'}}><label style={{display:'block',color:'#c9a85f',fontSize:'14px',marginBottom:'5px'}}>NOVA SENHA *</label><input className="inp" style={inp} type="password" placeholder="mín. 4 caracteres" value={accForm.nova} onChange={e=>setAccForm({...accForm,nova:e.target.value})}/></div>
        <div style={{marginBottom:'20px'}}><label style={{display:'block',color:'#c9a85f',fontSize:'14px',marginBottom:'5px'}}>CONFIRMAR NOVA SENHA *</label><input className="inp" style={inp} type="password" placeholder="repita a nova senha" value={accForm.confirma} onChange={e=>setAccForm({...accForm,confirma:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doChangePassword()}/></div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doChangePassword} disabled={loading}>{loading?'SALVANDO...':'✓ ALTERAR SENHA'}</button>
          <button style={btnG} onClick={()=>setShowAccount(false)}>CANCELAR</button>
        </div>
      </Modal>

      {/* Tutorial Modal */}
      <Modal show={showTutorial} onClose={()=>setShowTutorial(false)} title="? GUIA DO TURVA TRADER" width="560px">
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {[
            {icon:'⚔',tab:'MERCADO',color:'#7bb8ff',desc:'Veja os preços históricos de todos os raros do Turva. Clique em qualquer raro na tabela para ver o histórico completo de negociações, gráfico de evolução do preço e dados do catálogo.',dicas:['Clique nas colunas para ordenar a tabela','Use o botão ℹ para ver rapidamente os dados do catálogo','Use + REGISTRAR para cadastrar uma nova negociação']},
            {icon:'📊',tab:'MEU PAINEL',color:'#69db7c',desc:'Gerencie seu portfólio pessoal de raros. Registre todas as suas compras e vendas e acompanhe seu desempenho.',dicas:['Clique em + OPERAÇÃO para registrar uma compra ou venda','Use o botão 📦 para preencher o preço do catálogo automaticamente','Clique nas colunas da tabela para ordenar por lucro, estoque, etc.','Raros ganhos de presente podem ser registrados com preço 0c']},
            {icon:'🤝',tab:'NEGOCIAÇÕES',color:G,desc:'Veja quem está comprando ou vendendo raros agora. Publique sua própria oferta e encontre negócios.',dicas:['Ordens ficam ativas por 72 horas e somem automaticamente','Você pode adicionar vários raros numa mesma ordem','Apenas você (e o moderador) pode editar/excluir sua ordem']},
            {icon:'📝',tab:'REGISTRAR NEGOCIAÇÃO',color:'#e599f7',desc:'Ao registrar uma negociação, a categoria é preenchida automaticamente quando você digita o nome do raro.',dicas:['Escolha entre informar o PREÇO TOTAL ou o PREÇO POR UNIDADE','O outro valor é calculado automaticamente','Usuários normais passam por aprovação do moderador']},
          ].map(s=>(
            <div key={s.tab} style={{background:'#0a0800',border:`1px solid ${s.color}33`,borderLeft:`4px solid ${s.color}`,padding:'14px',borderRadius:'0'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                <span style={{fontSize:'22px'}}>{s.icon}</span>
                <span style={{fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:s.color}}>{s.tab}</span>
              </div>
              <div style={{color:'#c8a870',fontSize:'16px',marginBottom:'10px',lineHeight:1.5}}>{s.desc}</div>
              <ul style={{paddingLeft:'16px',margin:0}}>
                {s.dicas.map((d,i)=><li key={i} style={{color:'#c9a85f',fontSize:'15px',marginBottom:'4px',lineHeight:1.4}}>{d}</li>)}
              </ul>
            </div>
          ))}
          <button style={{...btnY,width:'100%',textAlign:'center',fontSize:'18px',marginTop:'4px'}} onClick={()=>setShowTutorial(false)}>✓ Entendi, vamos lá!</button>
        </div>
      </Modal>

      {/* Footer */}
      <footer style={{position:'fixed',bottom:0,left:0,right:0,height:'68px',background:`linear-gradient(to right,${BG2},#0f0800)`,borderTop:`1px solid #2a1800`,display:'flex',alignItems:'center',justifyContent:'center',gap:'16px',fontSize:'17px',color:'#9a7d45',zIndex:99,fontFamily:"'VT323',monospace",letterSpacing:'1px'}}>
        <a href="https://www.turva.com.br" target="_blank" rel="noopener noreferrer" title="Fã-site oficial do Turva" style={{display:'flex',alignItems:'center',transition:'all .15s'}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <img src={FANSITE_BADGE} alt="Fã-site oficial do Turva" style={{display:'block',height:'60px',imageRendering:'pixelated'}}/>
        </a>
        <span>Feito com amor por:{' '}<a href="http://turva.com.br/home/Bot" target="_blank" rel="noopener noreferrer" style={{color:G,textDecoration:'none'}} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color=G}>Bot</a></span>
      </footer>
    </div>
  );
}
