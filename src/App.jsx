import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase.js";

// ── Constants ──────────────────────────────────────────────────────────
const CATS = ['Raro Exclusivo','Mobi HC','Raro Rotativo','Raro Comum','Raro Colecionável','Ecotron','Raro Promocional'];
const CAT_C = {'Raro Exclusivo':'#ff6b35','Mobi HC':'#4dabf7','Raro Rotativo':'#69db7c','Raro Comum':'#aaa','Raro Colecionável':'#e599f7','Ecotron':'#63e6be','Raro Promocional':'#868e96'};
const G='#FFD700',G2='#CCA800',BG='#0a0804',BG2='#130f0a',BG3='#1a1208';

// ── Helpers ────────────────────────────────────────────────────────────
const fmtDate=s=>{if(!s)return'—';const p=String(s).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(s);};
const fmtTime=s=>{if(!s)return'';const d=new Date(s);return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const calcAvg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
const timeLeft=exp=>{const d=new Date(exp)-new Date();if(d<=0)return'Expirado';const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);return h>0?`${h}h ${m}m`:`${m}m`;};

// ── Micro-components ──────────────────────────────────────────────────
const Badge=({cat})=>{const c=CAT_C[cat]||'#aaa';return<span style={{background:c+'22',border:`1px solid ${c}55`,color:c,padding:'2px 8px',fontSize:'12px'}}>{cat}</span>;};

const Flash=({msg})=>{if(!msg?.text)return null;const m={error:{bg:'#1a0000',b:'#f44',t:'#f88'},success:{bg:'#001500',b:'#4f4',t:'#8f8'},info:{bg:'#1a1000',b:G,t:G}};const c=m[msg.type]||m.info;return<div style={{background:c.bg,borderBottom:`2px solid ${c.b}`,padding:'9px 24px',fontSize:'17px',color:c.t,textAlign:'center',fontFamily:"'VT323',monospace"}}>{msg.text}</div>;};

const ChartTip=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div style={{background:'#1a1208',border:`2px solid ${G}`,padding:'8px 14px',fontFamily:"'VT323',monospace"}}><div style={{color:'#887755',fontSize:'15px'}}>{fmtDate(label)}</div><div style={{color:G,fontFamily:"'Press Start 2P',monospace",fontSize:'12px'}}>{payload[0].value}c</div></div>;};

const Corners=()=><>{['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'10px',height:'10px',background:G,top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}</>;

const Img=({url,alt,size=36})=>(
  <div style={{width:size,height:size,flexShrink:0,border:`1px solid #2a1f0d`,background:BG,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
    {url?<img src={url} alt={alt} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#2a1f0d',fontSize:size*0.4}}>◈</span>}
  </div>
);

// ── Modal wrapper ─────────────────────────────────────────────────────
const Modal=({show,onClose,title,children,width='490px'})=>{
  if(!show)return null;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'16px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:BG2,border:`2px solid ${G}`,boxShadow:`8px 8px 0 #2a1800,0 0 40px ${G}11`,padding:'24px',width,maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',position:'relative',animation:'sd .2s ease'}}>
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
  // Painel
  const [pSearch,setPSearch]=useState('');
  const [pSort,setPSort]=useState('raro');
  const [pSortDir,setPSortDir]=useState('asc');
  // Orders
  const [orderFilter,setOrderFilter]=useState('todos');
  // Moderation
  const [modSearch,setModSearch]=useState('');
  const [chatModSearch,setChatModSearch]=useState('');
  const [viewUser,setViewUser]=useState('');
  const [viewUserData,setViewUserData]=useState(null);
  const [allUsers,setAllUsers]=useState([]);
  // Chat
  const [chatOpen,setChatOpen]=useState(false);
  const [chatInput,setChatInput]=useState('');
  const chatRef=useRef(null);
  // Modals
  const [showTM,setShowTM]=useState(false);
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
  const today=new Date().toISOString().split('T')[0];
  const eT={raro:'',quantidade:1,categoria:'Raro Exclusivo',precoVenda:'',data:today,vendedor:'',comprador:''};
  const eO={raro:'',quantidade:1,tipo:'compra',precoTotal:'',precoPorUnidade:'',data:today,priceMode:'total'};
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
    `;
    document.head.appendChild(s);
    const su=localStorage.getItem('tt-user');
    if(su){const u=JSON.parse(su);setUser(u);loadAll(u.username);setScreen('dashboard');}
    else setScreen('login');
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
      if(tR?.data)setTrades(tR.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por})));
      if(rR?.data)setRarities(rR.data);
      if(pR?.data)setPortfolio(pR.data.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade:x.preco_por_unidade})));
      if(oR?.data)setOrders(oR.data);
      if(rest[0]?.data)setPendingTrades(rest[0].data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por})));
      setUser(prev=>prev?{...prev,is_admin:isAdm}:prev);
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
    const {data}=await supabase.from('users').select('id,username,is_admin').order('username',{ascending:true});
    if(data)setAllUsers(data);
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
  async function doLogin(){
    if(!lF.u||!lF.p){flash('Preencha todos os campos.','error');return;}
    setLoading(true);
    const {data,error}=await supabase.from('users').select('*').eq('username',lF.u).eq('password',lF.p).maybeSingle();
    setLoading(false);
    if(error||!data){flash('Usuário ou senha incorretos.','error');return;}
    setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
    try{await loadAll(data.username);}catch(e){console.warn(e);}
    setLF({u:'',p:''});setScreen('dashboard');
  }

  async function doRegister(){
    if(!rF.u.trim()||!rF.p){flash('Preencha todos os campos.','error');return;}
    if(rF.p!==rF.c){flash('As senhas não conferem.','error');return;}
    if(rF.p.length<4){flash('Senha mínima: 4 chars.','error');return;}
    setLoading(true);
    const {data:ex}=await supabase.from('users').select('id').eq('username',rF.u.trim()).maybeSingle();
    if(ex){setLoading(false);flash('Usuário já existe.','error');return;}
    const {data,error}=await supabase.from('users').insert({username:rF.u.trim(),password:rF.p}).select().single();
    setLoading(false);
    if(error||!data){flash('Erro ao criar conta.','error');return;}
    setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
    try{await loadAll(data.username);}catch(e){console.warn(e);}
    setRF({u:'',p:'',c:''});setScreen('dashboard');flash('Bem-vindo(a)!','success');
  }

  function doLogout(){setUser(null);setSelRaro(null);setTrades([]);setPortfolio([]);setRarities([]);setOrders([]);setMessages([]);localStorage.removeItem('tt-user');setScreen('login');}

  // ── Trades ─────────────────────────────────────────────────────────
  async function doAddTrade(){
    if(!tF.raro.trim()||!tF.precoVenda||!tF.vendedor.trim()||!tF.comprador.trim()||!tF.data){flash('Preencha todos os campos (*).','error');return;}
    const qtd=Math.max(1,parseInt(tF.quantidade)||1),pv=parseFloat(tF.precoVenda);
    if(isNaN(pv)||pv<0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {data,error}=await supabase.from('trades').insert({raro:tF.raro.trim(),quantidade:qtd,categoria:tF.categoria,preco_venda:pv,preco_por_unidade:Math.round(pv/qtd),data:tF.data,vendedor:tF.vendedor.trim(),comprador:tF.comprador.trim(),lancado_por:user.username,status:'pending'}).select().single();
    setLoading(false);
    if(error||!data){flash('Erro ao salvar.','error');return;}
    await loadAll();setShowTM(false);setTF(eT);
    flash(user.is_admin?'Registrada!':'Enviada para aprovação ⏳','success');
  }

  // ── Portfolio ──────────────────────────────────────────────────────
  async function doAddOp(){
    const qtd=Math.max(1,parseInt(oF.quantidade)||1);
    let pt,ppu;
    if(oF.priceMode==='total'){pt=parseFloat(oF.precoTotal);ppu=pt>=0?Math.round(pt/qtd):0;}
    else{ppu=parseFloat(oF.precoPorUnidade);pt=ppu*qtd;}
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
    setOF({...oF,priceMode:'unit',precoPorUnidade:String(pc),precoTotal:String(pc*qtd)});
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
  function openEditTrade(t){setEditingTrade({id:t.id,raro:t.raro,quantidade:t.quantidade,categoria:t.categoria||'Raro Exclusivo',precoVenda:t.preco_venda||t.precoVenda,data:t.data,vendedor:t.vendedor,comprador:t.comprador});setShowEditModal(true);}
  async function doEditTrade(){
    const qtd=Math.max(1,parseInt(editingTrade.quantidade)||1),pv=parseFloat(editingTrade.precoVenda);
    if(isNaN(pv)||pv<0){flash('Preço inválido.','error');return;}
    setLoading(true);
    await supabase.from('trades').update({raro:editingTrade.raro.trim(),quantidade:qtd,categoria:editingTrade.categoria,preco_venda:pv,preco_por_unidade:Math.round(pv/qtd),data:editingTrade.data,vendedor:editingTrade.vendedor.trim(),comprador:editingTrade.comprador.trim()}).eq('id',editingTrade.id);
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
  const uRaros=useMemo(()=>{
    const map={};
    rarities.forEach(r=>{map[r.raro]={raro:r.raro,categoria:r.categoria||'Outros',items:[]};});
    trades.forEach(t=>{if(!map[t.raro])map[t.raro]={raro:t.raro,categoria:t.categoria,items:[]};map[t.raro].items.push(t);});
    return Object.values(map).map(r=>{
      if(!r.items.length)return{...r,lastDate:null,avgPrice:0,lastPrice:0,count:0,trend:0};
      const s=[...r.items].sort((a,b)=>b.data.localeCompare(a.data));
      const l10=s.slice(0,10),avg10=calcAvg(l10.map(t=>t.precoPorUnidade));
      const r5=s.slice(0,Math.min(5,s.length)),r5b=s.slice(Math.min(5,s.length),10);
      return{...r,lastDate:s[0].data,avgPrice:avg10,lastPrice:s[0].precoPorUnidade,count:r.items.length,trend:r5b.length?calcAvg(r5.map(t=>t.precoPorUnidade))-calcAvg(r5b.map(t=>t.precoPorUnidade)):0};
    }).sort((a,b)=>{if(a.lastDate&&!b.lastDate)return -1;if(!a.lastDate&&b.lastDate)return 1;if(a.lastDate&&b.lastDate)return b.lastDate.localeCompare(a.lastDate);return a.raro.localeCompare(b.raro);});
  },[trades,rarities]);

  const filtered=useMemo(()=>{const s=search.toLowerCase();return s?uRaros.filter(r=>r.raro.toLowerCase().includes(s)||r.categoria.toLowerCase().includes(s)):uRaros;},[uRaros,search]);
  const selInfo=useMemo(()=>selRaro?uRaros.find(r=>r.raro===selRaro):null,[uRaros,selRaro]);
  const selCatalog=useMemo(()=>selRaro?rarities.find(r=>r.raro===selRaro):null,[rarities,selRaro]);
  const quickCatalog=useMemo(()=>quickRaro?rarities.find(r=>r.raro===quickRaro):null,[rarities,quickRaro]);
  const quickInfo=useMemo(()=>quickRaro?uRaros.find(r=>r.raro===quickRaro):null,[uRaros,quickRaro]);
  const selTrades=useMemo(()=>selRaro?[...trades.filter(t=>t.raro===selRaro)].sort((a,b)=>b.data.localeCompare(a.data)):[],[trades,selRaro]);
  const chartData=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]=[];by[t.data].push(t.precoPorUnidade);});return Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,ps])=>({date,preco:calcAvg(ps)}));},[selTrades]);
  const dailyAvg=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]=[];by[t.data].push(t.precoPorUnidade);});return Object.entries(by).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,ps])=>({date,avg:calcAvg(ps),count:ps.length}));},[selTrades]);

  const pStats=useMemo(()=>{
    const map={};
    portfolio.forEach(op=>{if(!map[op.raro])map[op.raro]={raro:op.raro,c:[],v:[]};map[op.raro][op.tipo==='compra'?'c':'v'].push(op);});
    return Object.values(map).map(item=>{
      const qC=item.c.reduce((s,o)=>s+o.quantidade,0),qV=item.v.reduce((s,o)=>s+o.quantidade,0);
      const inv=item.c.reduce((s,o)=>s+o.precoTotal,0),rec=item.v.reduce((s,o)=>s+o.precoTotal,0);
      const custo=qC?Math.round(inv/qC):0,pMV=qV?Math.round(rec/qV):0;
      return{raro:item.raro,comprados:qC,vendidos:qV,estoque:qC-qV,custo,investido:inv,vendido:rec,lucroMed:pMV-custo,lucro:Math.round(rec-(qV*custo))};
    });
  },[portfolio]);

  const filteredPStats=useMemo(()=>{
    let r=[...pStats];
    if(pSearch)r=r.filter(i=>i.raro.toLowerCase().includes(pSearch.toLowerCase()));
    const numSort=(key)=>(a,b)=>pSortDir==='desc'?b[key]-a[key]:a[key]-b[key];
    const strSort=(a,b)=>pSortDir==='desc'?b.raro.localeCompare(a.raro):a.raro.localeCompare(b.raro);
    const sorts={raro:strSort,estoque:numSort('estoque'),investido:numSort('investido'),lucro:numSort('lucro'),comprados:numSort('comprados'),vendidos:numSort('vendidos'),vendido:numSort('vendido'),custo:numSort('custo')};
    return r.sort(sorts[pSort]||strSort);
  },[pStats,pSearch,pSort,pSortDir]);

  const totals=useMemo(()=>{
    const inv=pStats.reduce((s,i)=>s+i.investido,0),rec=pStats.reduce((s,i)=>s+i.vendido,0),parado=pStats.reduce((s,i)=>s+(i.estoque*i.custo),0);
    const lucroTotal=pStats.reduce((s,i)=>s+i.lucro,0);
    // Margem: avg(preco_venda/max(preco_compra,1)) for items with sales
    const comVendas=pStats.filter(i=>i.vendidos>0);
    const margem=comVendas.length?Math.round((comVendas.reduce((s,i)=>{
      const avgV=i.vendido/i.vendidos,avgC=i.custo>0?i.custo:1;
      return s+(avgV/avgC);
    },0)/comVendas.length-1)*100):0;
    return{inv,rec,parado,balanco:rec-inv,lucroTotal,margem,comVendas:comVendas.length};
  },[pStats]);

  const filteredOrders=useMemo(()=>orderFilter==='todos'?orders:orders.filter(o=>o.tipo===orderFilter),[orders,orderFilter]);

  // ── Style primitives ───────────────────────────────────────────────
  const secHdr={fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:G,padding:'10px 16px',background:`linear-gradient(135deg,${BG3},${BG2})`,borderBottom:`1px solid #2a1800`,letterSpacing:'1px',display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:`4px solid ${G2}`};
  const card={background:BG2,border:`1px solid #2a1800`,borderLeft:`3px solid ${G2}`,boxShadow:`3px 3px 12px rgba(0,0,0,.6)`};
  const inp={background:'#080500',border:`1px solid #2a1800`,color:G,padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace",colorScheme:'dark'};
  const sel={background:'#080500',border:`1px solid #2a1800`,color:G,padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace"};
  const btnY={background:G,border:`2px solid ${G2}`,color:'#000',padding:'8px 18px',fontSize:'19px',fontFamily:"'VT323',monospace",cursor:'pointer',boxShadow:`3px 3px 0 #664400`,fontWeight:'bold',transition:'all .1s',letterSpacing:'1px'};
  const btnD={background:BG3,border:`1px solid ${G}`,color:G,padding:'8px 16px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  const btnG={background:'transparent',border:`1px solid #2a1800`,color:'#664400',padding:'8px 14px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer'};
  const btnGreen={background:'#002200',border:'2px solid #4f4',color:'#4f4',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  const btnRed={background:'#220000',border:'2px solid #f44',color:'#f44',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all .1s'};
  const th={background:`linear-gradient(135deg,#1a1000,#0f0800)`,color:G,padding:'9px 12px',textAlign:'left',borderBottom:`1px solid #2a1800`,fontFamily:"'Press Start 2P',monospace",fontSize:'8px',letterSpacing:'.5px',whiteSpace:'nowrap'};
  const td={padding:'8px 12px',borderBottom:`1px solid #160a00`,color:'#c8a870',whiteSpace:'nowrap'};
  const lbl={display:'block',color:'#886633',fontSize:'14px',marginBottom:'5px'};

  // ── Loading ────────────────────────────────────────────────────────
  if(screen==='loading')return<div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'Press Start 2P',monospace",fontSize:'14px',color:G,textShadow:`2px 2px 0 #664400`}} className="blink">◈ TURVA TRADER ◈</span></div>;

  // ── Auth ───────────────────────────────────────────────────────────
  if(screen==='login'||screen==='register'){
    const isL=screen==='login';
    return(
      <div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',backgroundImage:`radial-gradient(ellipse at center,#1a1000 0%,${BG} 70%)`}}>
        <div style={{position:'fixed',inset:0,backgroundImage:`linear-gradient(${G}06 1px,transparent 1px),linear-gradient(90deg,${G}06 1px,transparent 1px)`,backgroundSize:'48px 48px',pointerEvents:'none'}}/>
        <div style={{textAlign:'center',marginBottom:'28px',position:'relative',zIndex:1}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'18px',color:G,textShadow:`3px 3px 0 #664400,0 0 30px ${G}44`,marginBottom:'8px'}}>◈ TURVA TRADER ◈</div>
          <div style={{color:'#3a2a10',fontSize:'16px',letterSpacing:'3px'}}>◆ MERCADO DE RAROS DO TURVA ◆</div>
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
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#3a2a10'}}>Sem conta? <span style={{color:G,cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('register');setMsg({text:'',type:'info'});}}>Criar agora</span></div>
          </>):(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','mín. 4 chars'],['CONFIRMAR','c','password','repita']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'13px'}}><label style={lbl}>{l}</label><input className="inp" style={inp} type={t} placeholder={ph} value={rF[k]} onChange={e=>setRF({...rF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doRegister()}/></div>
            ))}
            <button style={{...btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?0.6:1}} onClick={doRegister} disabled={loading}>{loading?'AGUARDE...':'CRIAR CONTA →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#3a2a10'}}>Já tem conta? <span style={{color:G,cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('login');setMsg({text:'',type:'info'});}}>Entrar</span></div>
          </>)}
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────
  const tabs=[['mercado','⚔ MERCADO'],['painel','📊 MEU PAINEL'],['negocios','🤝 NEGOCIAÇÕES'],...(user?.is_admin?[['mod','🛡 MODERAÇÃO']]:[])] ;

  return(
    <div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',color:'#c8a870',fontSize:'18px'}}>
      {/* ── Header ── */}
      <header style={{background:`linear-gradient(to bottom,#1a1000,#0d0800)`,borderBottom:`3px solid ${G}`,display:'flex',alignItems:'stretch',height:'54px',position:'sticky',top:0,zIndex:100,boxShadow:`0 4px 20px rgba(0,0,0,.9)`}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'11px',color:G,textShadow:`2px 2px 0 #664400,0 0 20px ${G}44`,padding:'0 18px',display:'flex',alignItems:'center',borderRight:`2px solid #2a1800`,gap:'8px',flexShrink:0}}>
          <span style={{fontSize:'18px'}}>🏆</span> TURVA TRADER
        </div>
        {tabs.map(([id,label])=>(
          <button key={id} className={`tab-btn ${tab===id?'tab-a':'tab-i'}`}
            style={{padding:'0 16px',fontSize:'12px',fontFamily:"'Press Start 2P',monospace",cursor:'pointer',border:'none',borderRight:`1px solid #1a1000`,borderBottom:'3px solid transparent',transition:'all .15s',background:'transparent',color:'#4a3010',letterSpacing:'.3px',...(id==='mod'&&pendingTrades.length>0?{color:'#ff6b6b'}:{})}}
            onClick={()=>setTab(id)}>
            {label}{id==='mod'&&pendingTrades.length>0&&<span style={{marginLeft:'6px',background:'#f44',color:'#fff',padding:'0 5px',fontSize:'12px',fontFamily:"'VT323',monospace"}}>{pendingTrades.length}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px'}}>
          <span style={{color:'#4a3010',fontSize:'16px'}}>◈ <span style={{color:G}}>{user?.username}</span></span>
          {tab==='mercado'&&<button style={{...btnD,fontSize:'16px',padding:'5px 12px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro||'',categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR</button>}
          {tab==='painel'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onClick={()=>setShowOM(true)}>+ OPERAÇÃO</button>}
          {tab==='negocios'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onClick={()=>{setEditingOrder(null);setOrderForm(eOrder);setShowOrderModal(true);}}>+ NOVA ORDEM</button>}
          <button style={{...btnG,fontSize:'16px',padding:'5px 10px'}} onClick={doLogout}>SAIR</button>
        </div>
      </header>
      <Flash msg={msg}/>

      {/* ══ MERCADO ══ */}
      {tab==='mercado'&&(
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px solid #2a1800',borderLeft:`4px solid ${G}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:'14px',flexShrink:0}}>
            <span style={{fontSize:'20px'}}>⚔</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>MERCADO DE RAROS</div><div style={{color:'#886633',fontSize:'15px'}}>Veja negociações e preços médios dos raros do Turva. Clique em um raro para ver histórico, gráfico de preços e dados do catálogo. Use ℹ para visão rápida.</div></div>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          {/* Sidebar toggle */}
          <button onClick={()=>setSidebarOpen(p=>!p)} style={{position:'absolute',left:sidebarOpen?'254px':'0',top:'64px',zIndex:50,background:BG3,border:`1px solid ${G2}`,borderLeft:'none',color:G,padding:'12px 4px',cursor:'pointer',fontFamily:"'VT323',monospace",fontSize:'18px',transition:'left .2s',writingMode:'vertical-rl'}}>
            {sidebarOpen?'◀ fechar':'▶ raros'}
          </button>

          {/* Sidebar */}
          {sidebarOpen&&(
            <div style={{width:'256px',borderRight:`2px solid #2a1800`,overflow:'auto',background:'#080500',flexShrink:0}}>
              <div style={{padding:'10px',borderBottom:`1px solid #1a1000`}}>
                <input className="inp" style={inp} placeholder="🔍 Buscar raro..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div style={{...secHdr,fontSize:'8px'}}>{filtered.length} RAROS CADASTRADOS</div>
              {filtered.map(item=>{
                const sel=selRaro===item.raro;
                const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;
                return(
                  <div key={item.raro} className={`ch ${sel?'cs':''}`} onClick={()=>{setSelRaro(item.raro);setSearch('');}} style={{padding:'10px 12px',borderBottom:`1px solid #110800`,borderLeft:`3px solid ${sel?G:'transparent'}`,transition:'all .1s',cursor:'pointer',display:'flex',gap:'10px',alignItems:'center'}}>
                    <Img url={img} alt={item.raro} size={34}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                        <div style={{color:sel?G:'#c8a870',fontSize:'16px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginRight:'4px'}}>{item.raro}</div>
                        <div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.count?G:'#3a2a10',flexShrink:0}}>{item.count?`${item.avgPrice}c`:'novo'}{item.trend>0&&<span style={{color:'#69db7c',fontSize:'9px'}}>▲</span>}{item.trend<0&&<span style={{color:'#f66',fontSize:'9px'}}>▼</span>}</div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><Badge cat={item.categoria}/><span style={{color:'#3a2a10'}}>{item.count} neg.</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main */}
          <div style={{flex:1,overflow:'auto',padding:'18px',background:'#090600'}}>
            {!selRaro?(
              <div>
                <div style={secHdr}>◆ TODOS OS RAROS — VISÃO GERAL <span style={{color:'#664400',fontSize:'12px',fontFamily:"'VT323',monospace"}}>clique para ver detalhes</span></div>
                <div style={{...card,overflowX:'auto',padding:0}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>{['','RARO','CATEGORIA','MÉDIA ÚLT.10','ÚLTIMO','NEG.','ÚLTIMA NEG.',''].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {uRaros.map((item,i)=>{
                        const cat=rarities.find(r=>r.raro===item.raro);
                        return(
                          <tr key={item.raro} className="rrow" style={{background:i%2===0?'#0d0800':'#0a0600',cursor:'pointer'}}>
                            <td style={{...td,width:'44px',padding:'4px 8px'}} onClick={()=>setSelRaro(item.raro)}><Img url={cat?.imagem_url} alt={item.raro} size={34}/></td>
                            <td style={{...td,color:G,fontWeight:'bold'}} onClick={()=>setSelRaro(item.raro)}>{item.raro}</td>
                            <td style={td} onClick={()=>setSelRaro(item.raro)}><Badge cat={item.categoria}/></td>
                            <td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'13px',color:item.count?G:'#3a2a10'}} onClick={()=>setSelRaro(item.raro)}>{item.count?`${item.avgPrice}c`:'—'}</td>
                            <td style={{...td,color:'#aa8855'}} onClick={()=>setSelRaro(item.raro)}>{item.count?`${item.lastPrice}c`:'—'}</td>
                            <td style={{...td,color:'#664400'}} onClick={()=>setSelRaro(item.raro)}>{item.count}</td>
                            <td style={{...td,color:'#4a3010'}} onClick={()=>setSelRaro(item.raro)}>{item.lastDate?fmtDate(item.lastDate):'—'}</td>
                            <td style={td}>
                              <button style={{...btnD,padding:'4px 10px',fontSize:'16px'}} onClick={e=>{e.stopPropagation();setQuickRaro(item.raro);}}>ℹ</button>
                            </td>
                          </tr>
                        );
                      })}
                      {!uRaros.length&&<tr><td colSpan={8} style={{...td,textAlign:'center',color:'#2a1800',padding:'56px'}}>Nenhum raro cadastrado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ):(
              <div className="anim">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
                  <div>
                    <button style={{...btnG,fontSize:'15px',padding:'4px 10px',marginBottom:'8px'}} onClick={()=>setSelRaro(null)}>← voltar</button>
                    <div style={{fontFamily:"'Press Start 2P'",fontSize:'14px',color:G,marginBottom:'8px',textShadow:`2px 2px 0 #443300`}}>{selRaro}</div>
                    <Badge cat={selInfo?.categoria||''}/>
                  </div>
                  <button style={{...btnD,padding:'7px 14px',fontSize:'17px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro,categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR NEG.</button>
                </div>

                {selCatalog&&(
                  <div style={{...card,padding:'14px 18px',marginBottom:'16px',display:'flex',gap:'20px',flexWrap:'wrap',alignItems:'center'}}>
                    {selCatalog.imagem_url&&<Img url={selCatalog.imagem_url} alt={selRaro} size={90}/>}
                    <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#4a3010',letterSpacing:'1px'}}>CATÁLOGO</div>
                      {selCatalog.preco_catalogo>=0&&<div><div style={{fontSize:'13px',color:'#664400',marginBottom:'2px'}}>PREÇO DE LANÇAMENTO</div><div style={{color:'#e599f7',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.preco_catalogo}c</div></div>}
                      {selCatalog.pixels>=0&&selCatalog.pixels!==null&&<div><div style={{fontSize:'13px',color:'#664400',marginBottom:'2px'}}>PIXELS</div><div style={{color:'#63e6be',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.pixels}px</div></div>}
                      {selCatalog.data_lancamento&&['Raro Exclusivo','Raro Rotativo','Raro Colecionável'].includes(selCatalog.categoria)&&<div><div style={{fontSize:'13px',color:'#664400',marginBottom:'2px'}}>LANÇAMENTO</div><div style={{color:G,fontSize:'18px'}}>{fmtDate(selCatalog.data_lancamento)}</div></div>}
                    </div>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'16px'}}>
                  {[{l:'MÉDIA ÚLT.10',v:`${selInfo?.avgPrice||0}c`,hi:true},{l:'ÚLTIMO PREÇO',v:`${selInfo?.lastPrice||0}c`},{l:'NEGOCIAÇÕES',v:String(selInfo?.count||0)},{l:'ÚLTIMA NEG.',v:fmtDate(selInfo?.lastDate)}].map(s=>(
                    <div key={s.l} style={{...card,padding:'12px',textAlign:'center',border:s.hi?`2px solid ${G}`:'1px solid #2a1800',boxShadow:s.hi?`3px 3px 0 #443300`:'3px 3px 12px rgba(0,0,0,.6)'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',marginBottom:'8px'}}>{s.l}</div>
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
                          <XAxis dataKey="date" tickFormatter={v=>fmtDate(v)} tick={{fill:'#4a3010',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#2a1800'}} tickLine={false}/>
                          <YAxis tick={{fill:'#4a3010',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#2a1800'}} tickLine={false} width={55}/>
                          <Tooltip content={<ChartTip/>}/>
                          <Line type="monotone" dataKey="preco" stroke={G} strokeWidth={2.5} dot={{fill:G,r:4,strokeWidth:0}} activeDot={{r:6,fill:'#fff',stroke:G,strokeWidth:2}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div style={{...card,marginBottom:'16px',padding:0}}>
                  <div style={secHdr}>◆ MÉDIA POR DIA</div>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>{['DATA','NEG.','MÉDIA/UN'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{dailyAvg.map((row,i)=>(
                      <tr key={row.date} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                        <td style={{...td,color:'#7a5a30'}}>{fmtDate(row.date)}</td>
                        <td style={{...td,color:'#664400'}}>{row.count}</td>
                        <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{row.avg}c</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>

                <div style={{...card,padding:0}}>
                  <div style={secHdr}>◆ HISTÓRICO COMPLETO</div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                      <thead><tr>{['DATA','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO POR'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {!selTrades.length&&<tr><td colSpan={7} style={{...td,textAlign:'center',color:'#2a1800',padding:'32px'}}>Sem negociações.</td></tr>}
                        {selTrades.map((t,i)=>(
                          <tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                            <td style={{...td,color:'#6a4a20'}}>{fmtDate(t.data)}</td>
                            <td style={{...td,color:'#7a5a30'}}>{t.quantidade}</td>
                            <td style={{...td,color:'#aa8855'}}>{t.precoVenda}c</td>
                            <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                            <td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
                            <td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
                            <td style={{...td,color:'#4a3010',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ══ MEU PAINEL ══ */}
      {tab==='painel'&&(
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px solid #2a1800',borderLeft:`4px solid ${G}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:'14px',flexShrink:0}}>
            <span style={{fontSize:'20px'}}>📊</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>MEU PAINEL</div><div style={{color:'#886633',fontSize:'15px'}}>Registre compras e vendas e saiba seu patrimônio em raros. Acompanhe lucro/prejuízo, capital parado e taxa de acerto — um gerenciador de carteira completo!</div></div>
          </div>
          <div style={{overflow:'auto',flex:1,padding:'18px',background:'#090600'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px',marginBottom:'18px'}}>
            {[
              {l:'BALANÇO ATUAL',v:`${totals.balanco>=0?'+':''}${totals.balanco}c`,sub:totals.balanco>=0?'lucro acumulado':'prejuízo acumulado',color:totals.balanco>=0?'#69db7c':'#f66'},
              {l:'LUCRO TOTAL',v:`${totals.lucroTotal>=0?'+':''}${totals.lucroTotal}c`,sub:'das vendas realizadas',color:totals.lucroTotal>=0?'#63e6be':'#ff8855'},
              {l:'CAPITAL INVESTIDO',v:`${totals.inv}c`,sub:'total comprado',color:'#7bb8ff'},
              {l:'CAPITAL PARADO',v:`${totals.parado}c`,sub:'em estoque',color:G},
              {l:'MARGEM DE LUCRO',v:totals.comVendas?`${totals.margem>=0?'+':''}${totals.margem}%`:'—',sub:totals.comVendas?`média em ${totals.comVendas} raro(s) c/ venda`:'nenhuma venda ainda',color:totals.margem>=0?'#e599f7':'#ff8855'},
            ].map(s=>(
              <div key={s.l} style={{...card,padding:'14px 18px',border:`1px solid ${s.color}33`,boxShadow:`3px 3px 0 ${s.color}11`}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',marginBottom:'8px',letterSpacing:'1px'}}>{s.l}</div>
                <div style={{color:s.color,fontSize:'26px',marginBottom:'4px',fontWeight:'bold'}}>{s.v}</div>
                <div style={{color:'#4a3010',fontSize:'15px'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{...card,padding:0}}>
            <div style={secHdr}>
              <span>◆ RESUMO POR RARO — {filteredPStats.length} itens</span>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <input className="inp" style={{...inp,width:'130px',padding:'4px 10px',fontSize:'16px'}} placeholder="buscar..." value={pSearch} onChange={e=>setPSearch(e.target.value)}/>
                {(pSort!=='raro'||pSortDir!=='asc'||pSearch)&&(
                  <button style={{...btnG,fontSize:'15px',padding:'4px 10px',color:'#aa8855',borderColor:'#664400'}} onClick={()=>{setPSort('raro');setPSortDir('asc');setPSearch('');}}>✕ limpar</button>
                )}
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>
                  {[['',''],['RARO','raro'],['COMPRADOS','comprados'],['VENDIDOS','vendidos'],['ESTOQUE','estoque'],['CUSTO MÉD','custo'],['INVESTIDO','investido'],['VENDIDO','vendido'],['LUCRO','lucro'],['','']].map(([label,col])=>(
                    <th key={label||col} style={{...th,...(col?{cursor:'pointer',userSelect:'none'}:{})}}
                      onClick={()=>{if(!col)return;if(pSort===col)setPSortDir(d=>d==='asc'?'desc':'asc');else{setPSort(col);setPSortDir('desc');}}}>
                      {label}{col&&pSort===col?<span style={{marginLeft:'4px',color:G}}>{pSortDir==='desc'?'▼':'▲'}</span>:<span style={{marginLeft:'4px',color:'#3a2a10',fontSize:'9px'}}>{col?'⇅':''}</span>}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {!filteredPStats.length&&<tr><td colSpan={10} style={{...td,textAlign:'center',color:'#2a1800',padding:'32px',fontSize:'16px'}}>Use <span style={{color:G}}>+ OPERAÇÃO</span> para registrar.</td></tr>}
                  {filteredPStats.map((item,i)=>{
                    const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;
                    return(
                    <tr key={item.raro} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                      <td style={{...td,width:'44px',padding:'4px 8px'}}><Img url={img} alt={item.raro} size={34}/></td>
                      <td style={{...td,color:G,fontWeight:'bold'}}>{item.raro}</td>
                      <td style={{...td,color:'#7bb8ff'}}>{item.comprados}</td>
                      <td style={{...td,color:'#7dffaa'}}>{item.vendidos}</td>
                      <td style={{...td,color:item.estoque>0?G:'#4a3010'}}>{item.estoque}</td>
                      <td style={{...td,color:'#aa8855'}}>{item.custo}c</td>
                      <td style={{...td,color:'#7bb8ff'}}>{item.investido}c</td>
                      <td style={{...td,color:'#7dffaa'}}>{item.vendido}c</td>
                      <td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.lucro>=0?'#69db7c':'#f66'}}>{item.lucro>=0?'+':''}{item.lucro}c</td>
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
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,marginBottom:'3px',letterSpacing:'1px'}}>NEGOCIAÇÕES</div><div style={{color:'#886633',fontSize:'15px'}}>Veja quem compra ou vende raros agora. Publique ordens com múltiplos itens — ativas por 72h e removidas automaticamente. Conecte-se com os traders do Turva!</div></div>
          </div>
          <div style={{overflow:'auto',flex:1,padding:'18px',background:'#090600'}}>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',alignItems:'center'}}>
            <span style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#4a3010',marginRight:'4px'}}>FILTRO:</span>
            {[['todos','TODOS'],['compra','COMPRO'],['venda','VENDO']].map(([v,l])=>(
              <button key={v} style={{...btnG,fontSize:'17px',padding:'6px 14px',...(orderFilter===v?{background:BG3,border:`1px solid ${G}`,color:G}:{})}} onClick={()=>setOrderFilter(v)}>{l}</button>
            ))}
            <span style={{color:'#3a2a10',fontSize:'16px',marginLeft:'8px'}}>{filteredOrders.length} ordens ativas</span>
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
                      <div style={{color:'#664400',fontSize:'15px',marginTop:'6px'}}>por <span style={{color:G}}>{order.username}</span></div>
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
                            <div style={{color:'#4a3010',fontSize:'15px'}}>Qtd: {it.quantidade}</div>
                          </div>
                          <div style={{fontFamily:"'Press Start 2P'",fontSize:'12px',color:G,flexShrink:0}}>{it.preco}c</div>
                        </div>
                      );
                    })}
                  </div>
                  {order.observacao&&<div style={{marginTop:'10px',color:'#664400',fontSize:'16px',fontStyle:'italic'}}>"{order.observacao}"</div>}
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
            ?<div style={{...card,padding:'20px',textAlign:'center',color:'#3a2a10',fontSize:'17px',marginBottom:'18px'}}>Nenhuma pendente ✅</div>
            :<div style={{...card,padding:0,marginBottom:'18px'}}>
              <div style={{...secHdr,color:'#f66'}}>◆ AGUARDANDO APROVAÇÃO — {pendingTrades.length}</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                  <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','ENVIADO','AÇÕES'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{pendingTrades.map((t,i)=>(
                    <tr key={t.id} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                      <td style={{...td,color:'#6a4a20'}}>{fmtDate(t.data)}</td>
                      <td style={{...td,color:G,fontWeight:'bold'}}>{t.raro}</td>
                      <td style={{...td,color:'#7a5a30'}}>{t.quantidade}</td>
                      <td style={{...td,color:'#aa8855'}}>{t.preco_venda}c</td>
                      <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.preco_por_unidade}c</td>
                      <td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
                      <td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
                      <td style={{...td,color:'#4a3010',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
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
                <tbody>{[...trades].filter(t=>!modSearch||t.raro.toLowerCase().includes(modSearch.toLowerCase())).sort((a,b)=>b.data.localeCompare(a.data)).map((t,i)=>(
                  <tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                    <td style={{...td,color:'#6a4a20'}}>{fmtDate(t.data)}</td>
                    <td style={{...td,color:G,fontWeight:'bold'}}>{t.raro}</td>
                    <td style={{...td,color:'#7a5a30'}}>{t.quantidade}</td>
                    <td style={{...td,color:'#aa8855'}}>{t.precoVenda}c</td>
                    <td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                    <td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
                    <td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
                    <td style={{...td,color:'#4a3010',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                    <td style={{...td,whiteSpace:'nowrap'}}>
                      <div style={{display:'flex',gap:'5px'}}>
                        <button style={{...btnD,padding:'4px 10px',fontSize:'17px'}} onMouseEnter={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background=BG3;e.currentTarget.style.color=G;}} onClick={()=>openEditTrade(t)}>✎</button>
                        <button style={btnRed} onMouseEnter={e=>{e.currentTarget.style.background='#f44';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#220000';e.currentTarget.style.color='#f44';}} onClick={()=>adminDeleteTrade(t.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          {/* Chat moderation */}
          <div style={{...card,padding:0,marginTop:'18px'}}>
            <div style={secHdr}>
              <span>◆ MODERAÇÃO DO CHAT — {messages.length} mensagens</span>
              <input className="inp" style={{...inp,width:'160px',padding:'4px 10px',fontSize:'16px'}} placeholder="filtrar usuário..." value={chatModSearch} onChange={e=>setChatModSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:'auto',maxHeight:'300px',overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['HORA','USUÁRIO','MENSAGEM',''].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...messages].filter(m=>!chatModSearch||m.username.toLowerCase().includes(chatModSearch.toLowerCase())).reverse().map((m,i)=>(
                    <tr key={m.id} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
                      <td style={{...td,color:'#4a3010',width:'60px'}}>{fmtTime(m.created_at)}</td>
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
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',marginBottom:'6px'}}>{s.l}</div>
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
                          <td style={{...td,color:'#aa8855'}}>{item.custo}c</td>
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
            {viewUser&&!viewUserData&&<div style={{padding:'20px',textAlign:'center',color:'#4a3010',fontSize:'16px'}}>Clique em "Ver painel" para carregar os dados.</div>}
          </div>
        </div>
      )}

      {/* ══ CHAT WIDGET ══ */}
      <div style={{position:'fixed',bottom:'32px',right:'20px',zIndex:200,width:'300px'}}>
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
              {!messages.length&&<div style={{color:'#3a2a10',fontSize:'16px',textAlign:'center',marginTop:'80px'}}>Nenhuma mensagem ainda.</div>}
              {messages.map(m=>{
                const isMe=m.username===user?.username;
                return(
                  <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
                    <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:isMe?G2:'#664400',marginBottom:'2px'}}>{m.username} <span style={{color:'#3a2a10',fontFamily:"'VT323',monospace",fontSize:'13px'}}>{fmtTime(m.created_at)}</span></div>
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
                  <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',marginBottom:'8px'}}>{s.l}</div>
                  <div style={{color:s.c,fontSize:'18px'}}>{s.v}</div>
                </div>
              ))}
            </div>
            {quickInfo?.count>0&&(
              <div style={{borderTop:`1px solid #1a1000`,paddingTop:'14px'}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#4a3010',marginBottom:'10px',letterSpacing:'1px'}}>DADOS DE MERCADO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                  {[{l:'MÉDIA ÚLT.10',v:`${quickInfo.avgPrice}c`,c:G},{l:'ÚLTIMO',v:`${quickInfo.lastPrice}c`,c:'#aa8855'},{l:'NEGOCIAÇÕES',v:String(quickInfo.count),c:'#664400'}].map(s=>(
                    <div key={s.l} style={{...card,padding:'10px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',marginBottom:'6px'}}>{s.l}</div>
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
          <div style={{textAlign:'center',padding:'32px',color:'#4a3010',fontSize:'17px'}}>Este raro não tem dados no catálogo ainda.</div>
        )}
      </Modal>

      {/* ══ MODALS ══ */}
      {/* Registrar Negociação */}
      <Modal show={showTM} onClose={()=>setShowTM(false)} title="◆ REGISTRAR NEGOCIAÇÃO">
        <Flash msg={msg}/>
        <div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input className="inp" style={inp} placeholder="ex: Holo Mano" value={tF.raro} onChange={e=>setTF({...tF,raro:e.target.value})} list="rl1"/><datalist id="rl1">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={tF.quantidade} onChange={e=>setTF({...tF,quantidade:e.target.value})}/></div>
          <div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={inp} type="number" min="0" placeholder="0" value={tF.precoVenda} onChange={e=>setTF({...tF,precoVenda:e.target.value})}/></div>
        </div>
        {tF.precoVenda!==''&&parseInt(tF.quantidade)>=1&&<div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12px',marginBottom:'13px',fontSize:'17px',color:'#886633',display:'flex',justifyContent:'space-between'}}><span>Preço por unidade:</span><span style={{color:G,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{Math.round(parseFloat(tF.precoVenda||0)/Math.max(1,parseInt(tF.quantidade)||1))}c</span></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} placeholder="nick" value={tF.vendedor} onChange={e=>setTF({...tF,vendedor:e.target.value})}/></div>
          <div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} placeholder="nick" value={tF.comprador} onChange={e=>setTF({...tF,comprador:e.target.value})}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
          <div><label style={lbl}>CATEGORIA *</label><select className="inp" style={sel} value={tF.categoria} onChange={e=>setTF({...tF,categoria:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={tF.data} onChange={e=>setTF({...tF,data:e.target.value})}/></div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={doAddTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
          <button style={btnG} onClick={()=>setShowTM(false)}>CANCELAR</button>
        </div>
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
              <span style={{cursor:'pointer',color:oF.priceMode==='total'?G:'#664400',textDecoration:'underline'}} onClick={()=>setOF({...oF,priceMode:'total'})}>TOTAL</span>
              <span style={{color:'#3a2a10',margin:'0 6px'}}>|</span>
              <span style={{cursor:'pointer',color:oF.priceMode==='unit'?G:'#664400',textDecoration:'underline'}} onClick={()=>setOF({...oF,priceMode:'unit'})}>POR UNIDADE</span>
            </label>
            {oF.priceMode==='total'
              ?<input className="inp" style={inp} type="number" min="0" placeholder="preço total (c)" value={oF.precoTotal} onChange={e=>setOF({...oF,precoTotal:e.target.value})}/>
              :<input className="inp" style={inp} type="number" min="0" placeholder="preço/un (c)" value={oF.precoPorUnidade} onChange={e=>setOF({...oF,precoPorUnidade:e.target.value})}/>
            }
          </div>
        </div>
        {/* Preview */}
        {(oF.precoTotal!==''||oF.precoPorUnidade!=='')&&parseInt(oF.quantidade)>=1&&(()=>{
          const qtd=Math.max(1,parseInt(oF.quantidade)||1);
          const pt=oF.priceMode==='total'?parseFloat(oF.precoTotal||0):parseFloat(oF.precoPorUnidade||0)*qtd;
          const ppu=oF.priceMode==='unit'?parseFloat(oF.precoPorUnidade||0):Math.round(pt/qtd);
          return<div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12px',marginBottom:'13px',fontSize:'16px',color:'#886633',display:'flex',justifyContent:'space-between'}}>
            <span>Total: <span style={{color:'#aa8855'}}>{pt===0?'0 (presente!)':Math.round(pt)}c</span></span>
            <span>Por un: <span style={{color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{ppu}c</span></span>
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
        <div style={{fontFamily:"'Press Start 2P'",fontSize:'9px',color:'#4a3010',marginBottom:'10px',letterSpacing:'1px'}}>RAROS</div>
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
        <div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12px',marginBottom:'18px',fontSize:'16px',color:'#4a3010'}}>
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
          <div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input className="inp" style={inp} value={editingTrade.raro} onChange={e=>setEditingTrade({...editingTrade,raro:e.target.value})} list="rl-edit"/><datalist id="rl-edit">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
            <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={editingTrade.quantidade} onChange={e=>setEditingTrade({...editingTrade,quantidade:e.target.value})}/></div>
            <div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={inp} type="number" min="0" value={editingTrade.precoVenda} onChange={e=>setEditingTrade({...editingTrade,precoVenda:e.target.value})}/></div>
          </div>
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

      {/* Footer */}
      <footer style={{position:'fixed',bottom:0,left:0,right:0,height:'32px',background:`linear-gradient(to right,${BG2},#0f0800)`,borderTop:`1px solid #2a1800`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',color:'#3a2a10',zIndex:99,fontFamily:"'VT323',monospace",letterSpacing:'1px'}}>
        Feito com amor por:{' '}<a href="http://turva.com.br/home/Bot" target="_blank" rel="noopener noreferrer" style={{color:G,textDecoration:'none',marginLeft:'5px'}} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color=G}>Bot</a>
      </footer>
    </div>
  );
}
