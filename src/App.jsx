import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "r
import { supabase } from "./supabase.js";
// ── Constants ──────────────────────────────────────────────────────────
const CATS = ['Raro Exclusivo','Mobi HC','Raro Rotativo','Raro Comum','Raro Colecionável','Ec
const CAT_C = {'Raro Exclusivo':'#ff6b35','Mobi HC':'#4dabf7','Raro Rotativo':'#69db7c','Raro
const G='#FFD700',G2='#CCA800',BG='#0a0804',BG2='#130f0a',BG3='#1a1208';
// ── Helpers ────────────────────────────────────────────────────────────
const fmtDate=s=>{if(!s)return'—';const p=String(s).split('-');return p.length===3?`${p[2]}/$
const fmtTime=s=>{if(!s)return'';const d=new Date(s);return`${String(d.getHours()).padStart(2
const calcAvg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
const timeLeft=exp=>{const d=new Date(exp)-new Date();if(d<=0)return'Expirado';const h=Math.f
// ── Micro-components ──────────────────────────────────────────────────
const Badge=({cat})=>{const c=CAT_C[cat]||'#aaa';return<span style={{background:c+'22',border
const Flash=({msg})=>{if(!msg?.text)return null;const m={error:{bg:'#1a0000',b:'#f44',t:'#f88
const ChartTip=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div
const Corners=()=><>{['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',wi
const Img=({url,alt,size=36})=>(
<div style={{width:size,height:size,flexShrink:0,border:`1px solid #2a1f0d`,background:BG,d
{url?<img src={url} alt={alt} style={{width:'100%',height:'100%',objectFit:'contain'}} on
</div>
);
// ── Modal wrapper ─────────────────────────────────────────────────────
const Modal=({show,onClose,title,children,width='490px'})=>{
if(!show)return null;
return(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignI
<div className="modal-box" style={{background:BG2,border:`2px solid ${G}`,boxShadow:`8p
<Corners/>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin
<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'10px',color:G,letter
<span style={{color:'#443300',cursor:'pointer',fontSize:'22px',lineHeight:1}} onCli
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
const [mSort,setMSort]=useState('lastDate');
const [mSortDir,setMSortDir]=useState('desc');
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
const [isMobile,setIsMobile]=useState(typeof window!=='undefined'&&window.innerWidth<768);
// Pagination
const [mPage,setMPage]=useState(0);
const [pPage,setPPage]=useState(0);
const [modPPage,setModPPage]=useState(0);
const [modAPage,setModAPage]=useState(0);
const [modCPage,setModCPage]=useState(0);
const PAGE=15;
const today=new Date().toISOString().split('T')[0];
const eT={raro:'',quantidade:1,categoria:'Raro Exclusivo',precoVenda:'',data:today,vendedor
const eO={raro:'',quantidade:1,tipo:'compra',precoTotal:'',precoPorUnidade:'',data:today,pr
const eOrder={tipo:'compra',items:[{raro:'',quantidade:1,preco:''}],observacao:''};
const [tF,setTF]=useState(eT);
const [oF,setOF]=useState(eO);
const [orderForm,setOrderForm]=useState(eOrder);
// ── Global CSS ──────────────────────────────────────────────────────
useEffect(()=>{
const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.
const s=document.createElement('style');
s.textContent=`
*{box-sizing:border-box;margin:0;padding:0}
body{background:${BG};overflow:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:${BG2}}
::-webkit-scrollbar-thumb{background:#3a2a10}
::-webkit-scrollbar-thumb:hover{background:${G}}
input,select,button,textarea{font-family:'VT323',monospace}
@keyframes sd{from{transform:translateY(-14px);opacity:0}to{transform:translateY(0);opa
@keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
@keyframes chatpop{from{transform:scale(.95) translateY(10px);opacity:0}to{transform:sc
.anim{animation:sd .22s ease}
.blink{animation:blink 1.3s infinite}
.rrow:hover{background:#1a1000!important;cursor:pointer}
.ch:hover{border-left-color:${G}!important;background:#180f00!important;cursor:pointer}
.cs{border-left-color:${G}!important;background:#180f00!important}
.inp:focus{outline:none!important;border-color:${G}!important;box-shadow:0 0 0 1px ${G}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.8) sepia(1) saturate
.tab-a{color:${G}!important;border-bottom:3px solid ${G}!important;background:linear-gr
.tab-i:hover{color:#aa8833!important;background:#110900!important}
.chat-anim{animation:chatpop .2s ease}
/* Mobile */
@media(max-width:768px){
body{overflow:auto!important;-webkit-text-size-adjust:100%}
.tab-bar{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
.tab-bar::-webkit-scrollbar{display:none}
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.modal-box{width:100%!important;max-width:100vw!important;margin:0!important;border-r
.stat-grid{grid-template-columns:1fr 1fr!important}
.chat-widget{width:calc(100vw - 16px)!important;right:8px!important}
}
`;
document.head.appendChild(s);
const su=localStorage.getItem('tt-user');
if(su){const u=JSON.parse(su);setUser(u);loadAll(u.username);setScreen('dashboard');}
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
useEffect(()=>{if(chatRef.current&&chatOpen)chatRef.current.scrollTop=chatRef.current.scrol
// ── Data ───────────────────────────────────────────────────────────
async function loadAll(uname){
const un=uname||user?.username;
if(!un)return;
try{
const {data:uData}=await supabase.from('users').select('is_admin').eq('username',un).ma
const isAdm=!!(uData?.is_admin);
const baseQ=[
supabase.from('trades').select('*').eq('status','approved').order('data',{ascending:t
supabase.from('rarities').select('*'),
supabase.from('portfolio').select('*').eq('username',un).order('data',{ascending:fals
supabase.from('orders').select('*').gt('expires_at',new Date().toISOString()).order('
...(isAdm?[supabase.from('trades').select('*').eq('status','pending').order('created_
];
const [tR,rR,pR,oR,...rest]=await Promise.all(baseQ);
if(tR?.data)setTrades(tR.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.
if(rR?.data)setRarities(rR.data);
if(pR?.data)setPortfolio(pR.data.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade
if(oR?.data)setOrders(oR.data);
if(rest[0]?.data)setPendingTrades(rest[0].data.map(x=>({...x,precoVenda:x.preco_venda,p
setUser(prev=>prev?{...prev,is_admin:isAdm}:prev);
if(isAdm)loadAdminUsers();
}catch(e){console.warn('loadAll:',e);}
}
async function loadMessages(){
const {data}=await supabase.from('messages').select('*').order('created_at',{ascending:tr
if(data)setMessages(data);
}
async function deleteMessage(id){
await supabase.from('messages').delete().eq('id',id);
await loadMessages();
}
async function loadAdminUsers(){
const {data}=await supabase.from('users').select('id,username,is_admin').order('username'
if(data)setAllUsers(data);
}
async function loadViewUser(uname){
if(!uname){setViewUserData(null);return;}
const {data:p}=await supabase.from('portfolio').select('*').eq('username',uname).order('d
if(!p){setViewUserData(null);return;}
const ops=p.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade:x.preco_por_unidade}))
const map={};
ops.forEach(op=>{if(!map[op.raro])map[op.raro]={raro:op.raro,c:[],v:[]};map[op.raro][op.t
const stats=Object.values(map).map(item=>{
const qC=item.c.reduce((s,o)=>s+o.quantidade,0),qV=item.v.reduce((s,o)=>s+o.quantidade,
const inv2=item.c.reduce((s,o)=>s+o.precoTotal,0),rec2=item.v.reduce((s,o)=>s+o.precoTo
const custo=qC?Math.round(inv2/qC):0;
return{raro:item.raro,comprados:qC,vendidos:qV,estoque:qC-qV,custo,investido:inv2,vendi
});
const inv2=stats.reduce((s,i)=>s+i.investido,0),rec2=stats.reduce((s,i)=>s+i.vendido,0);
setViewUserData({stats,totals:{inv:inv2,rec:rec2,balanco:rec2-inv2,lucroTotal:stats.reduc
}
const flash=(text,type='info')=>{setMsg({text,type});setTimeout(()=>setMsg({text:'',type:'i
// ── Auth ───────────────────────────────────────────────────────────
async function doLogin(){
if(!lF.u||!lF.p){flash('Preencha todos os campos.','error');return;}
setLoading(true);
const {data,error}=await supabase.from('users').select('*').eq('username',lF.u).eq('passw
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
const {data:ex}=await supabase.from('users').select('id').eq('username',rF.u.trim()).mayb
if(ex){setLoading(false);flash('Usuário já existe.','error');return;}
const {data,error}=await supabase.from('users').insert({username:rF.u.trim(),password:rF.
setLoading(false);
if(error||!data){flash('Erro ao criar conta.','error');return;}
setUser(data);localStorage.setItem('tt-user',JSON.stringify(data));
try{await loadAll(data.username);}catch(e){console.warn(e);}
setRF({u:'',p:'',c:''});setScreen('dashboard');flash('Bem-vindo(a)!','success');
}
function doLogout(){setUser(null);setSelRaro(null);setTrades([]);setPortfolio([]);setRariti
// ── Trades ─────────────────────────────────────────────────────────
async function doAddTrade(){
if(!tF.raro.trim()||!tF.precoVenda||!tF.vendedor.trim()||!tF.comprador.trim()||!tF.data){
const qtd=Math.max(1,parseInt(tF.quantidade)||1),pv=parseFloat(tF.precoVenda);
if(isNaN(pv)||pv<0){flash('Preço inválido.','error');return;}
setLoading(true);
const {data,error}=await supabase.from('trades').insert({raro:tF.raro.trim(),quantidade:q
setLoading(false);
if(error||!data){flash('Erro ao salvar.','error');return;}
await loadAll();setShowTM(false);setTF(eT);
flash(user.is_admin?'Registrada!':'Enviada para aprovação ','success');
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
const {error}=await supabase.from('portfolio').insert({username:user.username,raro:oF.rar
setLoading(false);
if(error){flash('Erro ao salvar.','error');return;}
await loadAll();setShowOM(false);setOF(eO);flash(`${oF.tipo==='compra'?'Compra':'Venda'}
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
function openPEdit(item){setEditingP({raro:item.raro,comprados:item.comprados,investido:ite
async function doEditPortfolioRaro(){
if(!editingP)return;
const qtdC=parseInt(editingP.comprados)||0,invst=parseFloat(editingP.investido)||0;
const qtdV=parseInt(editingP.vendidos)||0,rec=parseFloat(editingP.vendido)||0;
setLoading(true);
await supabase.from('portfolio').delete().eq('username',user.username).eq('raro',editingP
if(qtdC>0)await supabase.from('portfolio').insert({username:user.username,raro:editingP.r
if(qtdV>0)await supabase.from('portfolio').insert({username:user.username,raro:editingP.r
setLoading(false);await loadAll();setShowPEdit(false);setEditingP(null);flash('Dados atua
}
// ── Orders ─────────────────────────────────────────────────────────
async function doSaveOrder(){
const valid=orderForm.items.filter(it=>it.raro.trim()&&parseInt(it.quantidade)>0);
if(!valid.length){flash('Adicione pelo menos 1 raro.','error');return;}
setLoading(true);
const payload={username:user.username,tipo:orderForm.tipo,items:valid.map(it=>({raro:it.r
const {error}=editingOrder?await supabase.from('orders').update(payload).eq('id',editingO
setLoading(false);
if(error){flash('Erro ao salvar ordem.','error');return;}
await loadAll();setShowOrderModal(false);setOrderForm(eOrder);setEditingOrder(null);
flash(editingOrder?'Ordem atualizada!':'Publicada por 72h!','success');
}
async function deleteOrder(id){if(!window.confirm('Excluir esta ordem?'))return;await supab
function openEditOrder(order){setEditingOrder(order);setOrderForm({tipo:order.tipo,items:or
const addOItem=()=>setOrderForm({...orderForm,items:[...orderForm.items,{raro:'',quantidade
const rmOItem=i=>setOrderForm({...orderForm,items:orderForm.items.filter((_,j)=>j!==i)});
const updOItem=(i,f,v)=>{const its=[...orderForm.items];its[i]={...its[i],[f]:v};setOrderFo
// ── Moderation ─────────────────────────────────────────────────────
async function approveTrade(id){await supabase.from('trades').update({status:'approved'}).e
async function rejectTrade(id){if(!window.confirm('Rejeitar e excluir?'))return;await supab
async function adminDeleteTrade(id){if(!window.confirm('Excluir esta negociação?'))return;a
function openEditTrade(t){setEditingTrade({id:t.id,raro:t.raro,quantidade:t.quantidade,cate
async function doEditTrade(){
const qtd=Math.max(1,parseInt(editingTrade.quantidade)||1),pv=parseFloat(editingTrade.pre
if(isNaN(pv)||pv<0){flash('Preço inválido.','error');return;}
setLoading(true);
await supabase.from('trades').update({raro:editingTrade.raro.trim(),quantidade:qtd,catego
setLoading(false);await loadAll();setShowEditModal(false);setEditingTrade(null);flash('At
}
// ── Chat ───────────────────────────────────────────────────────────
async function sendMessage(){
if(!chatInput.trim())return;
if(chatInput.length>200){flash('Mensagem muito longa (máx. 200 chars).','error');return;}
await supabase.from('messages').insert({username:user.username,message:chatInput.trim()})
setChatInput('');
await loadMessages();
}
// ── Computed ───────────────────────────────────────────────────────
const uRaros=useMemo(()=>{
const map={};
rarities.forEach(r=>{map[r.raro]={raro:r.raro,categoria:r.categoria||'Outros',items:[]};}
trades.forEach(t=>{if(!map[t.raro])map[t.raro]={raro:t.raro,categoria:t.categoria,items:[
return Object.values(map).map(r=>{
if(!r.items.length)return{...r,lastDate:null,avgPrice:0,lastPrice:0,count:0,trend:0};
const s=[...r.items].sort((a,b)=>b.data.localeCompare(a.data));
const l10=s.slice(0,10),avg10=calcAvg(l10.map(t=>t.precoPorUnidade));
const r5=s.slice(0,Math.min(5,s.length)),r5b=s.slice(Math.min(5,s.length),10);
return{...r,lastDate:s[0].data,avgPrice:avg10,lastPrice:s[0].precoPorUnidade,count:r.it
}).sort((a,b)=>{if(a.lastDate&&!b.lastDate)return -1;if(!a.lastDate&&b.lastDate)return 1;
},[trades,rarities]);
const filtered=useMemo(()=>{const s=search.toLowerCase();return s?uRaros.filter(r=>r.raro.t
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
function mColClick(col){if(mSort===col)setMSortDir(d=>d==='asc'?'desc':'asc');else{setMSort
const selInfo=useMemo(()=>selRaro?uRaros.find(r=>r.raro===selRaro):null,[uRaros,selRaro]);
const selCatalog=useMemo(()=>selRaro?rarities.find(r=>r.raro===selRaro):null,[rarities,selR
const quickCatalog=useMemo(()=>quickRaro?rarities.find(r=>r.raro===quickRaro):null,[raritie
const quickInfo=useMemo(()=>quickRaro?uRaros.find(r=>r.raro===quickRaro):null,[uRaros,quick
const selTrades=useMemo(()=>selRaro?[...trades.filter(t=>t.raro===selRaro)].sort((a,b)=>b.d
const chartData=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]=[]
const dailyAvg=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]=[];
const pStats=useMemo(()=>{
const map={};
portfolio.forEach(op=>{if(!map[op.raro])map[op.raro]={raro:op.raro,c:[],v:[]};map[op.raro
return Object.values(map).map(item=>{
const qC=item.c.reduce((s,o)=>s+o.quantidade,0),qV=item.v.reduce((s,o)=>s+o.quantidade,
const inv=item.c.reduce((s,o)=>s+o.precoTotal,0),rec=item.v.reduce((s,o)=>s+o.precoTota
const custo=qC?Math.round(inv/qC):0,pMV=qV?Math.round(rec/qV):0;
return{raro:item.raro,comprados:qC,vendidos:qV,estoque:qC-qV,custo,investido:inv,vendid
});
},[portfolio]);
const filteredPStats=useMemo(()=>{
let r=[...pStats];
if(pSearch)r=r.filter(i=>i.raro.toLowerCase().includes(pSearch.toLowerCase()));
const numSort=(key)=>(a,b)=>pSortDir==='desc'?b[key]-a[key]:a[key]-b[key];
const strSort=(a,b)=>pSortDir==='desc'?b.raro.localeCompare(a.raro):a.raro.localeCompare(
const sorts={raro:strSort,estoque:numSort('estoque'),investido:numSort('investido'),lucro
return r.sort(sorts[pSort]||strSort);
},[pStats,pSearch,pSort,pSortDir]);
const totals=useMemo(()=>{
const inv=pStats.reduce((s,i)=>s+i.investido,0),rec=pStats.reduce((s,i)=>s+i.vendido,0),p
const lucroTotal=pStats.reduce((s,i)=>s+i.lucro,0);
// Margem: avg(preco_venda/max(preco_compra,1)) for items with sales
const comVendas=pStats.filter(i=>i.vendidos>0);
const margem=comVendas.length?Math.round((comVendas.reduce((s,i)=>{
const avgV=i.vendido/i.vendidos,avgC=i.custo>0?i.custo:1;
return s+(avgV/avgC);
},0)/comVendas.length-1)*100):0;
return{inv,rec,parado,balanco:rec-inv,lucroTotal,margem,comVendas:comVendas.length};
},[pStats]);
const filteredOrders=useMemo(()=>orderFilter==='todos'?orders:orders.filter(o=>o.tipo===ord
// Reset pages on filter change
useEffect(()=>setMPage(0),[search,mSort,mSortDir]);
useEffect(()=>setPPage(0),[pSearch,pSort,pSortDir]);
// Paginated slices
const mItems=useMemo(()=>sortedURaros.slice(mPage*PAGE,(mPage+1)*PAGE),[sortedURaros,mPage]
const pItems=useMemo(()=>filteredPStats.slice(pPage*PAGE,(pPage+1)*PAGE),[filteredPStats,pP
const modPItems=useMemo(()=>pendingTrades.slice(modPPage*PAGE,(modPPage+1)*PAGE),[pendingTr
const modAItems=useMemo(()=>{const f=trades.filter(t=>!modSearch||t.raro.toLowerCase().incl
const modCItems=useMemo(()=>{const f=[...messages].filter(m=>!chatModSearch||m.username.toL
const modATotal=useMemo(()=>trades.filter(t=>!modSearch||t.raro.toLowerCase().includes(modS
const modCTotal=useMemo(()=>messages.filter(m=>!chatModSearch||m.username.toLowerCase().inc
// ── Style primitives ───────────────────────────────────────────────
const secHdr={fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:G,padding:'10px
const card={background:BG2,border:`1px solid #2a1800`,borderLeft:`3px solid ${G2}`,boxShado
const inp={background:'#080500',border:`1px solid #2a1800`,color:G,padding:'9px 12px',fontS
const sel={background:'#080500',border:`1px solid #2a1800`,color:G,padding:'9px 12px',fontS
const btnY={background:G,border:`2px solid ${G2}`,color:'#000',padding:'8px 18px',fontSize:
const btnD={background:BG3,border:`1px solid ${G}`,color:G,padding:'8px 16px',fontSize:'18p
const btnG={background:'transparent',border:`1px solid #2a1800`,color:'#664400',padding:'8p
const btnGreen={background:'#002200',border:'2px solid #4f4',color:'#4f4',padding:'4px 10px
const btnRed={background:'#220000',border:'2px solid #f44',color:'#f44',padding:'4px 10px',
const th={background:`linear-gradient(135deg,#1a1000,#0f0800)`,color:G,padding:'9px 12px',t
const td={padding:'8px 12px',borderBottom:`1px solid #160a00`,color:'#c8a870',whiteSpace:'n
const lbl={display:'block',color:'#886633',fontSize:'14px',marginBottom:'5px'};
// ── Loading ────────────────────────────────────────────────────────
if(screen==='loading')return<div style={{fontFamily:"'VT323',monospace",background:BG,minHe
// ── Auth ───────────────────────────────────────────────────────────
if(screen==='login'||screen==='register'){
const isL=screen==='login';
return(
<div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',display:'fl
<div style={{position:'fixed',inset:0,backgroundImage:`linear-gradient(${G}06 1px,tra
<div style={{textAlign:'center',marginBottom:'28px',position:'relative',zIndex:1}}>
<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'18px',color:G,textSh
<div style={{color:'#3a2a10',fontSize:'16px',letterSpacing:'3px'}}>◆ MERCADO DE RAR
</div>
<div style={{...card,width:'380px',padding:'28px 32px',position:'relative',zIndex:1,b
<Corners/>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:G,textAlign:'cente
<Flash msg={msg}/>
{isL?(<>
{[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','••••••']].map(([
<div key={k} style={{marginBottom:'14px'}}><label style={lbl}>{l}</label><input
))}
<button style={{...btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:
<div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#3a2a10'}
</>):(<>
{[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','mín. 4 chars'],[
<div key={k} style={{marginBottom:'13px'}}><label style={lbl}>{l}</label><input
))}
<button style={{...btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:
<div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#3a2a10'}
</>)}
</div>
</div>
);
}
// ── Dashboard ──────────────────────────────────────────────────────
const tabs=[['mercado','⚔ MERCADO'],['painel',' MEU PAINEL'],['negocios',' NEGOCIAÇÕES
return(
<div style={{fontFamily:"'VT323',monospace",background:BG,minHeight:'100vh',color:'#c8a87
{/* ── Header ── */}
<header className="tab-bar" style={{background:`linear-gradient(to bottom,#1a1000,#0d08
<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'11px',color:G,textShad
<span style={{fontSize:'18px'}}> </span> TURVA TRADER
</div>
{tabs.map(([id,label])=>(
<button key={id} className={`tab-btn ${tab===id?'tab-a':'tab-i'}`}
style={{padding:'0 16px',fontSize:'12px',fontFamily:"'Press Start 2P',monospace",
onClick={()=>setTab(id)}>
{label}{id==='mod'&&pendingTrades.length>0&&<span style={{marginLeft:'6px',backgr
</button>
))}
<div style={{flex:1}}/>
<div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px'}}>
<span style={{color:'#4a3010',fontSize:'16px'}}>◈ <span style={{color:G}}>{user?.us
{tab==='mercado'&&<button style={{...btnD,fontSize:'16px',padding:'5px 12px'}} onCl
{tab==='painel'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onCli
{tab==='negocios'&&<button style={{...btnY,fontSize:'16px',padding:'5px 12px'}} onC
<button style={{...btnG,fontSize:'16px',padding:'5px 10px'}} onClick={doLogout}>SAI
</div>
</header>
<Flash msg={msg}/>
{/* ══ MERCADO ══ */}
{tab==='mercado'&&(
<div style={{display:'flex',flexDirection:'column',height:isMobile?'auto':'calc(100vh
<div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px
<span style={{fontSize:'20px'}}>⚔</span>
<div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,
</div>
<div style={{flex:1,overflow:'auto',padding:'18px',background:'#090600'}}>
{!selRaro?(
<div>
<div style={{...secHdr,gap:'12px'}}>
<span>◆ {sortedURaros.length} RAROS — clique nas colunas para ordenar</span
<div style={{display:'flex',gap:'8px',alignItems:'center'}}>
<input className="inp" style={{...inp,width:'180px',padding:'4px 10px',fo
{(mSort!=='lastDate'||mSortDir!=='desc'||search)&&(
<button style={{...btnG,fontSize:'15px',padding:'4px 10px',color:'#aa88
)}
</div>
</div>
<div style={{...card,overflowX:'auto',padding:0}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>
<th style={th}></th>
{[['RARO','raro'],['CATEGORIA','categoria'],['MÉDIA ÚLT.10','avgPrice']
<th key={col} style={{...th,cursor:'pointer',userSelect:'none'}} onCl
{label}{mSort===col?<span style={{marginLeft:'4px',color:G}}>{mSort
</th>
))}
<th style={th}></th>
</tr></thead>
<tbody>
{mItems.map((item,i)=>{
const cat=rarities.find(r=>r.raro===item.raro);
return(
<tr key={item.raro} className="rrow" style={{background:i%2===0?'#0
<td style={{...td,width:'44px',padding:'4px 8px'}} onClick={()=>s
<td style={{...td,color:G,fontWeight:'bold'}} onClick={()=>setSel
<td style={td} onClick={()=>setSelRaro(item.raro)}><Badge cat={it
<td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'13px',c
<td style={{...td,color:'#aa8855'}} onClick={()=>setSelRaro(item.
<td style={{...td,color:'#664400'}} onClick={()=>setSelRaro(item.
<td style={{...td,color:'#4a3010'}} onClick={()=>setSelRaro(item.
<td style={td}><button style={{...btnD,padding:'4px 10px',fontSiz
</tr>
);
})}
{!sortedURaros.length&&<tr><td colSpan={8} style={{...td,textAlign:'cen
</tbody>
</table>
<Paginator page={mPage} setPage={setMPage} total={sortedURaros.length} isMo
</div>
</div>
):(
<div className="anim">
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-s
<div>
<button style={{...btnG,fontSize:'15px',padding:'4px 10px',marginBottom:'
<div style={{fontFamily:"'Press Start 2P'",fontSize:'14px',color:G,margin
<Badge cat={selInfo?.categoria||''}/>
</div>
<button style={{...btnD,padding:'7px 14px',fontSize:'17px'}} onClick={()=>{
</div>
{selCatalog&&(
<div style={{...card,padding:'14px 18px',marginBottom:'16px',display:'flex'
{selCatalog.imagem_url&&<Img url={selCatalog.imagem_url} alt={selRaro} si
<div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center
<div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#4a301
{selCatalog.preco_catalogo>=0&&<div><div style={{fontSize:'13px',color:
{selCatalog.pixels>=0&&selCatalog.pixels!==null&&<div><div style={{font
{selCatalog.data_lancamento&&['Raro Exclusivo','Raro Rotativo','Raro Co
</div>
</div>
)}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px
{[{l:'MÉDIA ÚLT.10',v:`${selInfo?.avgPrice||0}c`,hi:true},{l:'ÚLTIMO PREÇO'
<div key={s.l} style={{...card,padding:'12px',textAlign:'center',border:s
<div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a301
<div style={{color:s.hi?G:'#aa8855',fontSize:'20px'}}>{s.v}</div>
</div>
))}
</div>
{chartData.length>1&&(
<div style={{...card,marginBottom:'16px',padding:0}}>
<div style={secHdr}>◆ EVOLUÇÃO DO PREÇO</div>
<div style={{padding:'16px 10px 10px 0',background:'#080500'}}>
<ResponsiveContainer width="100%" height={190}>
<LineChart data={chartData} margin={{top:5,right:20,left:10,bottom:5}
<CartesianGrid strokeDasharray="3 3" stroke="#1a1000" vertical={fal
<XAxis dataKey="date" tickFormatter={v=>fmtDate(v)} tick={{fill:'#4
<YAxis tick={{fill:'#4a3010',fontSize:12,fontFamily:"'VT323',monosp
<Tooltip content={<ChartTip/>}/>
<Line type="monotone" dataKey="preco" stroke={G} strokeWidth={2.5}
</LineChart>
</ResponsiveContainer>
</div>
</div>
)}
<div style={{...card,marginBottom:'16px',padding:0}}>
<div style={secHdr}>◆ MÉDIA POR DIA</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>{['DATA','NEG.','MÉDIA/UN'].map(h=><th key={h} style={th}>{h}<
<tbody>{dailyAvg.map((row,i)=>(
<tr key={row.date} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
<td style={{...td,color:'#7a5a30'}}>{fmtDate(row.date)}</td>
<td style={{...td,color:'#664400'}}>{row.count}</td>
<td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'13p
</tr>
))}</tbody>
</table>
</div>
<div style={{...card,padding:0}}>
<div style={secHdr}>◆ HISTÓRICO COMPLETO</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>{['DATA','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LA
<tbody>
{!selTrades.length&&<tr><td colSpan={7} style={{...td,textAlign:'cent
{selTrades.map((t,i)=>(
<tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0800
<td style={{...td,color:'#6a4a20'}}>{fmtDate(t.data)}</td>
<td style={{...td,color:'#7a5a30'}}>{t.quantidade}</td>
<td style={{...td,color:'#aa8855'}}>{t.precoVenda}c</td>
<td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:
<td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
<td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
<td style={{...td,color:'#4a3010',fontSize:'15px'}}>{t.lancadoPor
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
<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overfl
<div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px
<span style={{fontSize:'20px'}}> </span>
<div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,
</div>
<div style={{overflow:'auto',flex:1,padding:'18px',background:'#090600'}}>
<div className="stat-grid" style={{display:'grid',gridTemplateColumns:isMobile?'1fr
{[
{l:'BALANÇO ATUAL',v:`${totals.balanco>=0?'+':''}${totals.balanco}c`,sub:totals
{l:'LUCRO TOTAL',v:`${totals.lucroTotal>=0?'+':''}${totals.lucroTotal}c`,sub:'d
{l:'CAPITAL INVESTIDO',v:`${totals.inv}c`,sub:'total comprado',color:'#7bb8ff'}
{l:'CAPITAL PARADO',v:`${totals.parado}c`,sub:'em estoque',color:G},
{l:'MARGEM DE LUCRO',v:totals.comVendas?`${totals.margem>=0?'+':''}${totals.mar
].map(s=>(
<div key={s.l} style={{...card,padding:'14px 18px',border:`1px solid ${s.color}
<div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',mar
<div style={{color:s.color,fontSize:'26px',marginBottom:'4px',fontWeight:'bol
<div style={{color:'#4a3010',fontSize:'15px'}}>{s.sub}</div>
</div>
))}
</div>
<div style={{...card,padding:0}}>
<div style={secHdr}>
<span>◆ RESUMO POR RARO — {filteredPStats.length} itens</span>
<div style={{display:'flex',gap:'8px',alignItems:'center'}}>
<input className="inp" style={{...inp,width:'130px',padding:'4px 10px',fontSi
{(pSort!=='raro'||pSortDir!=='asc'||pSearch)&&(
<button style={{...btnG,fontSize:'15px',padding:'4px 10px',color:'#aa8855',
)}
</div>
</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>
{[['',''],['RARO','raro'],['COMPRADOS','comprados'],['VENDIDOS','vendidos']
<th key={label||col} style={{...th,...(col?{cursor:'pointer',userSelect:'
onClick={()=>{if(!col)return;if(pSort===col)setPSortDir(d=>d==='asc'?'d
{label}{col&&pSort===col?<span style={{marginLeft:'4px',color:G}}>{pSor
</th>
))}
</tr></thead>
<tbody>
{!filteredPStats.length&&<tr><td colSpan={10} style={{...td,textAlign:'cent
{pItems.map((item,i)=>{
const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;
return(
<tr key={item.raro} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
<td style={{...td,width:'44px',padding:'4px 8px'}}><Img url={img} alt={
<td style={{...td,color:G,fontWeight:'bold'}}>{item.raro}</td>
<td style={{...td,color:'#7bb8ff'}}>{item.comprados}</td>
<td style={{...td,color:'#7dffaa'}}>{item.vendidos}</td>
<td style={{...td,color:item.estoque>0?G:'#4a3010'}}>{item.estoque}</td
<td style={{...td,color:'#aa8855'}}>{item.custo}c</td>
<td style={{...td,color:'#7bb8ff'}}>{item.investido}c</td>
<td style={{...td,color:'#7dffaa'}}>{item.vendido}c</td>
<td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'11px',color:i
<td style={{...td,whiteSpace:'nowrap'}}>
<div style={{display:'flex',gap:'5px'}}>
<button style={btnD} onMouseEnter={e=>{e.currentTarget.style.backgr
<button style={{...btnRed,padding:'4px 8px'}} onMouseEnter={e=>{e.c
</div>
</td>
</tr>
);})}
</tbody>
</table>
<Paginator page={pPage} setPage={setPPage} total={filteredPStats.length} </div>
</div>
</div>
</div>
isMobi
)}
{/* ══ NEGOCIAÇÕES ══ */}
{tab==='negocios'&&(
<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 90px)',overfl
<div style={{background:'linear-gradient(135deg,#1a1000,#0f0800)',borderBottom:'2px
<span style={{fontSize:'20px'}}> </span>
<div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color:G,
</div>
<div style={{overflow:'auto',flex:1,padding:'18px',background:'#090600'}}>
<div style={{display:'flex',gap:'8px',marginBottom:'16px',alignItems:'center'}}>
<span style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#4a3010',margin
{[['todos','TODOS'],['compra','COMPRO'],['venda','VENDO']].map(([v,l])=>(
<button key={v} style={{...btnG,fontSize:'17px',padding:'6px 14px',...(orderFil
))}
<span style={{color:'#3a2a10',fontSize:'16px',marginLeft:'8px'}}>{filteredOrders.
</div>
{!filteredOrders.length&&<div style={{...card,padding:'48px',textAlign:'center',col
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr)
{filteredOrders.map(order=>{
const isOwn=order.username===user?.username,canEdit=isOwn||user?.is_admin;
const isBuy=order.tipo==='compra';
return(
<div key={order.id} style={{...card,padding:'16px',border:`1px solid ${isBuy?
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex
<div>
<span style={{background:isBuy?'#69db7c22':'#f6622',border:`1px solid $
{isBuy?' COMPRO':' VENDO'}
</span>
</div>
<div style={{color:'#664400',fontSize:'15px',marginTop:'6px'}}>por <spa
<div style={{textAlign:'right'}}>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:new Dat
{canEdit&&<div style={{display:'flex',gap:'4px',marginTop:'6px',justify
<button style={{...btnD,padding:'3px 8px',fontSize:'16px'}} onClick={
<button style={{...btnRed,padding:'3px 8px',fontSize:'16px'}} onMouse
</div>}
</div>
</div>
<div style={{borderTop:`1px solid #1a1000`,paddingTop:'10px'}}>
{order.items.map((it,i)=>{
const img=rarities.find(r=>r.raro===it.raro)?.imagem_url;
return(
<div key={i} style={{display:'flex',alignItems:'center',gap:'10px',pa
<Img url={img} alt={it.raro} size={30}/>
<div style={{flex:1}}>
<div style={{color:'#c8a870',fontSize:'17px'}}>{it.raro}</div>
<div style={{color:'#4a3010',fontSize:'15px'}}>Qtd: {it.quantidad
</div>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'12px',color:G,
</div>
);
})}
</div>
</div>
{order.observacao&&<div style={{marginTop:'10px',color:'#664400',fontSize:'
);
})}
</div>
</div>
</div>
)}
{/* ══ MODERAÇÃO ══ */}
{tab==='mod'&&user?.is_admin&&(
<div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px',background:'#
{pendingTrades.length===0
?<div style={{...card,padding:'20px',textAlign:'center',color:'#3a2a10',fontSize:
:<div style={{...card,padding:0,marginBottom:'18px'}}>
<div style={{...secHdr,color:'#f66'}}>◆ AGUARDANDO APROVAÇÃO — {pendingTrades.l
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR',
<tbody>{modPItems.map((t,i)=>(
<tr key={t.id} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
<td style={{...td,color:'#6a4a20'}}>{fmtDate(t.data)}</td>
<td style={{...td,color:G,fontWeight:'bold'}}>{t.raro}</td>
<td style={{...td,color:'#7a5a30'}}>{t.quantidade}</td>
<td style={{...td,color:'#aa8855'}}>{t.preco_venda}c</td>
<td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'
<td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
<td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
<td style={{...td,color:'#4a3010',fontSize:'15px'}}>{t.lancadoPor||'—'}
<td style={{...td,whiteSpace:'nowrap'}}>
<div style={{display:'flex',gap:'5px'}}>
<button style={btnGreen} onMouseEnter={e=>{e.currentTarget.style.ba
<button style={{...btnD,padding:'4px 10px',fontSize:'17px'}} <button style={btnRed} onMouseEnter={e=>{e.currentTarget.style.back
</div>
</td>
</tr>
))}</tbody>
</table>
<Paginator page={modPPage} setPage={setModPPage} total={pendingTrades.length}
</div>
</div>}
<div style={{...card,padding:0}}>
<div style={secHdr}>
<span>◆ NEGOCIAÇÕES APROVADAS — {trades.length}</span>
<input className="inp" style={{...inp,width:'180px',padding:'4px 10px',fontSize
</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','L
<tbody>{modAItems.map((t,i)=>(
<tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0800':'#0a06
<td style={{...td,color:'#6a4a20'}}>{fmtDate(t.data)}</td>
<td style={{...td,color:G,fontWeight:'bold'}}>{t.raro}</td>
<td style={{...td,color:'#7a5a30'}}>{t.quantidade}</td>
onMous
<td style={{...td,color:'#aa8855'}}>{t.precoVenda}c</td>
<td style={{...td,color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'}}
<td style={{...td,color:'#7bb8ff'}}>{t.vendedor}</td>
<td style={{...td,color:'#7dffaa'}}>{t.comprador}</td>
<td style={{...td,color:'#4a3010',fontSize:'15px'}}>{t.lancadoPor||'—'}</
<td style={{...td,whiteSpace:'nowrap'}}>
<div style={{display:'flex',gap:'5px'}}>
<button style={{...btnD,padding:'4px 10px',fontSize:'17px'}} onMouseE
<button style={btnRed} onMouseEnter={e=>{e.currentTarget.style.backgr
</div>
</td>
</tr>
))}</tbody>
</table>
<Paginator page={modAPage} setPage={setModAPage} total={modATotal} isMobile={is
</div>
</div>
{/* Chat moderation */}
<div style={{...card,padding:0,marginTop:'18px'}}>
<div style={secHdr}>
<span>◆ MODERAÇÃO DO CHAT — {messages.length} mensagens</span>
<input className="inp" style={{...inp,width:'160px',padding:'4px 10px',fontSize
</div>
<div style={{overflowX:'auto',maxHeight:'300px',overflow:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
<thead><tr>{['HORA','USUÁRIO','MENSAGEM',''].map(h=><th key={h} style={th}>{h
<tbody>
{modCItems.map((m,i)=>(
<tr key={m.id} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
<td style={{...td,color:'#4a3010',width:'60px'}}>{fmtTime(m.created_at)
<td style={{...td,color:G,whiteSpace:'nowrap'}}>{m.username}</td>
<td style={{...td,color:'#c8a870',maxWidth:'400px',whiteSpace:'normal',
<td style={td}>
<button style={{...btnRed,padding:'3px 8px',fontSize:'16px'}} onMouse
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
{!messages.length&&<tr><td colSpan={4} style={{...td,textAlign:'center',col
<Paginator page={modCPage} setPage={setModCPage} total={modCTotal} isMobile={is
{/* User panel viewer */}
<div style={{...card,padding:0,marginTop:'18px'}}>
<div style={secHdr}>◆ PAINEL DE USUÁRIO</div>
<div style={{padding:'12px 16px',borderBottom:'1px solid #1a1000',display:'flex',
<select style={{...sel,width:'220px',padding:'6px 10px',fontSize:'17px'}} value
<option value="">— selecionar usuário —</option>
{allUsers.map(u=><option key={u.id} value={u.username}>{u.username}{u.is_admi
</select>
<button style={{...btnY,padding:'6px 16px',fontSize:'17px'}} onClick={()=>loadV
{viewUserData&&<button style={{...btnG,padding:'6px 12px',fontSize:'16px'}} onC
</div>
{viewUserData&&(
<div style={{padding:'14px'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px
{[
{l:'BALANÇO',v:`${viewUserData.totals.balanco>=0?'+':''}${viewUserData.to
{l:'LUCRO TOTAL',v:`${viewUserData.totals.lucroTotal>=0?'+':''}${viewUser
{l:'INVESTIDO',v:`${viewUserData.totals.inv}c`,color:'#7bb8ff'},
{l:'PARADO',v:`${viewUserData.totals.parado}c`,color:G},
].map(s=>(
<div key={s.l} style={{...card,padding:'10px',textAlign:'center',border:`
<div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a301
<div style={{color:s.color,fontSize:'20px',fontWeight:'bold'}}>{s.v}</d
</div>
))}
</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:'16px'}}>
<thead><tr>{['RARO','COMPRADOS','VENDIDOS','ESTOQUE','CUSTO MÉD','INVESTI
<tbody>
{!viewUserData.stats.length&&<tr><td colSpan={8} style={{...td,textAlig
{viewUserData.stats.map((item,i)=>(
<tr key={item.raro} style={{background:i%2===0?'#0d0800':'#0a0600'}}>
<td style={{...td,color:G,fontWeight:'bold'}}>{item.raro}</td>
<td style={{...td,color:'#7bb8ff'}}>{item.comprados}</td>
<td style={{...td,color:'#7dffaa'}}>{item.vendidos}</td>
<td style={{...td,color:item.estoque>0?G:'#4a3010'}}>{item.estoque}
<td style={{...td,color:'#aa8855'}}>{item.custo}c</td>
<td style={{...td,color:'#7bb8ff'}}>{item.investido}c</td>
<td style={{...td,color:'#7dffaa'}}>{item.vendido}c</td>
<td style={{...td,fontFamily:"'Press Start 2P'",fontSize:'11px',col
</tr>
))}
</tbody>
</table>
</div>
</div>
)}
{viewUser&&!viewUserData&&<div style={{padding:'20px',textAlign:'center',color:'#
</div>
</div>
)}
{/* ══ CHAT WIDGET ══ */}
<div className="chat-widget" style={{position:'fixed',bottom:'32px',right:'20px',zIndex
{/* Header */}
<div onClick={()=>setChatOpen(p=>!p)} style={{background:`linear-gradient(135deg,#1a1
<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:G,display
CHAT
<span style={{background:'#1a1800',border:`1px solid ${G2}`,color:'#aa8833',paddi
</div>
<span style={{color:G,fontSize:'18px',lineHeight:1}}>{chatOpen?'▼':'▲'}</span>
</div>
{/* Body */}
{chatOpen&&(
<div style={{background:'#0a0600',border:`2px solid ${G}`,borderTop:'none',display:
{/* Messages */}
<div ref={chatRef} style={{height:'240px',overflow:'auto',padding:'10px',display:
{!messages.length&&<div style={{color:'#3a2a10',fontSize:'16px',textAlign:'cent
{messages.map(m=>{
const isMe=m.username===user?.username;
return(
<div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:is
<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'8px',color
<div style={{background:isMe?'#1a1000':'#130f0a',border:`1px solid ${isMe
{m.message}
</div>
</div>
);
})}
</div>
{/* Input */}
<div style={{borderTop:`1px solid #1a1000`,padding:'8px',display:'flex',gap:'6px'
<input className="inp" style={{...inp,flex:1,padding:'7px 10px',fontSize:'17px'
<button style={{...btnY,padding:'7px 12px',fontSize:'18px',flexShrink:0}} onCli
</div>
</div>
)}
</div>
{/* ══ QUICK INFO MODAL (catálogo) ══ */}
<Modal show={!!quickRaro} onClose={()=>setQuickRaro(null)} title={` ${quickRaro||''}`
{quickRaro&&quickCatalog&&(
<div>
<div style={{display:'flex',gap:'20px',marginBottom:'18px',alignItems:'flex-start
{quickCatalog.imagem_url&&<Img url={quickCatalog.imagem_url} alt={quickRaro} si
<div style={{flex:1}}>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'13px',color:G,marginBott
<Badge cat={quickCatalog.categoria||quickInfo?.categoria||''}/>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom
{[
{l:'PREÇO DE LANÇAMENTO',v:`${quickCatalog.preco_catalogo??'—'}c`,c:'#e599f7'
{l:'PIXELS',v:quickCatalog.pixels!=null?`${quickCatalog.pixels}px`:'—',c:'#63
...(['Raro Exclusivo','Raro Rotativo','Raro Colecionável'].includes(quickCata
{l:'CATEGORIA',v:quickCatalog.categoria||'—',c:'#aaa'},
].map(s=>(
<div key={s.l} style={{...card,padding:'12px',textAlign:'center'}}>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a3010',m
<div style={{color:s.c,fontSize:'18px'}}>{s.v}</div>
</div>
))}
</div>
{quickInfo?.count>0&&(
<div style={{borderTop:`1px solid #1a1000`,paddingTop:'14px'}}>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#4a3010',mar
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
{[{l:'MÉDIA ÚLT.10',v:`${quickInfo.avgPrice}c`,c:G},{l:'ÚLTIMO',v:`${quickI
<div key={s.l} style={{...card,padding:'10px',textAlign:'center'}}>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#4a301
<div style={{color:s.c,fontSize:'17px'}}>{s.v}</div>
</div>
))}
</div>
</div>
)}
</div>
<button style={{...btnY,width:'100%',textAlign:'center',marginTop:'16px',fontSize
)}
{quickRaro&&!quickCatalog&&(
<div style={{textAlign:'center',padding:'32px',color:'#4a3010',fontSize:'17px'}}>Es
)}
</Modal>
{/* ══ MODALS ══ */}
{/* Registrar Negociação */}
<Modal show={showTM} onClose={()=>setShowTM(false)} title="◆ REGISTRAR NEGOCIAÇÃO">
<Flash msg={msg}/>
<div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input className=
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13
<div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type
<div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={inp}
</div>
{tF.precoVenda!==''&&parseInt(tF.quantidade)>=1&&<div style={{background:'#080500',bo
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13
<div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} placeh
<div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} place
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20
<div><label style={lbl}>CATEGORIA *</label><select className="inp" style={sel} valu
<div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="date
</div>
<div style={{display:'flex',gap:'10px'}}>
<button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={
<button style={btnG} onClick={()=>setShowTM(false)}>CANCELAR</button>
</div>
</Modal>
width=
{/* Registrar Operação */}
<Modal show={showOM} onClose={()=>setShowOM(false)} title="◆ REGISTRAR OPERAÇÃO" <Flash msg={msg}/>
<div style={{marginBottom:'14px'}}>
<label style={lbl}>TIPO *</label>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
{[['compra',' COMPRA'],['venda',' VENDA']].map(([v,l])=>(
<button key={v} style={{...btnD,textAlign:'center',fontSize:'18px',background:o
))}
</div>
</div>
<div style={{marginBottom:'13px'}}>
<label style={lbl}>RARO *</label>
<input className="inp" style={inp} placeholder="ex: Holo Mano" value={oF.raro} onCh
<datalist id="rl2">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}{rarities.
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13
<div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} type
<div>
<label style={lbl}>
<span style={{cursor:'pointer',color:oF.priceMode==='total'?G:'#664400',textDec
<span style={{color:'#3a2a10',margin:'0 6px'}}>|</span>
<span style={{cursor:'pointer',color:oF.priceMode==='unit'?G:'#664400',textDeco
</label>
{oF.priceMode==='total'
?<input className="inp" style={inp} type="number" min="0" placeholder="preço to
:<input className="inp" style={inp} type="number" min="0" placeholder="preço/un
}
</div>
</div>
{/* Preview */}
{(oF.precoTotal!==''||oF.precoPorUnidade!=='')&&parseInt(oF.quantidade)>=1&&(()=>{
const qtd=Math.max(1,parseInt(oF.quantidade)||1);
const pt=oF.priceMode==='total'?parseFloat(oF.precoTotal||0):parseFloat(oF.precoPor
const ppu=oF.priceMode==='unit'?parseFloat(oF.precoPorUnidade||0):Math.round(pt/qtd
return<div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12p
<span>Total: <span style={{color:'#aa8855'}}>{pt===0?'0 (presente!)':Math.round(p
<span>Por un: <span style={{color:G,fontFamily:"'Press Start 2P'",fontSize:'12px'
</div>;
})()}
{/* Catalog price button */}
{oF.raro&&rarities.find(r=>r.raro===oF.raro)&&(
<button style={{...btnD,width:'100%',textAlign:'center',marginBottom:'13px',fontSiz
Usar preço do catálogo ({rarities.find(r=>r.raro===oF.raro)?.preco_catalogo??0
</button>
)}
<div style={{marginBottom:'20px'}}><label style={lbl}>DATA *</label><input className=
<div style={{display:'flex',gap:'10px'}}>
<button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={
<button style={btnG} onClick={()=>setShowOM(false)}>CANCELAR</button>
</div>
</Modal>
{/* Nova/Editar Ordem */}
<Modal show={showOrderModal} onClose={()=>{setShowOrderModal(false);setEditingOrder(nul
<div style={{marginBottom:'14px'}}>
<label style={lbl}>TIPO *</label>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
{[['compra',' COMPRO'],['venda',' VENDO']].map(([v,l])=>(
<button key={v} style={{...btnD,textAlign:'center',fontSize:'18px',background:o
))}
</div>
</div>
<div style={{fontFamily:"'Press Start 2P'",fontSize:'9px',color:'#4a3010',marginBotto
{orderForm.items.map((it,i)=>(
<div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 100px 32px',gap:'
<div>{i===0&&<label style={{...lbl,marginBottom:'4px'}}>RARO</label>}<input class
<div>{i===0&&<label style={{...lbl,marginBottom:'4px'}}>QTD</label>}<input classN
<div>{i===0&&<label style={{...lbl,marginBottom:'4px'}}>PREÇO/UN</label>}<input c
<button style={{...btnRed,padding:'9px 8px',fontSize:'18px'}} onMouseEnter={e=>{e
</div>
))}
<datalist id="rl-ord">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalis
<button style={{...btnG,width:'100%',textAlign:'center',marginBottom:'14px',fontSize:
<div style={{marginBottom:'20px'}}><label style={lbl}>OBSERVAÇÃO (opcional)</label><i
<div style={{background:'#080500',border:`1px solid #1a1000`,padding:'8px 12px',margi
Ativa por <span style={{color:G}}>72 horas</span> e desaparece automaticamente.
</div>
<div style={{display:'flex',gap:'10px'}}>
<button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick={
<button style={btnG} onClick={()=>{setShowOrderModal(false);setEditingOrder(null);s
</div>
</Modal>
{/* Editar Trade */}
<Modal show={showEditModal&&!!editingTrade} onClose={()=>{setShowEditModal(false);setEd
{editingTrade&&<>
<div style={{marginBottom:'13px'}}><label style={lbl}>RARO *</label><input classNam
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'
<div><label style={lbl}>QUANTIDADE *</label><input className="inp" style={inp} ty
<div><label style={lbl}>PREÇO TOTAL (c) *</label><input className="inp" style={in
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'
<div><label style={lbl}>VENDEDOR *</label><input className="inp" style={inp} valu
<div><label style={lbl}>COMPRADOR *</label><input className="inp" style={inp} val
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'
<div><label style={lbl}>CATEGORIA *</label><select className="inp" style={sel} va
<div><label style={lbl}>DATA *</label><input className="inp" style={inp} type="da
</div>
<div style={{display:'flex',gap:'10px'}}>
<button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick
<button style={btnG} onClick={()=>{setShowEditModal(false);setEditingTrade(null);
</div>
</>}
</Modal>
{/* Editar Portfólio */}
<Modal show={showPEdit&&!!editingP} onClose={()=>{setShowPEdit(false);setEditingP(null)
{editingP&&<>
<div style={{color:G,fontSize:'22px',marginBottom:'16px',borderBottom:`1px solid #1
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'
<div><label style={lbl}>QTD COMPRADA</label><input className="inp" style={inp} ty
<div><label style={lbl}>TOTAL INVESTIDO (c)</label><input className="inp" style={
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'
<div><label style={lbl}>QTD VENDIDA</label><input className="inp" style={inp} typ
<div><label style={lbl}>TOTAL RECEBIDO (c)</label><input className="inp" style={i
</div>
<div style={{display:'flex',gap:'10px'}}>
<button style={{...btnY,flex:1,textAlign:'center',opacity:loading?0.6:1}} onClick
<button style={btnG} onClick={()=>{setShowPEdit(false);setEditingP(null);}}>CANCE
</div>
</>}
</Modal>
}
);
{/* Footer */}
<footer style={{position:'fixed',bottom:0,left:0,right:0,height:'32px',background:`line
Feito com amor por:{' '}<a href="http://turva.com.br/home/Bot" target="_blank" </footer>
</div>
rel="n
