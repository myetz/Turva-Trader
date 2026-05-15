import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase.js";

const CATS = ['Raro Exclusivo','Mobi HC','Raro Rotativo','Raro Comum','Raro Colecionável','Ecotron','Outros'];
const CAT_COLORS = {
  'Raro Exclusivo':'#ff6b35','Mobi HC':'#4dabf7','Raro Rotativo':'#69db7c',
  'Raro Comum':'#aaa','Raro Colecionável':'#e599f7','Ecotron':'#63e6be','Outros':'#868e96'
};

function fmtDate(s){if(!s)return'-';const p=String(s).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(s);}
function calcAvg(arr){return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;}

function Badge({cat}){
  const c=CAT_COLORS[cat]||'#aaa';
  return<span style={{background:c+'22',border:`1px solid ${c}44`,color:c,padding:'2px 8px',fontSize:'13px'}}>{cat}</span>;
}

function Msg({msg}){
  if(!msg?.text)return null;
  const m={error:{bg:'#1a0000',b:'#ff4444',t:'#ff8888'},success:{bg:'#001a00',b:'#44ff44',t:'#88ff88'},info:{bg:'#1a1100',b:'#FFD700',t:'#FFD700'}};
  const c=m[msg.type]||m.info;
  return<div style={{background:c.bg,borderBottom:`2px solid ${c.b}`,padding:'10px 24px',fontSize:'18px',color:c.t,textAlign:'center'}}>{msg.text}</div>;
}

function ChartTip({active,payload,label}){
  if(!active||!payload?.length)return null;
  return<div style={{background:'#1a1510',border:'2px solid #FFD700',padding:'8px 14px',fontFamily:"'VT323',monospace"}}><div style={{color:'#aaaaaa',fontSize:'16px',marginBottom:'2px'}}>{fmtDate(label)}</div><div style={{color:'#FFD700',fontFamily:"'Press Start 2P',monospace",fontSize:'13px'}}>{payload[0].value}c</div></div>;
}

export default function App() {
  const [screen,setScreen]=useState('loading');
  const [tab,setTab]=useState('mercado');
  const [user,setUser]=useState(null);
  const [trades,setTrades]=useState([]);
  const [rarities,setRarities]=useState([]);
  const [portfolio,setPortfolio]=useState([]);
  const [pendingTrades,setPendingTrades]=useState([]);
  const [showEditModal,setShowEditModal]=useState(false);
  const [editingTrade,setEditingTrade]=useState(null);
  const [modSearch,setModSearch]=useState('');
  const [search,setSearch]=useState('');
  const [selRaro,setSelRaro]=useState(null);
  const [showTM,setShowTM]=useState(false);
  const [showOM,setShowOM]=useState(false);
  const [msg,setMsg]=useState({text:'',type:'info'});
  const [loading,setLoading]=useState(false);
  const [lF,setLF]=useState({u:'',p:''});
  const [rF,setRF]=useState({u:'',p:'',c:''});
  const today=new Date().toISOString().split('T')[0];
  const eT={raro:'',quantidade:1,categoria:'Raro Exclusivo',precoVenda:'',data:today,vendedor:'',comprador:''};
  const eO={raro:'',quantidade:1,tipo:'compra',precoTotal:'',data:today};
  const [tF,setTF]=useState(eT);
  const [oF,setOF]=useState(eO);

  useEffect(()=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';document.head.appendChild(link);
    const style=document.createElement('style');
    style.textContent=`*{box-sizing:border-box;margin:0;padding:0}body{background:#080808;overflow:hidden}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:#111111}::-webkit-scrollbar-thumb{background:#444444}::-webkit-scrollbar-thumb:hover{background:#FFD700}input,select,button{font-family:'VT323',monospace}@keyframes sd{from{transform:translateY(-14px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}.anim{animation:sd 0.22s ease}.blink{animation:blink 1.3s infinite}.rrow:hover{background:#1a1600!important;cursor:pointer}.ch:hover{border-left-color:#FFD700!important;background:#130f06!important;cursor:pointer}.cs{border-left-color:#FFD700!important;background:#1a1600!important}.inp:focus{outline:none!important;border-color:#FFD700!important}.ta{background:#1a1500!important;color:#FFD700!important;border-bottom:3px solid #FFD700!important}.ti:hover{background:#130f06!important;color:#998855!important}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.8) sepia(1) saturate(5) hue-rotate(5deg);cursor:pointer}.del-btn:hover{background:#ff4444!important;color:#fff!important;border-color:#ff4444!important}`;
    document.head.appendChild(style);
    const su=localStorage.getItem('tt-user');
    if(su){const u=JSON.parse(su);setUser(u);loadAll(u.username);setScreen('dashboard');}
    else setScreen('login');
  },[]);

  async function loadAll(uname){
    const un=uname||user?.username;
    // Fetch current user to get is_admin flag
    const {data:uData}=await supabase.from('users').select('is_admin').eq('username',un).maybeSingle();
    const isAdm=uData?.is_admin||false;
    const queries=[
      supabase.from('trades').select('*').eq('status','approved').order('data',{ascending:true}),
      supabase.from('rarities').select('*'),
      supabase.from('portfolio').select('*').eq('username',un).order('data',{ascending:false}),
    ];
    if(isAdm) queries.push(supabase.from('trades').select('*').eq('status','pending').order('created_at',{ascending:false}));
    const results=await Promise.all(queries);
    const [tRes,rRes,pRes,pendRes]=results;
    if(tRes.data)setTrades(tRes.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por})));
    if(rRes.data)setRarities(rRes.data);
    if(pRes.data)setPortfolio(pRes.data.map(x=>({...x,precoTotal:x.preco_total,precoPorUnidade:x.preco_por_unidade})));
    if(pendRes?.data)setPendingTrades(pendRes.data.map(x=>({...x,precoVenda:x.preco_venda,precoPorUnidade:x.preco_por_unidade,lancadoPor:x.lancado_por})));
    // Store admin flag in user object
    setUser(prev=>prev?{...prev,is_admin:isAdm}:prev);
  }

  function flash(text,type='info'){setMsg({text,type});setTimeout(()=>setMsg({text:'',type:'info'}),3000);}

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

  function doLogout(){setUser(null);setSelRaro(null);setTrades([]);setPortfolio([]);setRarities([]);localStorage.removeItem('tt-user');setScreen('login');}

  async function doAddTrade(){
    if(!tF.raro.trim()||!tF.precoVenda||!tF.vendedor.trim()||!tF.comprador.trim()||!tF.data){flash('Preencha todos os campos (*).','error');return;}
    const qtd=Math.max(1,parseInt(tF.quantidade)||1),pv=parseFloat(tF.precoVenda);
    if(isNaN(pv)||pv<=0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {data,error}=await supabase.from('trades').insert({raro:tF.raro.trim(),quantidade:qtd,categoria:tF.categoria,preco_venda:pv,preco_por_unidade:Math.round(pv/qtd),data:tF.data,vendedor:tF.vendedor.trim(),comprador:tF.comprador.trim(),lancado_por:user.username,status:'pending'}).select().single();
    setLoading(false);
    if(error||!data){flash('Erro ao salvar.','error');return;}
    await loadAll();setShowTM(false);setTF(eT);
    flash(user.is_admin?'Negociação registrada!':'Negociação enviada para aprovação! ⏳','success');
  }

  async function doAddOp(){
    if(!oF.raro.trim()||!oF.precoTotal||!oF.data){flash('Preencha todos os campos (*).','error');return;}
    const qtd=Math.max(1,parseInt(oF.quantidade)||1),pt=parseFloat(oF.precoTotal);
    if(isNaN(pt)||pt<=0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {error}=await supabase.from('portfolio').insert({username:user.username,raro:oF.raro.trim(),quantidade:qtd,tipo:oF.tipo,preco_total:pt,preco_por_unidade:Math.round(pt/qtd),data:oF.data});
    setLoading(false);
    if(error){flash('Erro ao salvar operação.','error');return;}
    await loadAll();setShowOM(false);setOF(eO);flash(`${oF.tipo==='compra'?'Compra':'Venda'} registrada!`,'success');
  }

  async function approveTrade(id){
    const {error}=await supabase.from('trades').update({status:'approved'}).eq('id',id);
    if(error){flash('Erro ao aprovar.','error');return;}
    await loadAll();flash('Negociação aprovada! ✅','success');
  }

  async function rejectTrade(id){
    if(!window.confirm('Rejeitar e excluir esta negociação?'))return;
    const {error}=await supabase.from('trades').delete().eq('id',id);
    if(error){flash('Erro ao rejeitar.','error');return;}
    await loadAll();flash('Negociação rejeitada e removida.','info');
  }

  async function adminDeleteTrade(id){
    if(!window.confirm('Excluir esta negociação permanentemente?'))return;
    const {error}=await supabase.from('trades').delete().eq('id',id);
    if(error){flash('Erro ao excluir.','error');return;}
    await loadAll();flash('Negociação excluída.','info');
  }

  function openEditTrade(t){
    setEditingTrade({
      id:t.id,raro:t.raro,quantidade:t.quantidade,categoria:t.categoria||'Raro Exclusivo',
      precoVenda:t.preco_venda||t.precoVenda,data:t.data,vendedor:t.vendedor,comprador:t.comprador
    });
    setShowEditModal(true);
  }

  async function doEditTrade(){
    if(!editingTrade)return;
    const qtd=Math.max(1,parseInt(editingTrade.quantidade)||1);
    const pv=parseFloat(editingTrade.precoVenda);
    if(isNaN(pv)||pv<=0){flash('Preço inválido.','error');return;}
    setLoading(true);
    const {error}=await supabase.from('trades').update({
      raro:editingTrade.raro.trim(),quantidade:qtd,categoria:editingTrade.categoria,
      preco_venda:pv,preco_por_unidade:Math.round(pv/qtd),
      data:editingTrade.data,vendedor:editingTrade.vendedor.trim(),comprador:editingTrade.comprador.trim()
    }).eq('id',editingTrade.id);
    setLoading(false);
    if(error){flash('Erro ao salvar edição.','error');return;}
    await loadAll();setShowEditModal(false);setEditingTrade(null);flash('Negociação atualizada!','success');
  }

  async function deleteOp(id){
    if(!window.confirm('Excluir esta operação?'))return;
    const {error}=await supabase.from('portfolio').delete().eq('id',id).eq('username',user.username);
    if(error){flash('Erro ao excluir.','error');return;}
    await loadAll();flash('Operação excluída.','info');
  }

  // ── Computed: Mercado ──
  const uRaros=useMemo(()=>{
    const map={};
    // Seed com TODOS os raros do catálogo (Base de Dados)
    rarities.forEach(r=>{ map[r.raro]={raro:r.raro,categoria:r.categoria||'Outros',items:[]}; });
    // Adiciona negociações por cima
    trades.forEach(t=>{
      if(!map[t.raro])map[t.raro]={raro:t.raro,categoria:t.categoria,items:[]};
      map[t.raro].items.push(t);
    });
    return Object.values(map).map(r=>{
      if(!r.items.length) return{...r,lastDate:null,avgPrice:0,lastPrice:0,count:0,trend:0};
      const sorted=[...r.items].sort((a,b)=>b.data.localeCompare(a.data));
      const last10=sorted.slice(0,10);
      const avg10=calcAvg(last10.map(t=>t.precoPorUnidade));
      const r5=sorted.slice(0,Math.min(5,sorted.length)),r5b=sorted.slice(Math.min(5,sorted.length),Math.min(10,sorted.length));
      const trend=r5b.length?calcAvg(r5.map(t=>t.precoPorUnidade))-calcAvg(r5b.map(t=>t.precoPorUnidade)):0;
      return{...r,lastDate:sorted[0].data,avgPrice:avg10,lastPrice:sorted[0].precoPorUnidade,count:r.items.length,trend};
    }).sort((a,b)=>{
      if(a.lastDate&&!b.lastDate)return -1;
      if(!a.lastDate&&b.lastDate)return 1;
      if(a.lastDate&&b.lastDate)return b.lastDate.localeCompare(a.lastDate);
      return a.raro.localeCompare(b.raro);
    });
  },[trades,rarities]);

  const filtered=useMemo(()=>{const s=search.toLowerCase();return s?uRaros.filter(r=>r.raro.toLowerCase().includes(s)||r.categoria.toLowerCase().includes(s)):uRaros;},[uRaros,search]);
  const selInfo=useMemo(()=>selRaro?uRaros.find(r=>r.raro===selRaro):null,[uRaros,selRaro]);
  const selCatalog=useMemo(()=>selRaro?rarities.find(r=>r.raro===selRaro):null,[rarities,selRaro]);
  const selTrades=useMemo(()=>selRaro?[...trades.filter(t=>t.raro===selRaro)].sort((a,b)=>b.data.localeCompare(a.data)):[],[trades,selRaro]);
  const chartData=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]=[];by[t.data].push(t.precoPorUnidade);});return Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,ps])=>({date,preco:calcAvg(ps)}));},[selTrades]);
  const dailyAvg=useMemo(()=>{const by={};selTrades.forEach(t=>{if(!by[t.data])by[t.data]=[];by[t.data].push(t.precoPorUnidade);});return Object.entries(by).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,ps])=>({date,avg:calcAvg(ps),count:ps.length}));},[selTrades]);

  // ── Computed: Painel ──
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

  const S={
    app:{fontFamily:"'VT323',monospace",background:'#080808',minHeight:'100vh',color:'#f0f0f0',fontSize:'18px'},
    hdr:{background:'#111111',borderBottom:'3px solid #FFD700',display:'flex',alignItems:'stretch',height:'58px',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 20px #00000099'},
    logo:{fontFamily:"'Press Start 2P',monospace",fontSize:'11px',color:'#FFD700',textShadow:'2px 2px 0 #664400',padding:'0 18px',display:'flex',alignItems:'center',borderRight:'2px solid #222222',flexShrink:0},
    tab:{padding:'0 22px',fontSize:'13px',fontFamily:"'Press Start 2P',monospace",cursor:'pointer',border:'none',borderRight:'1px solid #1a1200',borderBottom:'3px solid transparent',transition:'all 0.1s',background:'transparent',color:'#777777'},
    card:{background:'#111111',border:'2px solid #1f1800',boxShadow:'3px 3px 0 #0a0806'},
    sec:{fontFamily:"'Press Start 2P',monospace",fontSize:'9px',color:'#FFD700',padding:'10px 14px',background:'#161616',borderBottom:'2px solid #2a1f0d',letterSpacing:'1px'},
    inp:{background:'#0d0d0d',border:'2px solid #1f1800',color:'#FFD700',padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace",colorScheme:'dark'},
    sel:{background:'#0d0d0d',border:'2px solid #1f1800',color:'#FFD700',padding:'9px 12px',fontSize:'18px',width:'100%',fontFamily:"'VT323',monospace"},
    btnY:{background:'#FFD700',border:'2px solid #CCA800',color:'#000',padding:'9px 18px',fontSize:'19px',fontFamily:"'VT323',monospace",cursor:'pointer',boxShadow:'3px 3px 0 #664400',fontWeight:'bold',transition:'all 0.1s',letterSpacing:'1px'},
    btnD:{background:'#1a1100',border:'2px solid #FFD700',color:'#FFD700',padding:'9px 18px',fontSize:'19px',fontFamily:"'VT323',monospace",cursor:'pointer',boxShadow:'2px 2px 0 #443300',transition:'all 0.1s'},
    btnG:{background:'transparent',border:'2px solid #1f1800',color:'#777777',padding:'9px 14px',fontSize:'18px',fontFamily:"'VT323',monospace",cursor:'pointer'},
    btnDel:{background:'transparent',border:'2px solid #441111',color:'#883333',padding:'4px 10px',fontSize:'16px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'},
    th:{background:'#1a1a1a',color:'#FFD700',padding:'9px 12px',textAlign:'left',borderBottom:'2px solid #2a1a00',fontFamily:"'Press Start 2P',monospace",fontSize:'8px',letterSpacing:'0.5px',whiteSpace:'nowrap'},
    td:{padding:'8px 12px',borderBottom:'1px solid #160f04',color:'#d0d0d0',whiteSpace:'nowrap'},
  };

  if(screen==='loading')return<div style={{...S.app,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'Press Start 2P',monospace",fontSize:'14px',color:'#FFD700',textShadow:'2px 2px 0 #664400'}} className="blink">◈ TURVA TRADER ◈</span></div>;

  if(screen==='login'||screen==='register'){
    const isL=screen==='login';
    return(
      <div style={{...S.app,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'radial-gradient(ellipse at center,#181008 0%,#050402 80%)'}}>
        <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(#FFD70006 1px,transparent 1px),linear-gradient(90deg,#FFD70006 1px,transparent 1px)',backgroundSize:'48px 48px',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,textAlign:'center',marginBottom:'30px'}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:'20px',color:'#FFD700',textShadow:'3px 3px 0 #664400,0 0 40px #FFD70033',marginBottom:'10px'}}>◈ TURVA TRADER ◈</div>
          <div style={{color:'#666666',fontSize:'16px',letterSpacing:'3px'}}>◆ MERCADO DE RAROS ◆</div>
        </div>
        <div style={{...S.card,width:'390px',padding:'28px 32px',position:'relative',zIndex:1,border:'2px solid #FFD700',boxShadow:'6px 6px 0 #332200'}} className="anim">
          {['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'12px',height:'12px',background:'#FFD700',top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}
          <div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:'#FFD700',textAlign:'center',marginBottom:'22px',letterSpacing:'2px'}}>{isL?'» ENTRAR «':'» CRIAR CONTA «'}</div>
          <Msg msg={msg}/>
          {isL?(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','••••••']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'14px'}}><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'6px'}}>{l}</label><input className="inp" style={S.inp} type={t} placeholder={ph} value={lF[k]} onChange={e=>setLF({...lF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
            ))}
            <button style={{...S.btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?.6:1}} onClick={doLogin} disabled={loading}>{loading?'AGUARDE...':'ENTRAR →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#666666'}}>Sem conta? <span style={{color:'#FFD700',cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('register');setMsg({text:'',type:'info'});}}>Criar agora</span></div>
          </>):(<>
            {[['USUÁRIO','u','text','seu nickname'],['SENHA','p','password','mín. 4 caracteres'],['CONFIRMAR','c','password','repita a senha']].map(([l,k,t,ph])=>(
              <div key={k} style={{marginBottom:'13px'}}><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>{l}</label><input className="inp" style={S.inp} type={t} placeholder={ph} value={rF[k]} onChange={e=>setRF({...rF,[k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&doRegister()}/></div>
            ))}
            <button style={{...S.btnY,width:'100%',textAlign:'center',marginTop:'10px',opacity:loading?.6:1}} onClick={doRegister} disabled={loading}>{loading?'AGUARDE...':'CRIAR CONTA →'}</button>
            <div style={{textAlign:'center',marginTop:'18px',fontSize:'16px',color:'#666666'}}>Já tem conta? <span style={{color:'#FFD700',cursor:'pointer',textDecoration:'underline'}} onClick={()=>{setScreen('login');setMsg({text:'',type:'info'});}}>Entrar</span></div>
          </>)}
        </div>
      </div>
    );
  }

  return(
    <div style={S.app}>
      <header style={S.hdr}>
        <div style={S.logo}>◈ TURVA TRADER</div>
        <button className={`tab-btn ${tab==='mercado'?'ta':'ti'}`} style={{...S.tab}} onClick={()=>setTab('mercado')}>◆ MERCADO</button>
        <button className={`tab-btn ${tab==='painel'?'ta':'ti'}`} style={{...S.tab}} onClick={()=>setTab('painel')}>◆ MEU PAINEL</button>
        {user?.is_admin&&<button className={`tab-btn ${tab==='mod'?'ta':'ti'}`} style={{...S.tab,color:tab==='mod'?'#FFD700':pendingTrades.length>0?'#ff6b6b':'#443300',position:'relative'}} onClick={()=>setTab('mod')}>
          ◆ MODERAÇÃO{pendingTrades.length>0&&<span style={{marginLeft:'6px',background:'#ff4444',color:'#fff',borderRadius:'2px',padding:'1px 6px',fontSize:'12px',fontFamily:"'VT323',monospace"}}>{pendingTrades.length}</span>}
        </button>}
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'0 14px'}}>
          <span style={{color:'#666666',fontSize:'16px'}}>◈ <span style={{color:'#FFD700'}}>{user?.username}</span></span>
          {tab==='mercado'&&<button style={{...S.btnD,padding:'7px 14px',fontSize:'17px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro||'',categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR</button>}
          {tab==='painel'&&<button style={{...S.btnY,padding:'7px 14px',fontSize:'17px'}} onClick={()=>setShowOM(true)}>+ OPERAÇÃO</button>}
          <button style={{...S.btnG,fontSize:'16px',padding:'7px 12px'}} onClick={doLogout}>SAIR</button>
        </div>
      </header>
      <Msg msg={msg}/>

      {/* ══ MERCADO ══ */}
      {tab==='mercado'&&(
        <div style={{display:'flex',height:'calc(100vh - 90px)',overflow:'hidden'}}>
          {/* Sidebar */}
          <div style={{width:'274px',borderRight:'2px solid #222222',overflow:'auto',background:'#080808',flexShrink:0}}>
            <div style={{padding:'10px',borderBottom:'1px solid #1a1200'}}><input className="inp" style={S.inp} placeholder="🔍 Buscar raro..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div style={S.sec}>{filtered.length} RAROS</div>
            {filtered.map(item=>{const sel=selRaro===item.raro;return(
              <div key={item.raro} className={`ch ${sel?'cs':''}`} onClick={()=>{setSelRaro(item.raro);setSearch('');}} style={{padding:'10px 14px',borderBottom:'1px solid #130e04',borderLeft:`3px solid ${sel?'#FFD700':'transparent'}`,transition:'all 0.1s',cursor:'pointer',display:'flex',gap:'10px',alignItems:'center'}}>
                {(()=>{const img=rarities.find(r=>r.raro===item.raro)?.imagem_url;return(
                  <div style={{width:'38px',height:'38px',flexShrink:0,border:`1px solid ${sel?'#FFD70055':'#2a2a2a'}`,background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                    {img?<img src={img} alt={item.raro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{fontSize:'18px',color:'#555555'}}>◈</span>}
                  </div>
                );})()}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                    <div style={{color:sel?'#FFD700':'#d4b870',fontSize:'16px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginRight:'6px'}}>{item.raro}</div>
                    <div style={{fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.count?'#FFD700':'#332200',flexShrink:0}}>{item.count?`${item.avgPrice}c`:'novo'}{item.trend>0&&<span style={{color:'#69db7c',fontSize:'9px'}}>▲</span>}{item.trend<0&&<span style={{color:'#ff6b6b',fontSize:'9px'}}>▼</span>}</div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><Badge cat={item.categoria}/><span style={{color:'#555555'}}>{item.count} neg.</span></div>
                </div>
              </div>
            );})}
          </div>

          {/* Main */}
          <div style={{flex:1,overflow:'auto',padding:'18px 22px',background:'#0a0a0a'}}>
            {!selRaro?(
              <div>
                <div style={S.sec}>◆ VISÃO GERAL — TODOS OS RAROS</div>
                <div style={{...S.card,padding:0,overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>{['','RARO','CATEGORIA','MÉDIA (ÚLT. 10)','ÚLTIMO PREÇO','NEG.','ÚLTIMA NEG.'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {uRaros.map((item,i)=>{const cat=rarities.find(r=>r.raro===item.raro);return(
                        <tr key={item.raro} className="rrow" style={{background:i%2===0?'#0d0a06':'#0a0804',cursor:'pointer'}} onClick={()=>setSelRaro(item.raro)}>
                          <td style={{...S.td,width:'44px',padding:'4px 8px'}}>
                            <div style={{width:'36px',height:'36px',border:'1px solid #1f1800',background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                              {cat?.imagem_url?<img src={cat.imagem_url} alt={item.raro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}}/>:<span style={{color:'#555555',fontSize:'16px'}}>◈</span>}
                            </div>
                          </td>
                          <td style={{...S.td,color:'#FFD700',fontWeight:'bold'}}>{item.raro}</td>
                          <td style={S.td}><Badge cat={item.categoria}/></td>
                          <td style={{...S.td,fontFamily:"'Press Start 2P'",fontSize:'13px',color:item.count?'#FFD700':'#333'}}>{item.count?`${item.avgPrice}c`:'—'}</td>
                          <td style={{...S.td,color:'#bbbbbb'}}>{item.count?`${item.lastPrice}c`:'—'}</td>
                          <td style={{...S.td,color:'#888888'}}>{item.count}</td>
                          <td style={{...S.td,color:'#666666'}}>{item.lastDate?fmtDate(item.lastDate):'—'}</td>
                        </tr>
                      );})}
                      {!uRaros.length&&<tr><td colSpan={7} style={{...S.td,textAlign:'center',color:'#222',padding:'56px'}}>Nenhuma negociação ainda.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ):(
              <div className="anim">
                {/* Header */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
                  <div>
                    <button style={{...S.btnG,fontSize:'15px',padding:'4px 10px',marginBottom:'8px'}} onClick={()=>setSelRaro(null)}>← voltar</button>
                    <div style={{fontFamily:"'Press Start 2P'",fontSize:'14px',color:'#FFD700',marginBottom:'8px',textShadow:'2px 2px 0 #443300'}}>{selRaro}</div>
                    <Badge cat={selInfo?.categoria||''}/>
                  </div>
                  <button style={{...S.btnD,padding:'8px 14px',fontSize:'17px'}} onClick={()=>{setShowTM(true);setTF({...eT,raro:selRaro,categoria:selInfo?.categoria||'Raro Exclusivo'});}}>+ REGISTRAR NEG.</button>
                </div>

                {/* Catalog info (from Base de Dados) */}
                {selCatalog&&(
                  <div style={{...S.card,padding:'14px 18px',marginBottom:'16px',display:'flex',gap:'20px',flexWrap:'wrap',alignItems:'center',borderColor:'#333333'}}>
                    {/* Image */}
                    {selCatalog.imagem_url&&(
                      <div style={{width:'90px',height:'90px',flexShrink:0,border:'2px solid #2a1f0d',background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                        <img src={selCatalog.imagem_url} alt={selRaro} style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>{e.target.parentNode.style.display='none';}}/>
                      </div>
                    )}
                    <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'8px',color:'#666666',letterSpacing:'1px'}}>CATÁLOGO</div>
                      {selCatalog.preco_catalogo>0&&(
                        <div><div style={{fontSize:'13px',color:'#666666',marginBottom:'2px'}}>PREÇO DE LANÇAMENTO</div><div style={{color:'#e599f7',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.preco_catalogo}c</div></div>
                      )}
                      {selCatalog.pixels>0&&(
                        <div><div style={{fontSize:'13px',color:'#666666',marginBottom:'2px'}}>PIXELS</div><div style={{color:'#63e6be',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{selCatalog.pixels}</div></div>
                      )}
                      {selCatalog.data_lancamento&&(
                        <div><div style={{fontSize:'13px',color:'#666666',marginBottom:'2px'}}>DATA DE LANÇAMENTO</div><div style={{color:'#FFD700',fontSize:'18px'}}>{fmtDate(selCatalog.data_lancamento)}</div></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stat cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'16px'}}>
                  {[
                    {l:'MÉDIA ÚLT. 10',v:`${selInfo?.avgPrice||0}c`,hi:true},
                    {l:'ÚLTIMO PREÇO',v:`${selInfo?.lastPrice||0}c`},
                    {l:'NEGOCIAÇÕES',v:String(selInfo?.count||0)},
                    {l:'ÚLTIMA NEG.',v:fmtDate(selInfo?.lastDate)},
                  ].map(s=>(
                    <div key={s.l} style={{...S.card,padding:'12px',textAlign:'center',border:s.hi?'2px solid #FFD700':'2px solid #1f1800',boxShadow:s.hi?'3px 3px 0 #443300':'3px 3px 0 #0a0806'}}>
                      <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#666666',marginBottom:'8px'}}>{s.l}</div>
                      <div style={{color:s.hi?'#FFD700':'#b8a880',fontSize:'20px'}}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                {chartData.length>1&&(
                  <div style={{...S.card,marginBottom:'16px',padding:0}}>
                    <div style={S.sec}>◆ EVOLUÇÃO DO PREÇO (C / UNIDADE)</div>
                    <div style={{padding:'16px 10px 10px 0',background:'#0d0d0d'}}>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData} margin={{top:5,right:20,left:10,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1400" vertical={false}/>
                          <XAxis dataKey="date" tickFormatter={v=>fmtDate(v)} tick={{fill:'#3a2a10',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#333333'}} tickLine={false}/>
                          <YAxis tick={{fill:'#3a2a10',fontSize:12,fontFamily:"'VT323',monospace"}} axisLine={{stroke:'#333333'}} tickLine={false} width={55}/>
                          <Tooltip content={<ChartTip/>}/>
                          <Line type="monotone" dataKey="preco" stroke="#FFD700" strokeWidth={2.5} dot={{fill:'#FFD700',r:5,strokeWidth:0}} activeDot={{r:7,fill:'#fff',stroke:'#FFD700',strokeWidth:2}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {chartData.length===1&&<div style={{...S.card,marginBottom:'16px',padding:'16px',textAlign:'center',color:'#666666',fontSize:'16px'}}>Registre mais negociações para ver a evolução do preço.</div>}

                {/* Daily avg */}
                <div style={{...S.card,marginBottom:'16px',padding:0}}>
                  <div style={S.sec}>◆ MÉDIA POR DIA</div>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                    <thead><tr>{['DATA','NEGOCIAÇÕES','MÉDIA/UN'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>{dailyAvg.map((row,i)=>(
                      <tr key={row.date} style={{background:i%2===0?'#0d0a06':'#0a0804'}}>
                        <td style={{...S.td,color:'#999999'}}>{fmtDate(row.date)}</td>
                        <td style={{...S.td,color:'#888888'}}>{row.count}</td>
                        <td style={{...S.td,color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{row.avg}c</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>

                {/* All trades */}
                <div style={{...S.card,padding:0}}>
                  <div style={S.sec}>◆ HISTÓRICO COMPLETO</div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                      <thead><tr>{['DATA','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO POR'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {!selTrades.length&&<tr><td colSpan={7} style={{...S.td,textAlign:'center',color:'#222',padding:'32px'}}>Sem negociações.</td></tr>}
                        {selTrades.map((t,i)=>(
                          <tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0a06':'#0a0804'}}>
                            <td style={{...S.td,color:'#aaaaaa'}}>{fmtDate(t.data)}</td>
                            <td style={{...S.td,color:'#999999'}}>{t.quantidade}</td>
                            <td style={{...S.td,color:'#bbbbbb'}}>{t.precoVenda}c</td>
                            <td style={{...S.td,color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                            <td style={{...S.td,color:'#7bb8ff'}}>{t.vendedor}</td>
                            <td style={{...S.td,color:'#7dffaa'}}>{t.comprador}</td>
                            <td style={{...S.td,color:'#666666',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
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
        <div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px 22px',background:'#0a0a0a'}}>
          {/* Summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'12px',marginBottom:'18px'}}>
            {[
              {l:'BALANÇO ATUAL',v:`${totals.balanco>=0?'+':''}${totals.balanco}c`,sub:totals.balanco>=0?'lucro acumulado':'prejuízo acumulado',color:totals.balanco>=0?'#69db7c':'#ff6b6b'},
              {l:'CAPITAL INVESTIDO',v:`${totals.inv}c`,sub:'soma de todas as compras',color:'#7bb8ff'},
              {l:'CAPITAL PARADO',v:`${totals.parado}c`,sub:'em estoque agora',color:'#FFD700'},
              {l:'TAXA DE ACERTO',v:`${totals.taxa}%`,sub:'itens com lucro positivo',color:'#e599f7'},
            ].map(s=>(
              <div key={s.l} style={{...S.card,padding:'16px 18px',border:`2px solid ${s.color}33`,boxShadow:`3px 3px 0 ${s.color}22`}}>
                <div style={{fontFamily:"'Press Start 2P'",fontSize:'7px',color:'#666666',marginBottom:'8px',letterSpacing:'1px'}}>{s.l}</div>
                <div style={{color:s.color,fontSize:'28px',marginBottom:'4px',fontWeight:'bold'}}>{s.v}</div>
                <div style={{color:'#666666',fontSize:'15px'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Portfolio summary table */}
          <div style={{...S.card,padding:0,marginBottom:'18px'}}>
            <div style={S.sec}>◆ RESUMO POR RARO{!pStats.length&&<span style={{color:'#666666',fontWeight:'normal'}}> — nenhuma operação ainda</span>}</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['RARO','COMPRADOS','VENDIDOS','ESTOQUE','CUSTO MÉDIO','INVESTIDO','VENDIDO','LUCRO MÉD/VD','LUCRO'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {!pStats.length&&<tr><td colSpan={9} style={{...S.td,textAlign:'center',color:'#222',padding:'32px',fontSize:'16px'}}>Use <span style={{color:'#FFD700'}}>+ OPERAÇÃO</span> para registrar compras e vendas.</td></tr>}
                  {pStats.map((item,i)=>(
                    <tr key={item.raro} className="rrow" style={{background:i%2===0?'#0d0a06':'#0a0804'}}>
                      <td style={{...S.td,color:'#FFD700',fontWeight:'bold'}}>{item.raro}</td>
                      <td style={{...S.td,color:'#7bb8ff'}}>{item.comprados}</td>
                      <td style={{...S.td,color:'#7dffaa'}}>{item.vendidos}</td>
                      <td style={{...S.td,color:item.estoque>0?'#FFD700':'#444'}}>{item.estoque}</td>
                      <td style={{...S.td,color:'#bbbbbb'}}>{item.custo}c</td>
                      <td style={{...S.td,color:'#7bb8ff'}}>{item.investido}c</td>
                      <td style={{...S.td,color:'#7dffaa'}}>{item.vendido}c</td>
                      <td style={{...S.td,color:item.lucroMed>=0?'#69db7c':'#ff6b6b'}}>{item.lucroMed>=0?'+':''}{item.lucroMed}c</td>
                      <td style={{...S.td,fontFamily:"'Press Start 2P'",fontSize:'11px',color:item.lucro>=0?'#69db7c':'#ff6b6b'}}>{item.lucro>=0?'+':''}{item.lucro}c</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual operations with delete */}
          <div style={{...S.card,padding:0}}>
            <div style={S.sec}>◆ HISTÓRICO DE OPERAÇÕES — clique em ✕ para excluir</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['DATA','TIPO','RARO','QTD','PREÇO TOTAL','PREÇO/UN',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {!portfolio.length&&<tr><td colSpan={7} style={{...S.td,textAlign:'center',color:'#222',padding:'32px'}}>Nenhuma operação ainda.</td></tr>}
                  {portfolio.map((op,i)=>(
                    <tr key={op.id} className="rrow" style={{background:i%2===0?'#0d0a06':'#0a0804'}}>
                      <td style={{...S.td,color:'#aaaaaa'}}>{fmtDate(op.data)}</td>
                      <td style={{...S.td,color:op.tipo==='compra'?'#7bb8ff':'#7dffaa',fontFamily:"'Press Start 2P'",fontSize:'11px'}}>{op.tipo==='compra'?'COMPRA':'VENDA'}</td>
                      <td style={{...S.td,color:'#FFD700'}}>{op.raro}</td>
                      <td style={{...S.td,color:'#999999'}}>{op.quantidade}</td>
                      <td style={{...S.td,color:'#bbbbbb'}}>{op.precoTotal}c</td>
                      <td style={{...S.td,color:'#d0d0d0'}}>{op.precoPorUnidade}c</td>
                      <td style={S.td}><button className="del-btn" style={S.btnDel} onClick={()=>deleteOp(op.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Negociação */}
      {showTM&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{...S.card,width:'490px',maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',border:'2px solid #FFD700',boxShadow:'8px 8px 0 #332200',padding:'24px',position:'relative'}} className="anim">
            {['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'10px',height:'10px',background:'#FFD700',top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <div style={{fontFamily:"'Press Start 2P'",fontSize:'10px',color:'#FFD700'}}>◆ REGISTRAR NEGOCIAÇÃO</div>
              <span style={{color:'#777777',cursor:'pointer',fontSize:'24px',lineHeight:1}} onClick={()=>setShowTM(false)}>✕</span>
            </div>
            <Msg msg={msg}/>
            <div style={{marginBottom:'13px'}}><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>RARO *</label><input className="inp" style={S.inp} placeholder="ex: Holo Mano" value={tF.raro} onChange={e=>setTF({...tF,raro:e.target.value})} list="rl1"/><datalist id="rl1">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}{rarities.map(r=><option key={r.raro+'_r'} value={r.raro}/>)}</datalist></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>QUANTIDADE *</label><input className="inp" style={S.inp} type="number" min="1" value={tF.quantidade} onChange={e=>setTF({...tF,quantidade:e.target.value})}/></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>PREÇO TOTAL (c) *</label><input className="inp" style={S.inp} type="number" min="0" placeholder="0" value={tF.precoVenda} onChange={e=>setTF({...tF,precoVenda:e.target.value})}/></div>
            </div>
            {tF.precoVenda&&parseInt(tF.quantidade)>=1&&<div style={{background:'#111111',border:'1px solid #1f1800',padding:'8px 12px',marginBottom:'13px',fontSize:'17px',color:'#aaaaaa',display:'flex',justifyContent:'space-between'}}><span>Preço por unidade:</span><span style={{color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{Math.round(parseFloat(tF.precoVenda||0)/Math.max(1,parseInt(tF.quantidade)||1))}c</span></div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>VENDEDOR *</label><input className="inp" style={S.inp} placeholder="nick" value={tF.vendedor} onChange={e=>setTF({...tF,vendedor:e.target.value})}/></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>COMPRADOR *</label><input className="inp" style={S.inp} placeholder="nick" value={tF.comprador} onChange={e=>setTF({...tF,comprador:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>CATEGORIA *</label><select className="inp" style={S.sel} value={tF.categoria} onChange={e=>setTF({...tF,categoria:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>DATA *</label><input className="inp" style={S.inp} type="date" value={tF.data} onChange={e=>setTF({...tF,data:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doAddTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR'}</button>
              <button style={S.btnG} onClick={()=>setShowTM(false)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Operação */}
      {showOM&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{...S.card,width:'430px',maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',border:'2px solid #FFD700',boxShadow:'8px 8px 0 #332200',padding:'24px',position:'relative'}} className="anim">
            {['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'10px',height:'10px',background:'#FFD700',top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <div style={{fontFamily:"'Press Start 2P'",fontSize:'10px',color:'#FFD700'}}>◆ REGISTRAR OPERAÇÃO</div>
              <span style={{color:'#777777',cursor:'pointer',fontSize:'24px',lineHeight:1}} onClick={()=>setShowOM(false)}>✕</span>
            </div>
            <Msg msg={msg}/>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'8px'}}>TIPO *</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                {[['compra','🛒 COMPRA'],['venda','💰 VENDA']].map(([v,l])=>(
                  <button key={v} style={{...S.btnD,textAlign:'center',fontSize:'18px',background:oF.tipo===v?'#FFD700':'#1a1100',color:oF.tipo===v?'#000':'#FFD700',transition:'all 0.15s'}} onClick={()=>setOF({...oF,tipo:v})}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:'13px'}}><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>RARO *</label><input className="inp" style={S.inp} placeholder="ex: Holo Mano" value={oF.raro} onChange={e=>setOF({...oF,raro:e.target.value})} list="rl2"/><datalist id="rl2">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}{rarities.map(r=><option key={r.raro+'_r'} value={r.raro}/>)}</datalist></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>QUANTIDADE *</label><input className="inp" style={S.inp} type="number" min="1" value={oF.quantidade} onChange={e=>setOF({...oF,quantidade:e.target.value})}/></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>PREÇO TOTAL (c) *</label><input className="inp" style={S.inp} type="number" min="0" placeholder="0" value={oF.precoTotal} onChange={e=>setOF({...oF,precoTotal:e.target.value})}/></div>
            </div>
            {oF.precoTotal&&parseInt(oF.quantidade)>=1&&<div style={{background:'#111111',border:'1px solid #1f1800',padding:'8px 12px',marginBottom:'13px',fontSize:'17px',color:'#aaaaaa',display:'flex',justifyContent:'space-between'}}><span>Preço por unidade:</span><span style={{color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{Math.round(parseFloat(oF.precoTotal||0)/Math.max(1,parseInt(oF.quantidade)||1))}c</span></div>}
            <div style={{marginBottom:'20px'}}><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>DATA *</label><input className="inp" style={S.inp} type="date" value={oF.data} onChange={e=>setOF({...oF,data:e.target.value})}/></div>
            <div style={{display:'flex',gap:'10px'}}>
              <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doAddOp} disabled={loading}>{loading?'SALVANDO...':'✓ CONFIRMAR'}</button>
              <button style={S.btnG} onClick={()=>setShowOM(false)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODERAÇÃO ══ */}
      {tab==='mod'&&user?.is_admin&&(
        <div style={{overflow:'auto',height:'calc(100vh - 90px)',padding:'18px 22px',background:'#0a0a0a'}}>
          <div style={{...S.card,padding:'14px 18px',marginBottom:'18px',borderColor:'#ff444433',display:'flex',alignItems:'center',gap:'12px'}}>
            <span style={{fontSize:'24px'}}>⚠️</span>
            <div>
              <div style={{fontFamily:"'Press Start 2P'",fontSize:'9px',color:'#ff6b6b',marginBottom:'4px'}}>PAINEL DE MODERAÇÃO</div>
              <div style={{color:'#aaaaaa',fontSize:'16px'}}>Negociações enviadas pelo site aguardam sua aprovação antes de aparecerem no Mercado.</div>
            </div>
          </div>

          {/* Pendentes */}
          {pendingTrades.length===0?(
            <div style={{...S.card,padding:'24px',textAlign:'center',color:'#333',fontSize:'17px',marginBottom:'18px'}}>
              Nenhuma negociação pendente. Tudo em ordem! ✅
            </div>
          ):(
            <div style={{...S.card,padding:0,marginBottom:'18px'}}>
              <div style={{...S.sec,color:'#ff6b6b'}}>◆ AGUARDANDO APROVAÇÃO — {pendingTrades.length} {pendingTrades.length===1?'negociação':'negociações'}</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                  <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','ENVIADO POR','AÇÕES'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {pendingTrades.map((t,i)=>(
                      <tr key={t.id} style={{background:i%2===0?'#0d0a06':'#0a0804'}}>
                        <td style={{...S.td,color:'#aaaaaa'}}>{fmtDate(t.data)}</td>
                        <td style={{...S.td,color:'#FFD700',fontWeight:'bold'}}>{t.raro}</td>
                        <td style={{...S.td,color:'#999999'}}>{t.quantidade}</td>
                        <td style={{...S.td,color:'#bbbbbb'}}>{t.preco_venda}c</td>
                        <td style={{...S.td,color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.preco_por_unidade}c</td>
                        <td style={{...S.td,color:'#7bb8ff'}}>{t.vendedor}</td>
                        <td style={{...S.td,color:'#7dffaa'}}>{t.comprador}</td>
                        <td style={{...S.td,color:'#666666',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                        <td style={{...S.td,whiteSpace:'nowrap'}}>
                          <div style={{display:'flex',gap:'6px'}}>
                            <button style={{background:'#003300',border:'2px solid #44ff44',color:'#44ff44',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background='#44ff44';e.currentTarget.style.color='#000';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='#003300';e.currentTarget.style.color='#44ff44';}}
                              onClick={()=>approveTrade(t.id)}>✓ APROVAR</button>
                            <button style={{background:'#1a0a00',border:'2px solid #FFD700',color:'#FFD700',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background='#FFD700';e.currentTarget.style.color='#000';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='#1a0a00';e.currentTarget.style.color='#FFD700';}}
                              onClick={()=>openEditTrade(t)}>✎ EDITAR</button>
                            <button style={{background:'#330000',border:'2px solid #ff4444',color:'#ff4444',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}}
                              onClick={()=>rejectTrade(t.id)}>✕ REJEITAR</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aprovadas — editar/excluir */}
          <div style={{...S.card,padding:0}}>
            <div style={{...S.sec,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>◆ NEGOCIAÇÕES APROVADAS — {trades.length} registros</span>
              <input className="inp" style={{...S.inp,width:'200px',padding:'4px 10px',fontSize:'16px',border:'1px solid #2a1f0d'}} placeholder="filtrar por raro..." value={modSearch} onChange={e=>setModSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'17px'}}>
                <thead><tr>{['DATA','RARO','QTD','TOTAL','PREÇO/UN','VENDEDOR','COMPRADOR','LANÇADO POR','AÇÕES'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...trades].filter(t=>!modSearch||t.raro.toLowerCase().includes(modSearch.toLowerCase())).sort((a,b)=>b.data.localeCompare(a.data)).map((t,i)=>(
                    <tr key={t.id} className="rrow" style={{background:i%2===0?'#0d0a06':'#0a0804'}}>
                      <td style={{...S.td,color:'#aaaaaa'}}>{fmtDate(t.data)}</td>
                      <td style={{...S.td,color:'#FFD700',fontWeight:'bold'}}>{t.raro}</td>
                      <td style={{...S.td,color:'#999999'}}>{t.quantidade}</td>
                      <td style={{...S.td,color:'#bbbbbb'}}>{t.precoVenda}c</td>
                      <td style={{...S.td,color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'12px'}}>{t.precoPorUnidade}c</td>
                      <td style={{...S.td,color:'#7bb8ff'}}>{t.vendedor}</td>
                      <td style={{...S.td,color:'#7dffaa'}}>{t.comprador}</td>
                      <td style={{...S.td,color:'#666666',fontSize:'15px'}}>{t.lancadoPor||'—'}</td>
                      <td style={{...S.td,whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button style={{background:'#1a0a00',border:'2px solid #FFD700',color:'#FFD700',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='#FFD700';e.currentTarget.style.color='#000';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='#1a0a00';e.currentTarget.style.color='#FFD700';}}
                            onClick={()=>openEditTrade(t)}>✎ EDITAR</button>
                          <button style={{background:'#330000',border:'2px solid #ff4444',color:'#ff4444',padding:'4px 10px',fontSize:'17px',fontFamily:"'VT323',monospace",cursor:'pointer',transition:'all 0.1s'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='#ff4444';e.currentTarget.style.color='#fff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='#330000';e.currentTarget.style.color='#ff4444';}}
                            onClick={()=>adminDeleteTrade(t.id)}>✕ EXCLUIR</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!trades.length&&<tr><td colSpan={9} style={{...S.td,textAlign:'center',color:'#222',padding:'32px'}}>Nenhuma negociação aprovada ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Negociação (admin) */}
      {showEditModal&&editingTrade&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}>
          <div style={{...S.card,width:'490px',maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',border:'2px solid #FFD700',boxShadow:'8px 8px 0 #332200',padding:'24px',position:'relative'}} className="anim">
            {['tl','tr','bl','br'].map(p=><div key={p} style={{position:'absolute',width:'10px',height:'10px',background:'#FFD700',top:p[0]==='t'?-2:'auto',bottom:p[0]==='b'?-2:'auto',left:p[1]==='l'?-2:'auto',right:p[1]==='r'?-2:'auto'}}/>)}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <div style={{fontFamily:"'Press Start 2P'",fontSize:'10px',color:'#FFD700'}}>✎ EDITAR NEGOCIAÇÃO</div>
              <span style={{color:'#777777',cursor:'pointer',fontSize:'24px',lineHeight:1}} onClick={()=>{setShowEditModal(false);setEditingTrade(null);}}>✕</span>
            </div>
            <div style={{marginBottom:'13px'}}><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>RARO *</label>
              <input className="inp" style={S.inp} value={editingTrade.raro} onChange={e=>setEditingTrade({...editingTrade,raro:e.target.value})} list="rl-edit"/>
              <datalist id="rl-edit">{uRaros.map(r=><option key={r.raro} value={r.raro}/>)}</datalist>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>QUANTIDADE *</label>
                <input className="inp" style={S.inp} type="number" min="1" value={editingTrade.quantidade} onChange={e=>setEditingTrade({...editingTrade,quantidade:e.target.value})}/></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>PREÇO TOTAL (c) *</label>
                <input className="inp" style={S.inp} type="number" min="0" value={editingTrade.precoVenda} onChange={e=>setEditingTrade({...editingTrade,precoVenda:e.target.value})}/></div>
            </div>
            {editingTrade.precoVenda&&parseInt(editingTrade.quantidade)>=1&&(
              <div style={{background:'#111111',border:'1px solid #1f1800',padding:'8px 12px',marginBottom:'13px',fontSize:'17px',color:'#aaaaaa',display:'flex',justifyContent:'space-between'}}>
                <span>Preço por unidade:</span>
                <span style={{color:'#FFD700',fontFamily:"'Press Start 2P'",fontSize:'13px'}}>{Math.round(parseFloat(editingTrade.precoVenda||0)/Math.max(1,parseInt(editingTrade.quantidade)||1))}c</span>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'13px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>VENDEDOR *</label>
                <input className="inp" style={S.inp} value={editingTrade.vendedor} onChange={e=>setEditingTrade({...editingTrade,vendedor:e.target.value})}/></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>COMPRADOR *</label>
                <input className="inp" style={S.inp} value={editingTrade.comprador} onChange={e=>setEditingTrade({...editingTrade,comprador:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>CATEGORIA *</label>
                <select className="inp" style={S.sel} value={editingTrade.categoria} onChange={e=>setEditingTrade({...editingTrade,categoria:e.target.value})}>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label style={{display:'block',color:'#aaaaaa',fontSize:'14px',marginBottom:'5px'}}>DATA *</label>
                <input className="inp" style={S.inp} type="date" value={editingTrade.data} onChange={e=>setEditingTrade({...editingTrade,data:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button style={{...S.btnY,flex:1,textAlign:'center',opacity:loading?.6:1}} onClick={doEditTrade} disabled={loading}>{loading?'SALVANDO...':'✓ SALVAR EDIÇÃO'}</button>
              <button style={S.btnG} onClick={()=>{setShowEditModal(false);setEditingTrade(null);}}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{position:'fixed',bottom:0,left:0,right:0,height:'32px',background:'#0d0d0d',borderTop:'2px solid #222222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',color:'#666666',zIndex:99,fontFamily:"'VT323',monospace",letterSpacing:'1px'}}>
        Feito com amor por:{' '}
        <a href="http://turva.com.br/home/Bot" target="_blank" rel="noopener noreferrer" style={{color:'#FFD700',textDecoration:'none',marginLeft:'5px'}} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='#FFD700'}>Bot</a>
      </footer>
    </div>
  );
}
