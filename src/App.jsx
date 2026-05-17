import { useState, useEffect, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase.js";

// ── Constants ─────────────────────────────────────────────────────────
const CATS = ['Raro Exclusivo','Mobi HC','Raro Rotativo','Raro Comum','Raro Colecionável','Ecotron','Outros'];
const CAT_COLORS = {'Raro Exclusivo':'#ff6b35','Mobi HC':'#4dabf7','Raro Rotativo':'#69db7c','Raro Comum':'#aaa','Raro Colecionável':'#e599f7','Ecotron':'#63e6be','Outros':'#868e96'};
const GOLD = '#FFD700'; const GOLD2 = '#CCA800'; const BG = '#080808'; const BG2 = '#111'; const BG3 = '#161616';

// ── Helpers ────────────────────────────────────────────────────────────
function fmtDate(s){if(!s)return'—';const p=String(s).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(s);}
function calcAvg(arr){return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;}
function timeLeft(exp){
  const d=new Date(exp)-new Date();
  if(d<=0)return'Expirado';
  const h=Math.floor(d/3600000),m=Math.floor((d%3600000)/60000);
  return h>0?`${h}h ${m}m`:`${m}m`;
}
function isExpired(exp){return new Date(exp)<new Date();}

// ── Small components ──────────────────────────────────────────────────
function Badge({cat}){const c=CAT_COLORS[cat]||'#aaa';return<span style={{background:c+'22',border:`1px solid ${c}44`,color:c,padding:'2px 8px',fontSize:'13px',borderRadius:'2px'}}>{cat}</span>;}

function Flash({msg}){
  if(!msg?.text)return null;
  const m={error:{bg:'#1a0000',b:'#ff4444',t:'#ff8888'},success:{bg:'#001a00',b:'#44ff44',t:'#88ff88'},info:{bg:'#1a1100',b:GOLD,t:GOLD}};
  const c=m[msg.type]||m.info;
  return<div style={{background:c.bg,borderBottom:`2px solid ${c.b}`,padding:'10px 24px',fontSize:'18px',color:c.t,textAlign:'center',fontFamily:"'VT323',monospace"}}>{msg.text}</div>;
}

function ChartTip({active,payload,label}){
  if(!active||!payload?.length)return null;
  return<div style={{background:'#1a1a1a',border:`2px solid ${GOLD}`,padding:'8px 14px',fontFamily:"'VT323',monospace"}}><div style={{color:'#aaa',fontSize:'16px',marginBottom:'2px'}}>{fmtDate(label)}</div><div style={{color:GOLD,fontFamily:"'Press Start 2P',monospace",fontSize:'13px'}}>{payload[0].value}c</div></div>;
}

function CornerPx(){return<>{['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'10px',height:'10px',background:GOLD,top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}</>;}

function Modal({show,onClose,title,children,width='490px'}){
  if(!show)return null;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'16px'}}>
      <div style={{background:BG2,border:`2px solid ${GOLD}`,boxShadow:`8px 8px 0 #332200`,padding:'24px',width,maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',position:'relative',animation:'sd 0.2s ease'}}>
        <CornerPx/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'10px',color:GOLD}}>{title}</div>
          <span style={{color:'#555',cursor:'pointer',fontSize:'24px',lineHeight:1}} onClick={onClose}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState('loading');
  const [tab,setTab]=useState('mercado');
  const [user,setUser]=useState(null);
  const [trades,setTrades]=useState([]);
  const [rarities,setRarities]=useState([]);
  const [portfolio,setPortfolio]=useState([]);
  const [orders,setOrders]=useState([]);
  const [pendingTrades,setPendingTrades]=useState([]);
  const [search,setSearch]=useState('');
  const [selRaro,setSelRaro]=useState(null);
  const [modSearch,setModSearch]=useState('');
  const [orderFilter,setOrderFilter]=useState('todos');
  // Modals
  const [showTM,setShowTM]=useState(false);
  const [showOM,setShowOM]=useState(false);
  const [showOrderModal,setShowOrderModal]=useState(false);
  const [showEditModal,setShowEditModal]=useState(false);
  const [showPEdit,setShowPEdit]=useState(false);
  const [editingTrade,setEditingTrade]=useState(null);
  const [editingP,setEditingP]=useState(null);
  const [editingOrder,setEditingOrder]=useState(null);
  // Messages
  const [msg,setMsg]=useState({text:'',type:'info'});
  const [loading,setLoading]=useState(false);
  // Forms
  const [lF,setLF]=useState({u:'',p:''});
  const [rF,setRF]=useState({u:'',p:'',c:''});
  const today=new Date().toISOString().split('T')[0];
  const eT={raro:'',quantidade:1,categoria:'Raro Exclusivo',precoVenda:'',data:today,vendedor:'',comprador:''};
  const eO={raro:'',quantidade:1,tipo:'compra',precoTotal:'',precoPorUnidade:'',data:today,priceMode:'total'};
  const eOrder={tipo:'compra',items:[{raro:'',quantidade:1,preco:''}],observacao:''};
  const [tF,setTF]=useState(eT);
  const [oF,setOF]=useState(eO);
  const [orderForm,setOrderForm]=useState(eOrder);

  // ── Global styles ──
  useEffect(()=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';document.head.appendChild(link);
    const style=document.createElement('style');
    style.textContent=`
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:${BG};overflow:hidden}
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:#111}
      ::-webkit-scrollbar-thumb{background:#333}
      ::-webkit-scrollbar-thumb:hover{background:${GOLD}}
      input,select,button,textarea{font-family:'VT323',monospace}
      @keyframes sd{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0.1}}
      .anim{animation:sd 0.22s ease}
      .blink{animation:blink 1.3s infinite}
      .rrow:hover{background:#1a1800!important;cursor:pointer}
      .ch:hover{border-left-color:${GOLD}!important;background:#141200!important;cursor:pointer}
      .cs{border-left-color:${GOLD}!important;background:#141200!important}
      .inp:focus{outline:none!important;border-color:${GOLD}!important}
      input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.8) sepia(1) saturate(5) hue-rotate(5deg);cursor:pointer}
      .tab-a{color:${GOLD}!important;border-bottom:3px solid ${GOLD}!important;background:#1a1600!important}
      .tab-i:hover{color:#aaa!important;background:#161400!important}
      .order-card:hover{border-color:#333!important}
    `;
    document.head.appendChild(style);
    const su=localStorage.getItem('tt-user');
    if(su){const u=JSON.parse(su);setUser(u);loadAll(u.username);setScreen('dashboard');}
    else setScreen('login');
  },[]);

  // ── Data loading ──
  async function loadAll(uname){
    const un=uname||user?.username;
    const {data:uData}=await supabase.from('users').select('is_admin').eq('username',un).maybeSingle();
    const isAdm=uData?.is_admin||false;
    const queries=[
      supabase.from('trades').select('*').eq('status','approved').order('data',{ascending:true}),
      supabase.from('rarities').select('*'),
      supabase.from('portfolio').select('*').eq('username',un).order('data',{ascending:false}),
      supabase.from('orders').select('*').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
    ];
    if(isAdm) queries.push(supabase.from('trades').select('*').eq('status','pending').order('created_at',{ascending:false}));
    const results=await Promise.all(queries);
    const [tR,rR,pR,oR,pendR]=results;
    if(tR.data)setTrades(tR.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por})));
    if(rR.data)setRarities(rR.data);
    if(pR.data)setPortfolio(pR.data.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade:x.preco_por_unidade})));
    if(oR.data)setOrders(oR.data);
    if(pendR?.data)setPendingTrades(pendR.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por})));
    setUser(prev=>prev?{...prev,is_admin:isAdm}:prev);
  }

  function flash(text,type='info'){setMsg({text,type});setTimeout(()=>setMsg({text:'',type:'info'}),3500);}

  // ── Auth ──
  async function doLogin(){
    if(!lF.u||!lF.p){flash('Preencha todos os campos.','error');return;}
    setLoading(true);
    const {data,error}=await supabase.from('users').select('*').eq('username',lF.u).eq('password',lF.p).maybeSingle();
    setLoading(false);
    if(error||!data){flash('Usuário ou senha incorretos.','error');return;}
    setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
    await loadAll(data.username);setLF({u:'',p:''});setScreen('dashboard');
  }

  async function doRegister(){
    if(!rF.u.trim()||!rF.p){flash('Preencha todos os campos.','error');return;}
    if(rF.p!==rF.c){flash('As senhas não conferem.','error');return;}
    if(rF.p.length<4){flash('Senha mínima: 4 caracteres.','error');return;}
    setLoading(true);
    const {data:ex}=await supabase.from('users').select('id').eq('username',rF.u.trim()).maybeSingle();
    if(ex){setLoading(false);flash('Usuário já existe.','error');return;}
    const {data,error}=await supabase.from('users').insert({username:rF.u.trim(),password:rF.p}).select().single();
    setLoading(false);
    if(error||!data){flash('Erro ao criar conta.','error');return;}
    setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
    await loadAll(data.username);setRF({u:'',p:'',c:''});setScreen('dashboard');flash('Conta criada!','success');
  }

  function doLogout(){setUser(null);setSelRaro(null);setTrades([]);setPortfolio([]);setRarities([]);setOrders([]);localStorage.removeItem('tt-user');setScreen('login');}

  // ── Trades (Mercado) ──
  async function doAddTrade(){
    if(!tF.raro.trim()||!tF.precoVenda||!tF.vendedor.trim()||!tF.comprador.trim()||!tF.data){flash('Preencha todos os campos (*).','error');return;}
    const qtd=Math.max(1,parseInt(tF.quantidade)||1),pv=parseFloat(tF.precoVenda);
    if(isNaN(pv)||pv<=0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {data,error}=await supabase.from('trades').insert({raro:tF.raro.trim(),quantidade:qtd,categoria:tF.categoria,preco_venda:pv,preco_por_unidade:Math.round(pv/qtd),data:tF.data,vendedor:tF.vendedor.trim(),comprador:tF.comprador.trim(),lancado_por:user.username,status:'pending'}).select().single();
    setLoading(false);
    if(error||!data){flash('Erro ao salvar.','error');return;}
    await loadAll();setShowTM(false);setTF(eT);
    flash(user.is_admin?'Negociação registrada!':'Enviada para aprovação! ⏳','success');
  }

  // ── Portfolio ──
  async function doAddOp(){
    const qtd=Math.max(1,parseInt(oF.quantidade)||1);
    let pt,ppu;
    if(oF.priceMode==='total'){
      pt=parseFloat(oF.precoTotal);ppu=Math.round(pt/qtd);
    } else {
      ppu=parseFloat(oF.precoPorUnidade);pt=ppu*qtd;
    }
    if(!oF.raro.trim()||!oF.data){flash('Preencha todos os campos (*).','error');return;}
    if(isNaN(pt)||pt<=0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {error}=await supabase.from('portfolio').insert({username:user.username,raro:oF.raro.trim(),quantidade:qtd,tipo:oF.tipo,preco_total:pt,preco_por_unidade:ppu,data:oF.data});
    setLoading(false);
    if(error){flash('Erro ao salvar.','error');return;}
    await loadAll();setShowOM(false);setOF(eO);flash(`${oF.tipo==='compra'?'Compra':'Venda'} registrada!`,'success');
  }

  function useCatalogPrice(){
    const cat=rarities.find(r=>r.raro===oF.raro);
    if(!cat||!cat.preco_catalogo){flash('Preço de catálogo não encontrado.','error');return;}
    const qtd=Math.max(1,parseInt(oF.quantidade)||1);
    setOF({...oF,priceMode:'unit',precoPorUnidade:String(cat.preco_catalogo),precoTotal:String(cat.preco_catalogo*qtd)});
    flash(`Preço do catálogo: ${cat.preco_catalogo}c por unidade`,'success');
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
    if(qtdC>0) await supabase.from('portfolio').insert({username:user.username,raro:editingP.raro,quantidade:qtdC,tipo:'compra',preco_total:invst,preco_por_unidade:qtdC?Math.round(invst/qtdC):0,data:today});
    if(qtdV>0) await supabase.from('portfolio').insert({username:user.username,raro:editingP.raro,quantidade:qtdV,tipo:'venda',preco_total:rec,preco_por_unidade:qtdV?Math.round(rec/qtdV):0,data:today});
    setLoading(false);await loadAll();setShowPEdit(false);setEditingP(null);flash('Dados atualizados!','success');
  }

  // ── Orders (Negociações) ──
  async function doSaveOrder(){
    const validItems=orderForm.items.filter(it=>it.raro.trim()&&parseInt(it.quantidade)>0&&parseFloat(it.preco)>=0);
    if(!validItems.length){flash('Adicione pelo menos 1 raro com quantidade e preço.','error');return;}
    setLoading(true);
    const payload={username:user.username,tipo:orderForm.tipo,items:validItems.map(it=>({raro:it.raro.trim(),quantidade:parseInt(it.quantidade),preco:parseFloat(it.preco)||0})),observacao:orderForm.observacao||null,expires_at:new Date(Date.now()+72*3600000).toISOString()};
    let error;
    if(editingOrder){
      ({error}=await supabase.from('orders').update(payload).eq('id',editingOrder.id));
    } else {
      ({error}=await supabase.from('orders').insert(payload));
    }
    setLoading(false);
    if(error){flash('Erro ao salvar ordem.','error');return;}
    await loadAll();setShowOrderModal(false);setOrderForm(eOrder);setEditingOrder(null);
    flash(editingOrder?'Ordem atualizada!':'Ordem publicada por 72 horas!','success');
  }

  function openEditOrder(order){
    setEditingOrder(order);
    setOrderForm({tipo:order.tipo,items:order.items.map(it=>({raro:it.raro,quantidade:it.quantidade,preco:it.preco})),observacao:order.observacao||''});
    setShowOrderModal(true);
  }

  async function deleteOrder(id){
    if(!window.confirm('Excluir esta ordem?'))return;
    await supabase.from('orders').delete().eq('id',id);
    await loadAll();flash('Ordem excluída.','info');
  }

  function addOrderItem(){setOrderForm({...orderForm,items:[...orderForm.items,{raro:'',quantidade:1,preco:''}]});}
  function removeOrderItem(i){setOrderForm({...orderForm,items:orderForm.items.filter((_,idx)=>idx!==i)});}
  function updateOrderItem(i,field,val){const its=[...orderForm.items];its[i]={...its[i],[field]:val};setOrderForm({...orderForm,items:its});}

  // ── Moderation ──
  async function approveTrade(id){await supabase.from('trades').update({status:'approved'}).eq('id',id);await loadAll();flash('Aprovada! ✅','success');}
  async function rejectTrade(id){if(!window.confirm('Rejeitar e excluir?'))return;await supabase.from('trades').delete().eq('id',id);await loadAll();flash('Rejeitada.','info');}
  async function adminDeleteTrade(id){if(!window.confirm('Excluir esta negociação?'))return;await supabase.from('trades').delete().eq('id',id);await loadAll();flash('Excluída.','info');}
  function openEditTrade(t){setEditingTrade({id:t.id,raro:t.raro,quantidade:t.quantidade,categoria:t.categoria||'Raro Exclusivo',precoVenda:t.preco_venda||t.precoVenda,data:t.data,vendedor:t.vendedor,comprador:t.comprador});setShowEditModal(true);}
  async function doEditTrade(){
    const qtd=Math.max(1,parseInt(editingTrade.quantidade)||1),pv=parseFloat(editingTrade.precoVenda);
    if(isNaN(pv)||pv<=0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {error}=await supabase.from('trades').update({raro:editingTrade.raro.trim(),quantidade:qtd,categoria:editingTrade.categoria,preco_venda:pv,preco_por_unidade:Math.round(pv/qtd),data:editingTrade.data,vendedor:editingTrade.vendedor.trim(),comprador:editingTrade.comprador.trim()}).eq('id',editingTrade.id);
    setLoading(false);
    if(error){flash('Erro ao salvar.','error');return;}
    await loadAll();setShowEditModal(false);setEditingTrade(null);flash('Atualizada!','success');
  }

  // ── Computed ──
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

  const totals=useMemo(()=>{
    const inv=pStats.reduce((s,i)=>s+i.investido,0),rec=pStats.reduce((s,i)=>s+i.vendido,0),parado=pStats.reduce((s,i)=>s+(i.estoque*i.custo),0);
    return{inv,rec,parado,balanco:rec-inv,taxa:pStats.length?Math.round(pStats.filter(i=>i.lucro>0).length/pStats.length*100):0};
  },[pStats]);

  const filteredOrders=useMemo(()=>orderFilter==='todos'?orders:orders.filter(o=>o.tipo===orderFilter),[orders,orderFilter]);

  // ── Styles ──
  const S={
    app:{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',color:'#e0e0e0',fontSize:'18px'},
    hdr:{background:'#0d0d0d',borderBottom:`3px solid ${GOLD}`,display:'flex',alignItems:'stretch',height:'56px',position:'sticky',top:0,zIndex:100,boxShadow:'0 4px 20px rgba(0,0,0,0.8)'},
    logo:{fontFamily:"'Press Start 2P',monospace",fontSize:'11px',color:GOLD,textShadow:`2px 2px 0 #664400`,padding:'0 18px',display:'flex',alignItems:'center',borderRight:'2px solid #1f1800',flexShrink:0,gap:'8px'},
    tab:{padding:'0 18px',fontSize:'12px',fontFamily:"'Press Start 2P',monospace",cursor:'pointer',border:'none',borderRight:'1px solid #1a1200',borderBottom:'3px solid transparent',transition:'all 0.15s',background:'transparent',color:'#444',letterSpacing:'0.3px'},
    card:{background:BG2,border:'1px solid #222',borderLeft:`3px solid ${GOLD}`,boxShadow:'2px 2px 8px rgba(0,0,0,0.5)'},
    secHdr:{fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:GOLD,padding:'10px 16px',background:'#0d0d0d',borderBottom:'1px solid #222',letterSpacing:'1px',display:'flex',justifyContent:'space-between',alignItems:'center'},
    inp:{background:'#0a0a0a',border:'1px solid #2a2a2a',color:GOLD,padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace",colorScheme:'dark'},
    sel:{background:'#0a0a0a',border:'1px solid #2a2a2a',color:GOLD,padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace"},
    btnY:{background:GOLD,border:`2px solid ${GOLD2}`,color:'#000',padding:'8px 18px',fontSize:'19px',fontFamily:"'VT323',monospace",cursor:'pointer',boxShadow:`3px 3px 0 #664400`,fontWeight:'bold',transition:'all 0.1s',letterSpacing:'1px'},
    btnD:{background:'#1a1100',border:`1px solid ${GOLD}`,color:GOLD,padding:'8px 16px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'},
    btnG:{background:'transparent',border:'1px solid #333',color:'#555',padding:'8px 14px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer'},
    btnGreen:{background:'#003300',border:'2px solid #44ff44',color:'#44ff44',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'},
    btnRed:{background:'#330000',border:'2px solid #ff4444',color:'#ff4444',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'},
    th:{background:'#0d0d0d',color:GOLD,padding:'9px 12px',textAlign:'left',borderBottom:'1px solid #222',fontFamily:"'Press Start 2P',monospace",fontSize:'8px',letterSpacing:'0.5px',whiteSpace:'nowrap'},
    td:{padding:'8px 12px',borderBottom:'1px solid #191900',color:'#ccc',whiteSpace:'nowrap'},
  };

  const inp=S.inp, lbl={display:'block',color:'#888',fontSize:'14px',marginBottom:'5px'};

  // ── Loading ──
  if(screen==='loading')return<div style={{...S.app,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'Press Start 2P',monospace",fontSize:'14px',color:GOLD,textShadow:`2px 2px 0 #664400`}} className="blink">◈ TURVA TRADER ◈</span></div>;

  // ── Auth ──
  if(screen==='login'||screen==='register'){
    const isL=screen==='login';
    return(
      <div style={{...S.app,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:`radial-gradient(ellipse at center,#181008 0%,${BG} 80%)`}}>
        <div style={{position:'fixed',inset:0,backgroundImage:`linear-gradient(${GOLD}05 1px,transparent 1px),linear-gradient(90deg,${GOLD}05 1px,transparent 1px)`,backgroundSize:'48px 48px',pointerEvents:'none'}}/>
        <div style={{textAlign:'center',marginBottom:'28px',position:'relative',zIndex:1}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'18px',color:GOLD,textShadow:`3px 3px 0 #664400,0 0 30px ${GOLD}33`,marginBottom:'8px'}}>◈ TURVA TRADER ◈</div>
          <div style={{color:'#333',fontSize:'16px',letterSpacing:'3px'}}>◆ MERCADO DE RAROS ◆</div>
        </div>
        <div style={{...S.card,width:'380px',padding:'28px 32px',position:'relative',zIndex:1,border:`2px solid ${GOLD}`,boxShadow:`6px 6px 0 #332200`}} className="anim">
          <CornerPx/>
          <div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:GOLD,textAlign:'center',marginBottom:'22px'}}>{isL?'» ENTRAR «':'» CRIAR CONTA «'}</div>
          <Flash msg={msg}/>
          {isL?(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','••••••']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'14px'}}><label style={lbl}>{l}</label><input className="inp" style={inp} type={t} placeholder={ph} value={lF[k]} onChange={e=>setLF({...lF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
            ))}
            <button style={{...S.btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?.6:1}} onClick={doLogin} disabled={loading}>{loading?'AGUARDE...':'ENTRAR →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#333'}}>Sem conta? <span style={{color:GOLD,cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('register');setMsg({text:'',type:'info'});}}>Criar agora</span></div>
          </>):(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','mín. 4 chars'],['CONFIRMAR','c','password','repita']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'13px'}}><label style={lbl}>{l}</label><input className="inp" style={inp} type={t} placeholder={ph} value={rF[k]} onChange={e=>setRF({...rF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doRegister()}/></div>
            ))}
            <button style={{...S.btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?.6:1}} onClick={doRegister} disabled={loading}>{loading?'AGUARDE...':'CRIAR CONTA →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#333'}}>Já tem conta? <span style={{color:GOLD,cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('login');setMsg({text:'',type:'info'});}}>Entrar</span></div>
          </>)}
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return(
    <div style={S.app}>
      {/* Header */}
      <header style={S.hdr}>
        <div style={S.logo}>
          <span style={{fontSize:'16px'}}>◈</span> TURVA TRADER
        </div>
        {[['mercado','MERCADO'],['painel','MEU PAINEL'],['negocios','NEGOCIAÇÕES'],...(user?.is_admin?[['mod','MODERAÇÃO']]:[])]
          .map(([id,label])=>(
          <button key={id} className={`tab-btn ${tab===id?'tab-a':'tab-i'}`} style={{...S.tab,...(id==='mod'&&pendingTrades.length>0?{color:'#ff6b6b'}:{})}} onClick={()=>setTab(id)}>
            {label}{id==='mod'&&pendingTrades.length>0&&<span style={{marginLeft:'6px',background:'#ff4444',color:'#fff',padding:'0 5px',fontSize:'12px',fontFamily:"'VT323',monospace"}}>{pendingTrades.length}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px'}}>
          <span style={{color:'#444',fontSize:'16px'}}>◈ <span style={{color:GOLD}}>{user?.username}</span></span>
          {tab==='mercado'&&<button style={{...S.btnD,fontSize:'16px',padding:'6px 14px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro||'',categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR</button>}
          {tab==='painel'&&<button style={{...S.btnY,fontSize:'17px',padding:'6px 14px'}} onClick={()=>setShowOM(true)}>+ OPERAÇÃO</button>}
          {tab==='negocios'&&<button style={{...S.btnY,fontSize:'17px',padding:'6px 14px'}} onClick={()=>{setEditingOrder(null);setOrderForm(eOrder);setShowOrderModal(true);}}>+ NOVA ORDEM</button>}
          <button style={{...S.btnG,fontSize:'16px',padding:'6px 10px'}} onClick={doLogout}>SAIR</button>
        </div>
      </header>
      <Flash msg={msg}/>

      {/* ══ MERCADO ══ */}
      {tab==='mercado'&&(
        <div style={{display:'flex',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          {/* Sidebar */}
          <div style={{width:'268px',borderRight:'1px solid #1a1200',overflow:'auto',background:'#0a0a0a',flexShrink:0}}>
            <div style={{padding:'10px',borderBottom:'1px solid #1a1200'}}><input className="inp" style={inp} placeholder="🔍 Buscar raro..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div style={{...S.secHdr}}><span>{filtered.length} RAROS</span></div>
            {filtered.map(item=>{
              const sel=selRaro===item.raro;
              const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;
              return(
                <div key={item.raro} className={`ch ${sel?'cs':''}`} onClick={()=>{setSelRaro(item.raro);setSearch('');}} style={{padding:'10px 12px',borderBottom:'1px solid #111',borderLeft:`3px solid ${sel?GOLD:'transparent'}`,transition:'all 0.1s',cursor:'pointer',display:'flex',gap:'10px',alignItems:'center'}}>
                  <div style={{width:'36px',height:'36px',flexShrink:0,border:'1px solid #222',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                    {img?<img src={img} alt={item.raro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#222',fontSize:'16px'}}>◈</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                      <div style={{color:sel?GOLD:'#ddd',fontSize:'16px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginRight:'4px'}}>{item.raro}</div>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.count?GOLD:'#333',flexShrink:0}}>{item.count?`${item.avgPrice}c`:'novo'}{item.trend>0&&<span style={{color:'#69db7c',fontSize:'9px'}}>▲</span>}{item.trend<0&&<span style={{color:'#ff6b6b',fontSize:'9px'}}>▼</span>}</div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><Badge cat={item.categoria}/><span style={{color:'#333'}}>{item.count} neg.</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main */}
          <div style={{flex:1,overflow:'auto',padding:'18px',background:'#090909'}}>
            {!selRaro?(
              <div>
                <div style={S.secHdr}>◆ TODOS OS RAROS — VISÃO GERAL</div>
                <div style={{...S.card,overflowX:'auto',padding:0}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>{['','RARO','CATEGORIA','MÉDIA (ÚLT.10)','ÚLTIMO','NEG.','ÚLTIMA NEG.'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {uRaros.map((item,i)=>{const cat=rarities.find(r=>r.raro===item.raro);return(
                        <tr key={item.raro} className="rrow" style={{background:i%2===0?'#0e0e0e':'#0b0b0b',cursor:'pointer'}} onClick={()=>setSelRaro(item.raro)}>
                          <td style={{...S.td,width:'44px',padding:'4px 8px'}}>
                            <div style={{width:'34px',height:'34px',border:'1px solid #1f1800',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                              {cat?.imagem_url?<img src={cat.imagem_url} alt={item.raro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#222',fontSize:'14px'}}>◈</span>}
                            </div>
                          </td>
                          <td style={{...S.td,color:GOLD,fontWeight:'bold'}}>{item.raro}</td>
                          <td style={S.td}><Badge cat={item.categoria}/></td>
                          <td style={{...S.td,fontFamily:"'Press Start 2P'",fontSize:'13px',color:item.count?GOLD:'#333'}}>{item.count?`${item.avgPrice}c`:'—'}</td>
                          <td style={{...S.td,color:'#aaa'}}>{item.count?`${item.lastPrice}c`:'—'}</td>
                          <td style={{...S.td,color:'#555'}}>{item.count}</td>
                          <td style={{...S.td,color:'#444'}}>{item.lastDate?fmtDate(item.lastDate):'—'}</td>
                        </tr>
                      );})}
                      {!uRaros.length&&<tr><td colSpan={7} style={{...S.td,textAlign:'center',color:'#222',padding:'56px'}}>Nenhum raro cadastrado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ):(
              <div className="anim">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
                  <div>
                    <button style={{...S.btnG,fontSize:'15px',padding:'4px 10px',marginBottom:'8px'}} onClick={()=>setSelRaro(null)}>← voltar</button>
                    <div style={{fontFamily:"'Press Start 2P'",fontSize:'14px',color:GOLD,marginBottom:'8px',textShadow:`2px 2px 0 #443300`}}>{selRaro}</div>
                    <Badge cat={selInfo?.categoria||''}/>
                  </div>
                  <button style={{...S.btnD,padding:'7px 14px',fontSize:'17px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro,categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR NEG.</button>
                </div>

                {selCatalog&&(
                  <div style={{...S.card,padding:'14px 18px',marginBottom:'16px',display:'flex',gap:'20px',flexWrap:'wrap',alignItems:'center',borderColor:'#222'}}>
                    {selCatalog.imagem_url&&(
                      <div style={{width:'90px',height:'90px',flexShrink:0,border:'1px solid #222',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                        <img src={selCatalog.imagem_url} alt={selRaro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.parentNode.style.display='none';}}/>
                      </div>
                    )}
                    <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#444',letterSpacing:'1px'}}>CATÁLOGO</div>
                      {selCatalog.preco_catalogo>0&&<div><div style={{fontSize:'13px',color:'#555',marginBottom:'2px'}}>PREÇO DE LANÇAMENTO</div><div style={{color:'#e599f7',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.preco_catalogo}c</div></div>}
                      {selCatalog.pixels>0&&<div><div style={{fontSize:'13px',color:'#555',marginBottom:'2px'}}>PIXELS</div><div style={{color:'#63e6be',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.pixels}</div></div>}
                      {selCatalog.data_lancamento&&<div><div style={{fontSize:'13px',color:'#555',marginBottom:'2px'}}>LANÇAMENTO</div><div style={{color:GOLD,fontSize:'18px'}}>{fmtDate(selCatalog.data_lancamento)}</div></div>}
                    </div>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'16px'}}>
                  {[{l:'MÉDIA ÚLT.10',v:`${selInfo?.avgPrice||0}c`,hi:true},{l:'ÚLTIMO PREÇO',v:`${selInfo?.lastPrice||0}c`},{l:'NEGOCIAÇÕES',v:String(selInfo?.count||0)},{l:'ÚLTIMA NEG.',v:fmtDate(selInfo?.lastDate)}].map(s=>(
                    <div key={s.l} style={{...S.card,padding:'12px',textAlign:'center',border:s.hi?`2px solid ${GOLD}`:'1px solid #222',boxShadow:s.hi?`3px 3px 0 #443300`:'2px 2px 8px rgba(0,0,0,0.5)'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#444',marginBottom:'8px'}}>{s.l}</div>
                      <div style={{color:s.hi?GOLD:'#bbb',fontSize:'20px'}}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {chartData.length>1&&(
                  <div style={{...S.card,marginBottom:'16px',padding:0}}>
                    <div style={S.secHdr}>◆ EVOLUÇÃO DO PREÇO</div>
                    <div style={{padding:'16px 10px 10px 0',background:'#0a0a0a'}}>
                      <ResponsiveContainer width="100%" height={190}>
                        <LineChart data={chartData} margin={{top:5,right:20,left:10,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1400" vertical={false}/>
                          <XAxis dataKey="date" tickFormatter={v=>fmtDate(v)} tick={{fill:'#444',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#222'}} tickLine={false}/>
                          <YAxis tick={{fill:'#444',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#222'}} tickLine={false} width={55}/>
                          <Tooltip content={<ChartTip/>}/>
                          <Line type="monotone" dataKey="preco" stroke={GOLD} strokeWidth={2.5} dot={{fill:GOLD,r:4,strokeWidth:0}} activeDot={{r:6,fill:'#fff',stroke:GOLD,strokeWidth:2}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div style={{...S.card,marginBottom:'16px',padding:0}}>
                  <div style={S.secHdr}>◆ MÉDIA POR DIA</div>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>{['DATA','NEGOCIAÇÕES','MÉDIA/UN'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>{dailyAvg.map((row,i)=>(
                      <tr key={row.date} style={{background:i%2===0?'#0e0e0e':'#0b0b0b'}}>
                        <td style={{...S.td,color:'#777'}}>{fmtDate(row.date)}</td>
                        <td style={{...S.td,color:'#555'}}>{row.count}</td>
                        <td style={{...S.td,color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{row.avg}c</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>

                <div style={{...S.card,padding:0}}>
                  <div style={S.secHdr}>◆ HISTÓRICO COMPLETO</div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                      <thead><tr>{['DATA','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO POR'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {!selTrades.length&&<tr><td colSpan={7} style={{...S.td,textAlign:'center',color:'#222',padding:'32px'}}>Sem negociações.</td></tr>}
                        {selTrades.map((t,i)=>(
                          <tr key={t.id} className="rrow" style={{background:i%2===0?'#0e0e0e':'#0b0b0b'}}>
                            <td style={{...S.td,color:'#666'}}>{fmtDate(t.data)}</td>
                            <td style={{...S.td,color:'#666'}}>{t.quantidade}</td>
                            <td style={{...S.td,color:'#999'}}>{t.precoVenda}c</td>
                            <td style={{...S.td,color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                            <td style={{...S.td,color:'#7bb8ff'}}>{t.vendedor}</td>
                            <td style={{...S.td,color:'#7dffaa'}}>{t.comprador}</td>
                            <td style={{...S.td,color:'#444',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
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
      )}

      {/* ══ MEU PAINEL ══ */}
      {tab==='painel'&&(
        <div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px',background:'#090909'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px',marginBottom:'18px'}}>
            {[
              {l:'BALANÇO ATUAL',v:`${totals.balanco>=0?'+':''}${totals.balanco}c`,sub:totals.balanco>=0?'lucro acumulado':'prejuízo acumulado',color:totals.balanco>=0?'#69db7c':'#ff6b6b'},
              {l:'CAPITAL INVESTIDO',v:`${totals.inv}c`,sub:'total comprado',color:'#7bb8ff'},
              {l:'CAPITAL PARADO',v:`${totals.parado}c`,sub:'em estoque',color:GOLD},
              {l:'TAXA DE ACERTO',v:`${totals.taxa}%`,sub:'itens com lucro',color:'#e599f7'},
            ].map(s=>(
              <div key={s.l} style={{...S.card,padding:'14px 18px',border:`1px solid ${s.color}33`,boxShadow:`3px 3px 0 ${s.color}11`}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#444',marginBottom:'8px',letterSpacing:'1px'}}>{s.l}</div>
                <div style={{color:s.color,fontSize:'26px',marginBottom:'4px',fontWeight:'bold'}}>{s.v}</div>
                <div style={{color:'#444',fontSize:'15px'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{...S.card,padding:0}}>
            <div style={S.secHdr}>◆ RESUMO POR RARO{!pStats.length&&<span style={{color:'#444',fontFamily:"'VT323',monospace",fontSize:'16px'}}> — nenhuma operação ainda</span>}</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['','RARO','COMPRADOS','VENDIDOS','ESTOQUE','CUSTO MÉD','INVESTIDO','VENDIDO','LUCRO',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {!pStats.length&&<tr><td colSpan={10} style={{...S.td,textAlign:'center',color:'#222',padding:'32px',fontSize:'16px'}}>Use <span style={{color:GOLD}}>+ OPERAÇÃO</span> para registrar.</td></tr>}
                  {pStats.map((item,i)=>{
                    const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;
                    return(
                    <tr key={item.raro} style={{background:i%2===0?'#0e0e0e':'#0b0b0b'}}>
                      <td style={{...S.td,width:'44px',padding:'4px 8px'}}>
                        <div style={{width:'34px',height:'34px',border:'1px solid #1f1800',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                          {img?<img src={img} alt={item.raro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#222',fontSize:'14px'}}>◈</span>}
                        </div>
                      </td>
                      <td style={{...S.td,color:GOLD,fontWeight:'bold'}}>{item.raro}</td>
                      <td style={{...S.td,color:'#7bb8ff'}}>{item.comprados}</td>
                      <td style={{...S.td,color:'#7dffaa'}}>{item.vendidos}</td>
                      <td style={{...S.td,color:item.estoque>0?GOLD:'#444'}}>{item.estoque}</td>
                      <td style={{...S.td,color:'#aaa'}}>{item.custo}c</td>
                      <td style={{...S.td,color:'#7bb8ff'}}>{item.investido}c</td>
                      <td style={{...S.td,color:'#7dffaa'}}>{item.vendido}c</td>
                      <td style={{...S.td,fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.lucro>=0?'#69db7c':'#ff6b6b'}}>{item.lucro>=0?'+':''}{item.lucro}c</td>
                      <td style={{...S.td,whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:'5px'}}>
                          <button style={S.btnD} onMouseEnter={e=>{e.currentTarget.style.background=GOLD;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background='#1a1100';e.currentTarget.style.color=GOLD;}} onClick={()=>openPEdit(item)}>✎</button>
                          <button style={{...S.btnRed,padding:'4px 8px'}} onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}} onClick={()=>deletePortfolioRaro(item.raro)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ NEGOCIAÇÕES ══ */}
      {tab==='negocios'&&(
        <div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px',background:'#090909'}}>
          {/* Filter bar */}
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',alignItems:'center'}}>
            <span style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#444',marginRight:'4px'}}>FILTRO:</span>
            {[['todos','TODOS'],['compra','COMPRO'],['venda','VENDO']].map(([v,l])=>(
              <button key={v} style={{...S.btnG,fontSize:'17px',padding:'6px 14px',...(orderFilter===v?{background:'#1a1100',border:`1px solid ${GOLD}`,color:GOLD}:{})}} onClick={()=>setOrderFilter(v)}>{l}</button>
            ))}
            <span style={{color:'#333',fontSize:'16px',marginLeft:'8px'}}>{filteredOrders.length} ordens ativas</span>
          </div>

          {/* Orders grid */}
          {!filteredOrders.length&&(
            <div style={{...S.card,padding:'48px',textAlign:'center',color:'#222',fontSize:'18px'}}>
              Nenhuma ordem ativa no momento. Clique em <span style={{color:GOLD}}>+ NOVA ORDEM</span> para publicar!
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'14px'}}>
            {filteredOrders.map(order=>{
              const isOwn=order.username===user?.username;
              const canEdit=isOwn||user?.is_admin;
              const exp=isExpired(order.expires_at);
              return(
                <div key={order.id} className="order-card" style={{...S.card,padding:'16px',border:`1px solid ${order.tipo==='compra'?'#1a3300':'#330000'}`,borderLeft:`3px solid ${order.tipo==='compra'?'#69db7c':'#ff6b6b'}`,transition:'border-color 0.2s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <div>
                      <span style={{background:order.tipo==='compra'?'#69db7c22':'#ff6b6b22',border:`1px solid ${order.tipo==='compra'?'#69db7c44':'#ff6b6b44'}`,color:order.tipo==='compra'?'#69db7c':'#ff6b6b',padding:'3px 10px',fontFamily:"'Press Start 2P',monospace",fontSize:'10px'}}>
                        {order.tipo==='compra'?'🛒 COMPRO':'💰 VENDO'}
                      </span>
                      <div style={{color:'#666',fontSize:'15px',marginTop:'6px'}}>por <span style={{color:GOLD}}>{order.username}</span></div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:exp?'#ff4444':'#69db7c'}}>{timeLeft(order.expires_at)}</div>
                      {canEdit&&(
                        <div style={{display:'flex',gap:'4px',marginTop:'6px',justifyContent:'flex-end'}}>
                          <button style={{...S.btnD,padding:'3px 8px',fontSize:'16px'}} onClick={()=>openEditOrder(order)}>✎</button>
                          <button style={{...S.btnRed,padding:'3px 8px',fontSize:'16px'}} onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}} onClick={()=>deleteOrder(order.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{borderTop:'1px solid #1a1a1a',paddingTop:'10px'}}>
                    {order.items.map((it,i)=>{
                      const img=rarities.find(r=>r.raro===it.raro)?.imagem_url;
                      return(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:'1px solid #111'}}>
                          <div style={{width:'30px',height:'30px',flexShrink:0,border:'1px solid #1f1800',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                            {img?<img src={img} alt={it.raro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#222',fontSize:'12px'}}>◈</span>}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{color:'#ddd',fontSize:'17px'}}>{it.raro}</div>
                            <div style={{color:'#555',fontSize:'15px'}}>Qtd: {it.quantidade}</div>
                          </div>
                          <div style={{fontFamily:"'Press Start 2P'",fontSize:'12px',color:GOLD,flexShrink:0}}>{it.preco}c<span style={{color:'#555',fontSize:'10px',fontFamily:"'VT323',monospace"}}>/un</span></div>
                        </div>
                      );
                    })}
                  </div>

                  {order.observacao&&(
                    <div style={{marginTop:'10px',color:'#555',fontSize:'16px',fontStyle:'italic'}}>"{order.observacao}"</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ MODERAÇÃO ══ */}
      {tab==='mod'&&user?.is_admin&&(
        <div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px',background:'#090909'}}>
          <div style={{...S.card,padding:'12px 16px',marginBottom:'18px',borderColor:'#ff444422',display:'flex',alignItems:'center',gap:'12px'}}>
            <span style={{fontSize:'20px'}}>⚠️</span>
            <div><div style={{fontFamily:"'Press Start 2P'",fontSize:'9px',color:'#ff6b6b',marginBottom:'4px'}}>PAINEL DE MODERAÇÃO</div><div style={{color:'#666',fontSize:'16px'}}>Gerencie negociações pendentes e aprovadas.</div></div>
          </div>

          {pendingTrades.length===0?(
            <div style={{...S.card,padding:'24px',textAlign:'center',color:'#333',fontSize:'17px',marginBottom:'18px'}}>Nenhuma pendente ✅</div>
          ):(
            <div style={{...S.card,padding:0,marginBottom:'18px'}}>
              <div style={{...S.secHdr,color:'#ff6b6b'}}>◆ AGUARDANDO APROVAÇÃO — {pendingTrades.length}</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                  <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','ENVIADO POR','AÇÕES'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {pendingTrades.map((t,i)=>(
                      <tr key={t.id} style={{background:i%2===0?'#0e0e0e':'#0b0b0b'}}>
                        <td style={{...S.td,color:'#666'}}>{fmtDate(t.data)}</td>
                        <td style={{...S.td,color:GOLD,fontWeight:'bold'}}>{t.raro}</td>
                        <td style={{...S.td,color:'#777'}}>{t.quantidade}</td>
                        <td style={{...S.td,color:'#999'}}>{t.preco_venda}c</td>
                        <td style={{...S.td,color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.preco_por_unidade}c</td>
                        <td style={{...S.td,color:'#7bb8ff'}}>{t.vendedor}</td>
                        <td style={{...S.td,color:'#7dffaa'}}>{t.comprador}</td>
                        <td style={{...S.td,color:'#444',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                        <td style={{...S.td,whiteSpace:'nowrap'}}>
                          <div style={{display:'flex',gap:'5px'}}>
                            <button style={S.btnGreen} onMouseEnter={e=>{e.currentTarget.style.background='#44ff44';e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background='#003300';e.currentTarget.style.color='#44ff44';}} onClick={()=>approveTrade(t.id)}>✓</button>
                            <button style={{...S.btnD,padding:'4px 10px',fontSize:'17px'}} onMouseEnter={e=>{e.currentTarget.style.background=GOLD;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background='#1a1100';e.currentTarget.style.color=GOLD;}} onClick={()=>openEditTrade(t)}>✎</button>
                            <button style={S.btnRed} onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}} onClick={()=>rejectTrade(t.id)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{...S.card,padding:0}}>
            <div style={S.secHdr}>
              <span>◆ NEGOCIAÇÕES APROVADAS — {trades.length}</span>
              <input className="inp" style={{...inp,width:'180px',padding:'4px 10px',fontSize:'16px'}} placeholder="filtrar..." value={modSearch} onChange={e=>setModSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO POR','AÇÕES'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...trades].filter(t=>!modSearch||t.raro.toLowerCase().includes(modSearch.toLowerCase())).sort((a,b)=>b.data.localeCompare(a.data)).map((t,i)=>(
                    <tr key={t.id} className="rrow" style={{background:i%2===0?'#0e0e0e':'#0b0b0b'}}>
                      <td style={{...S.td,color:'#666'}}>{fmtDate(t.data)}</td>
                      <td style={{...S.td,color:GOLD,fontWeight:'bold'}}>{t.raro}</td>
                      <td style={{...S.td,color:'#777'}}>{t.quantidade}</td>
                      <td style={{...S.td,color:'#999'}}>{t.precoVenda}c</td>
                      <td style={{...S.td,color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                      <td style={{...S.td,color:'#7bb8ff'}}>{t.vendedor}</td>
                      <td style={{...S.td,color:'#7dffaa'}}>{t.comprador}</td>
                      <td style={{...S.td,color:'#444',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                      <td style={{...S.td,whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:'5px'}}>
                          <button style={{...S.btnD,padding:'4px 10px',fontSize:'17px'}} onMouseEnter={e=>{e.currentTarget.style.background=GOLD;e.currentTarget.style.color='#000';}} onMouseLeave={e=>{e.currentTarget.style.background='#1a1100';e.currentTarget.style.color=GOLD;}} onClick={()=>openEditTrade(t)}>✎</button>
                          <button style={S.btnRed} onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}} onClick={()=>adminDeleteTrade(t.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Registrar Negociação */}
      <Modal show={showTM} onClose={()=>setShowTM(false)} title="◆ REGISTRAR NEGOCIAÇÃO">
        <Flash msg={msg}/>
        <div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input className="inp" style={inp} placeholder="ex: Holo Mano" value={tF.raro} onChange={e=>setTF({...tF,raro:e.target.value})} list="rl1"/><datalist id="rl1">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={tF.quantidade} onChange={e=>setTF({...tF,quantidade:e.target.value})}/></div>
          <div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={inp} type="number" min="0" placeholder="0" value={tF.precoVenda} onChange={e=>setTF({...tF,precoVenda:e.target.value})}/></div>
        </div>
        {tF.precoVenda&&parseInt(tF.quantidade)>=1&&<div style={{background:'#0a0a0a',border:'1px solid #222',padding:'8px 12px',marginBottom:'13px',fontSize:'17px',color:'#777',display:'flex',justifyContent:'space-between'}}><span>Preço por unidade:</span><span style={{color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{Math.round(parseFloat(tF.precoVenda||0)/Math.max(1,parseInt(tF.quantidade)||1))}c</span></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} placeholder="nick" value={tF.vendedor} onChange={e=>setTF({...tF,vendedor:e.target.value})}/></div>
          <div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} placeholder="nick" value={tF.comprador} onChange={e=>setTF({...tF,comprador:e.target.value})}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
          <div><label style={lbl}>CATEGORIA *</label><select className="inp" style={S.sel} value={tF.categoria} onChange={e=>setTF({...tF,categoria:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={tF.data} onChange={e=>setTF({...tF,data:e.target.value})}/></div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doAddTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
          <button style={S.btnG} onClick={()=>setShowTM(false)}>CANCELAR</button>
        </div>
      </Modal>

      {/* Registrar Operação (Meu Painel) */}
      <Modal show={showOM} onClose={()=>setShowOM(false)} title="◆ REGISTRAR OPERAÇÃO" width="450px">
        <Flash msg={msg}/>
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>TIPO *</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[['compra','🛒 COMPRA'],['venda','💰 VENDA']].map(([v,l])=>(
              <button key={v} style={{...S.btnD,textAlign:'center',fontSize:'18px',background:oF.tipo===v?GOLD:'#1a1100',color:oF.tipo===v?'#000':GOLD,transition:'all 0.15s'}} onClick={()=>setOF({...oF,tipo:v})}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:'13px'}}>
          <label style={lbl}>RARO *</label>
          <input className="inp" style={inp} placeholder="ex: Holo Mano" value={oF.raro} onChange={e=>setOF({...oF,raro:e.target.value})} list="rl2"/>
          <datalist id="rl2">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
          <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={oF.quantidade} onChange={e=>setOF({...oF,quantidade:e.target.value})}/></div>
          <div>
            <label style={lbl}>
              <span style={{cursor:'pointer',color:oF.priceMode==='total'?GOLD:'#777'}} onClick={()=>setOF({...oF,priceMode:'total'})}>TOTAL</span>
              <span style={{color:'#333',margin:'0 6px'}}>|</span>
              <span style={{cursor:'pointer',color:oF.priceMode==='unit'?GOLD:'#777'}} onClick={()=>setOF({...oF,priceMode:'unit'})}>POR UNIDADE</span>
            </label>
            {oF.priceMode==='total'
              ?<input className="inp" style={inp} type="number" min="0" placeholder="preço total (c)" value={oF.precoTotal} onChange={e=>setOF({...oF,precoTotal:e.target.value})}/>
              :<input className="inp" style={inp} type="number" min="0" placeholder="preço/un (c)" value={oF.precoPorUnidade} onChange={e=>setOF({...oF,precoPorUnidade:e.target.value})}/>
            }
          </div>
        </div>
        {/* Price preview */}
        {(oF.precoTotal||oF.precoPorUnidade)&&parseInt(oF.quantidade)>=1&&(()=>{
          const qtd=Math.max(1,parseInt(oF.quantidade)||1);
          const pt=oF.priceMode==='total'?parseFloat(oF.precoTotal||0):parseFloat(oF.precoPorUnidade||0)*qtd;
          const ppu=oF.priceMode==='unit'?parseFloat(oF.precoPorUnidade||0):Math.round(pt/qtd);
          return<div style={{background:'#0a0a0a',border:'1px solid #222',padding:'8px 12px',marginBottom:'13px',fontSize:'16px',color:'#777',display:'flex',justifyContent:'space-between'}}>
            <span>Total: <span style={{color:'#aaa'}}>{Math.round(pt)}c</span></span>
            <span>Por un: <span style={{color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{ppu}c</span></span>
          </div>;
        })()}
        {/* Catalog price button */}
        {oF.raro&&rarities.find(r=>r.raro===oF.raro)?.preco_catalogo>0&&(
          <button style={{...S.btnD,width:'100%',textAlign:'center',marginBottom:'13px',fontSize:'17px',borderStyle:'dashed'}} onClick={useCatalogPrice}>
            📦 Usar preço do catálogo ({rarities.find(r=>r.raro===oF.raro)?.preco_catalogo}c/un)
          </button>
        )}
        <div style={{marginBottom:'20px'}}><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={oF.data} onChange={e=>setOF({...oF,data:e.target.value})}/></div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doAddOp} disabled={loading}>{loading?'SALVANDO...':'✓ CONFIRMAR'}</button>
          <button style={S.btnG} onClick={()=>setShowOM(false)}>CANCELAR</button>
        </div>
      </Modal>

      {/* Nova/Editar Ordem */}
      <Modal show={showOrderModal} onClose={()=>{setShowOrderModal(false);setEditingOrder(null);setOrderForm(eOrder);}} title={editingOrder?'✎ EDITAR ORDEM':'◆ NOVA ORDEM'} width="520px">
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>TIPO *</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[['compra','🛒 COMPRO'],['venda','💰 VENDO']].map(([v,l])=>(
              <button key={v} style={{...S.btnD,textAlign:'center',fontSize:'18px',background:orderForm.tipo===v?(orderForm.tipo==='compra'?'#69db7c':'#ff6b6b'):'#1a1100',color:orderForm.tipo===v?'#000':(v==='compra'?'#69db7c':'#ff6b6b'),border:`1px solid ${v==='compra'?'#69db7c44':'#ff6b6b44'}`,transition:'all 0.15s'}} onClick={()=>setOrderForm({...orderForm,tipo:v})}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{fontFamily:"'Press Start 2P'",fontSize:'9px',color:'#444',marginBottom:'10px',letterSpacing:'1px'}}>RAROS ({orderForm.items.length})</div>
        {orderForm.items.map((it,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 100px 32px',gap:'8px',marginBottom:'8px',alignItems:'flex-end'}}>
            <div>
              {i===0&&<label style={{...lbl,marginBottom:'4px'}}>RARO</label>}
              <input className="inp" style={inp} placeholder="nome do raro" value={it.raro} onChange={e=>updateOrderItem(i,'raro',e.target.value)} list="rl-ord"/>
            </div>
            <div>
              {i===0&&<label style={{...lbl,marginBottom:'4px'}}>QTD</label>}
              <input className="inp" style={inp} type="number" min="1" value={it.quantidade} onChange={e=>updateOrderItem(i,'quantidade',e.target.value)}/>
            </div>
            <div>
              {i===0&&<label style={{...lbl,marginBottom:'4px'}}>PREÇO/UN</label>}
              <input className="inp" style={inp} type="number" min="0" placeholder="0" value={it.preco} onChange={e=>updateOrderItem(i,'preco',e.target.value)}/>
            </div>
            <button style={{...S.btnRed,padding:'9px 8px',fontSize:'18px'}} onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}} onClick={()=>removeOrderItem(i)}>✕</button>
          </div>
        ))}
        <datalist id="rl-ord">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist>
        <button style={{...S.btnG,width:'100%',textAlign:'center',marginBottom:'14px',fontSize:'17px'}} onClick={addOrderItem}>+ Adicionar raro</button>

        <div style={{marginBottom:'20px'}}>
          <label style={lbl}>OBSERVAÇÃO (opcional)</label>
          <input className="inp" style={inp} placeholder="ex: aceito trocas" value={orderForm.observacao} onChange={e=>setOrderForm({...orderForm,observacao:e.target.value})}/>
        </div>
        <div style={{background:'#0a0a0a',border:'1px solid #1a1a00',padding:'8px 12px',marginBottom:'18px',fontSize:'16px',color:'#555'}}>
          ⏱ Esta ordem ficará ativa por <span style={{color:GOLD}}>72 horas</span> e desaparecerá automaticamente.
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doSaveOrder} disabled={loading}>{loading?'SALVANDO...':`✓ ${editingOrder?'ATUALIZAR':'PUBLICAR'}`}</button>
          <button style={S.btnG} onClick={()=>{setShowOrderModal(false);setEditingOrder(null);setOrderForm(eOrder);}}>CANCELAR</button>
        </div>
      </Modal>

      {/* Editar Trade (Moderação) */}
      <Modal show={showEditModal&&!!editingTrade} onClose={()=>{setShowEditModal(false);setEditingTrade(null);}} title="✎ EDITAR NEGOCIAÇÃO">
        {editingTrade&&<>
          <div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input className="inp" style={inp} value={editingTrade.raro} onChange={e=>setEditingTrade({...editingTrade,raro:e.target.value})} list="rl-edit"/><datalist id="rl-edit">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
            <div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type="number" min="1" value={editingTrade.quantidade} onChange={e=>setEditingTrade({...editingTrade,quantidade:e.target.value})}/></div>
            <div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={inp} type="number" min="0" value={editingTrade.precoVenda} onChange={e=>setEditingTrade({...editingTrade,precoVenda:e.target.value})}/></div>
          </div>
          {editingTrade.precoVenda&&parseInt(editingTrade.quantidade)>=1&&<div style={{background:'#0a0a0a',border:'1px solid #222',padding:'8px 12px',marginBottom:'13px',fontSize:'17px',color:'#777',display:'flex',justifyContent:'space-between'}}><span>Preço por unidade:</span><span style={{color:GOLD,fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{Math.round(parseFloat(editingTrade.precoVenda||0)/Math.max(1,parseInt(editingTrade.quantidade)||1))}c</span></div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
            <div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} value={editingTrade.vendedor} onChange={e=>setEditingTrade({...editingTrade,vendedor:e.target.value})}/></div>
            <div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} value={editingTrade.comprador} onChange={e=>setEditingTrade({...editingTrade,comprador:e.target.value})}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div><label style={lbl}>CATEGORIA *</label><select className="inp" style={S.sel} value={editingTrade.categoria} onChange={e=>setEditingTrade({...editingTrade,categoria:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date" value={editingTrade.data} onChange={e=>setEditingTrade({...editingTrade,data:e.target.value})}/></div>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doEditTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
            <button style={S.btnG} onClick={()=>{setShowEditModal(false);setEditingTrade(null);}}>CANCELAR</button>
          </div>
        </>}
      </Modal>

      {/* Editar Portfolio */}
      <Modal show={showPEdit&&!!editingP} onClose={()=>{setShowPEdit(false);setEditingP(null);}} title="✎ EDITAR PORTFÓLIO" width="420px">
        {editingP&&<>
          <div style={{color:GOLD,fontSize:'20px',marginBottom:'16px',borderBottom:'1px solid #222',paddingBottom:'10px'}}>{editingP.raro}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div><label style={lbl}>QTD COMPRADA</label><input className="inp" style={inp} type="number" min="0" value={editingP.comprados} onChange={e=>setEditingP({...editingP,comprados:e.target.value})}/></div>
            <div><label style={lbl}>TOTAL INVESTIDO (c)</label><input className="inp" style={inp} type="number" min="0" value={editingP.investido} onChange={e=>setEditingP({...editingP,investido:e.target.value})}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div><label style={lbl}>QTD VENDIDA</label><input className="inp" style={inp} type="number" min="0" value={editingP.vendidos} onChange={e=>setEditingP({...editingP,vendidos:e.target.value})}/></div>
            <div><label style={lbl}>TOTAL RECEBIDO (c)</label><input className="inp" style={inp} type="number" min="0" value={editingP.vendido} onChange={e=>setEditingP({...editingP,vendido:e.target.value})}/></div>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doEditPortfolioRaro} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
            <button style={S.btnG} onClick={()=>{setShowPEdit(false);setEditingP(null);}}>CANCELAR</button>
          </div>
        </>}
      </Modal>

      {/* Footer */}
      <footer style={{position:'fixed',bottom:0,left:0,right:0,height:'32px',background:'#0a0a0a',borderTop:'1px solid #1a1200',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',color:'#333',zIndex:99,fontFamily:"'VT323',monospace",letterSpacing:'1px'}}>
        Feito com amor por:{' '}
        <a href="http://turva.com.br/home/Bot" target="_blank" rel="noopener noreferrer" style={{color:GOLD,textDecoration:'none',marginLeft:'5px',transition:'color 0.15s'}} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color=GOLD}>Bot</a>
      </footer>
    </div>
  );
}
