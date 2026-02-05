import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  BarChart, Bar, XAxis, Cell, LabelList, ResponsiveContainer 
} from 'recharts';

export default function Financas({ user, voltar }) {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaInterna, setAbaInterna] = useState('dashboard');
  const [filtroData, setFiltroData] = useState('mes'); 
  
  const [modalNovo, setModalNovo] = useState({ aberto: false, tipo: 'gasto' });
  const [excluindo, setExcluindo] = useState(null); 
  const [form, setForm] = useState({ valor: '', descricao: '' });

  // Refs para o Spotlight
  const refFiltros = useRef(null);
  const refAbas = useRef(null);
  const refCards = useRef(null);
  const refBotoesAcao = useRef(null);

  // Tutorial Dinâmico com Spotlight
  const [showTutorial, setShowTutorial] = useState(false);
  const [stepTutorial, setStepTutorial] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const tutorialSteps = [
    {
      titulo: "Filtros de Tempo",
      desc: "Alterne rapidamente entre Hoje, 7 dias ou o mês atual para analisar seu fluxo.",
      ref: refFiltros
    },
    {
      titulo: "Navegação",
      desc: "No PAINEL você vê gráficos. No EXTRATO você vê a lista detalhada de cada centavo.",
      ref: refAbas
    },
    {
      titulo: "Seu Resumo",
      desc: "Aqui o cálculo é bruto: Entradas menos Saídas. O lucro líquido real do período.",
      ref: refCards
    },
    {
      titulo: "Novos Registros",
      desc: "VERDE para o que entra, VERMELHO para o que sai. Simples e rápido.",
      ref: refBotoesAcao
    }
  ];

  const updateSpotlight = useCallback(() => {
    const currentRef = tutorialSteps[stepTutorial]?.ref?.current;
    if (currentRef) {
      const rect = currentRef.getBoundingClientRect();
      setSpotlightStyle({
        top: rect.top - 10,
        left: rect.left - 10,
        width: rect.width + 20,
        height: rect.height + 20,
      });
    }
  }, [stepTutorial]);

  useEffect(() => {
    if (showTutorial) {
      // Pequeno delay para garantir que o elemento já renderizou na posição certa
      const timer = setTimeout(updateSpotlight, 50);
      window.addEventListener('resize', updateSpotlight);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateSpotlight);
      }
    }
  }, [showTutorial, updateSpotlight]);

  const buscarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const { data: todasMovs, error } = await supabase
        .from('financas')
        .select('*')
        .eq('tatuador_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let dataLimite = new Date();
      dataLimite.setHours(0, 0, 0, 0);
      if (filtroData === '7dias') dataLimite.setDate(dataLimite.getDate() - 7);
      else if (filtroData === 'mes') dataLimite = new Date(dataLimite.getFullYear(), dataLimite.getMonth(), 1);

      const movsFiltradas = (todasMovs || []).filter(item => new Date(item.created_at) >= dataLimite);
      setMovimentacoes(movsFiltradas);
    } catch (err) {
      console.error("Erro ao buscar finanças:", err);
    } finally {
      setCarregando(false);
    }
  }, [user.id, filtroData]);

  useEffect(() => { buscarDados(); }, [buscarDados]);

  const deletarLancamento = async () => {
    try {
      const { error } = await supabase.from('financas').delete().eq('id', excluindo.id);
      if (error) throw error;
      setExcluindo(null);
      buscarDados();
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  };

  const handleMoneyInput = (value) => {
    let v = value.replace(/\D/g, '');
    v = (v / 100).toFixed(2) + '';
    v = v.replace(".", ",").replace(/(\d)(\d{3}),/g, "$1.$2,");
    setForm({ ...form, valor: "R$ " + v });
  };

  const converterParaNumero = (str) => parseFloat(str.replace("R$ ", "").replace(".", "").replace(",", ".")) || 0;

  const salvarMovimentacao = async () => {
    const valorNum = converterParaNumero(form.valor);
    if (valorNum <= 0 || !form.descricao) return;
    const { error } = await supabase.from('financas').insert([{
      tatuador_id: user.id,
      tipo: modalNovo.tipo,
      valor: valorNum,
      descricao: form.descricao.toUpperCase()
    }]);
    if (!error) {
      setModalNovo({ aberto: false, tipo: 'gasto' });
      setForm({ valor: '', descricao: '' });
      buscarDados();
    }
  };

  const entradas = movimentacoes.filter(m => m.tipo === 'ganho').reduce((acc, m) => acc + m.valor, 0);
  const saidas = movimentacoes.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + m.valor, 0);
  const lucroPeriodo = entradas - saidas;

  const dataGraficoBarras = [
    { name: 'Entradas', valor: entradas, color: '#22c55e' },
    { name: 'Saídas', valor: saidas, color: '#e11d48' }
  ];

  if (carregando && movimentacoes.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e11d48] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 pb-32 overflow-x-hidden animate-in fade-in duration-700">
      
      <header className="flex items-center justify-between mb-8 pt-8 animate-in slide-in-from-top duration-500">
        <button onClick={voltar} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
            <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] italic block">Financeiro</span>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Status<span className="text-[#e11d48]">.</span></h1>
        </div>
        <button 
          onClick={() => { setStepTutorial(0); setShowTutorial(true); }}
          className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all group"
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/40 group-hover:text-white transition-colors">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
            </svg>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#e11d48] rounded-full border-2 border-[#050505]"></div>
          </div>
        </button>
      </header>

      {/* ELEMENTOS COM REFS PARA O SPOTLIGHT */}
      <div ref={refFiltros} className={`flex justify-between gap-2 mb-6 transition-all duration-500 ${showTutorial && stepTutorial === 0 ? 'relative z-[10001] scale-105' : 'relative z-10'}`}>
        {['hoje', '7dias', 'mes'].map((tipo) => (
          <button key={tipo} onClick={() => setFiltroData(tipo)} className={`flex-1 py-3 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${filtroData === tipo ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10'}`}>
            {tipo === '7dias' ? '7 Dias' : tipo === 'mes' ? 'Este Mês' : 'Hoje'}
          </button>
        ))}
      </div>

      <div ref={refAbas} className={`flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/5 transition-all duration-500 ${showTutorial && stepTutorial === 1 ? 'relative z-[10001] scale-105' : 'relative z-10'}`}>
        <button onClick={() => setAbaInterna('dashboard')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaInterna === 'dashboard' ? 'bg-[#e11d48] shadow-lg shadow-rose-500/20' : 'text-white/40'}`}>Painel</button>
        <button onClick={() => setAbaInterna('extrato')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaInterna === 'extrato' ? 'bg-[#e11d48] shadow-lg shadow-rose-500/20' : 'text-white/40'}`}>Extrato</button>
      </div>

      {abaInterna === 'dashboard' ? (
        <div key="dash" className="space-y-6">
          <div ref={refCards} className={`bg-[#e11d48] p-8 rounded-[40px] shadow-[0_20px_40px_rgba(225,29,72,0.2)] transition-all duration-500 ${showTutorial && stepTutorial === 2 ? 'relative z-[10001] scale-105' : 'relative z-10'}`}>
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/60 block mb-2 italic">Lucro Líquido no Período</span>
             <h2 className="text-4xl font-black italic tracking-tighter">R$ {lucroPeriodo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
          </div>
          <div className="bg-[#0d0d0d] p-6 rounded-[40px] border border-white/5 h-[320px] shadow-2xl relative z-10">
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-10 text-white/20 italic text-center">Volume de Movimentação</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGraficoBarras} margin={{ top: 30 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10, fontWeight: 'black'}} />
                <Bar dataKey="valor" radius={[15, 15, 0, 0]} barSize={60} animationDuration={1500}>
                  {dataGraficoBarras.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  <LabelList dataKey="valor" position="top" formatter={(v) => `R$ ${v.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} style={{fill: '#fff', fontSize: '14px', fontWeight: '900', fontStyle: 'italic'}} dy={-15} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div key="extrato" className="space-y-3 relative z-10">
           {movimentacoes.length === 0 ? (
             <p className="text-center text-white/20 text-[10px] font-black uppercase tracking-widest py-10 italic">Nenhum registro encontrado</p>
           ) : (
             movimentacoes.map((item, index) => (
                <div key={item.id} className="bg-[#0d0d0d] border border-white/5 rounded-[28px] p-5 flex justify-between items-center">
                  <div className="flex gap-4 items-center min-w-0">
                    <button onClick={() => setExcluindo(item)} className="w-10 h-10 bg-[#e11d48]/10 rounded-2xl flex items-center justify-center text-[#e11d48] shrink-0 active:scale-90 border border-[#e11d48]/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase italic truncate">{item.descricao}</p>
                      <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`text-[12px] font-black italic shrink-0 ml-4 ${item.tipo === 'ganho' ? 'text-green-500' : 'text-[#e11d48]'}`}>
                    {item.tipo === 'ganho' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
                </div>
             ))
           )}
        </div>
      )}

      {/* SISTEMA DE SPOTLIGHT CORRIGIDO */}
      {showTutorial && (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
          {/* O "Buraco" de Luz com Glow */}
          <div 
            className="absolute transition-all duration-500 ease-in-out"
            style={{
              top: spotlightStyle.top,
              left: spotlightStyle.left,
              width: spotlightStyle.width,
              height: spotlightStyle.height,
              borderRadius: '24px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.9), inset 0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(225,29,72,0.3)',
              border: '2px solid rgba(255,255,255,0.1)'
            }}
          />
          
          {/* Card de Texto */}
          <div 
            className="fixed z-[10002] pointer-events-auto w-[280px] bg-[#0d0d0d] border border-white/10 rounded-[32px] p-6 shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
            style={{
                top: spotlightStyle.top + spotlightStyle.height + 20 > window.innerHeight - 220 
                     ? spotlightStyle.top - 210 
                     : spotlightStyle.top + spotlightStyle.height + 20,
                left: '50%',
                transform: 'translateX(-50%)'
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e11d48] mb-1 italic">Dica Financeira</p>
            <h3 className="text-lg font-black italic uppercase tracking-tighter mb-2 text-white">{tutorialSteps[stepTutorial].titulo}</h3>
            <p className="text-[10px] text-white/40 uppercase font-bold leading-relaxed mb-6 italic">{tutorialSteps[stepTutorial].desc}</p>
            <div className="flex gap-2 mb-4">
               {tutorialSteps.map((_, i) => (
                 <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i === stepTutorial ? 'bg-[#e11d48]' : 'bg-white/5'}`} />
               ))}
            </div>
            <button 
              onClick={() => stepTutorial < tutorialSteps.length - 1 ? setStepTutorial(prev => prev + 1) : setShowTutorial(false)}
              className="w-full bg-[#e11d48] text-white h-12 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 italic"
            >
              {stepTutorial === tutorialSteps.length - 1 ? "Entendido!" : "Próximo"}
            </button>
          </div>
        </div>
      )}

      {/* POP-UP EXCLUSÃO (Z-INDEX ACIMA DO TUTORIAL) */}
      {excluindo && (
        <div className="fixed inset-0 bg-black/95 z-[11000] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-[320px] bg-[#0d0d0d] rounded-[40px] border border-white/10 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-[#e11d48]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e11d48] mb-2 italic">Atenção!</p>
            <h3 className="text-sm font-black italic uppercase tracking-tighter mb-8 leading-tight text-white">Deseja realmente excluir esse registro financeiro?</h3>
            <div className="space-y-3">
              <button onClick={deletarLancamento} className="w-full bg-[#e11d48] text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-rose-500/20">Confirmar</button>
              <button onClick={() => setExcluindo(null)} className="w-full bg-white/5 text-white/30 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest italic">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÕES FLUTUANTES */}
      <div ref={refBotoesAcao} className={`fixed bottom-10 right-6 flex flex-col gap-4 transition-all duration-500 ${showTutorial && stepTutorial === 3 ? 'z-[10001] scale-110' : 'z-20'}`}>
        <button onClick={() => setModalNovo({ aberto: true, tipo: 'ganho' })} className="bg-green-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center active:scale-75 border-[4px] border-[#050505] transition-all hover:rotate-90">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button onClick={() => setModalNovo({ aberto: true, tipo: 'gasto' })} className="bg-[#e11d48] text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center active:scale-75 border-[4px] border-[#050505] transition-all hover:-rotate-90">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12h14"/></svg>
        </button>
      </div>

      {/* MODAL NOVO LANÇAMENTO */}
      {modalNovo.aberto && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[12000] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center animate-in zoom-in-95 duration-500">
            <h2 className="text-lg font-black uppercase mb-6 italic tracking-tighter text-white">Registrar {modalNovo.tipo}</h2>
            <div className="w-full space-y-4 mb-8">
              <input placeholder="R$ 0,00" className={`w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-center text-xl font-black italic outline-none ${modalNovo.tipo === 'ganho' ? 'text-green-500' : 'text-[#e11d48]'}`} value={form.valor} onChange={(e) => handleMoneyInput(e.target.value)} inputMode="numeric" />
              <input placeholder="DESCRIÇÃO" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[9px] font-bold uppercase tracking-[0.2em] outline-none text-center text-white italic" value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})} />
            </div>
            <button onClick={salvarMovimentacao} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest mb-3 italic shadow-2xl active:scale-95 ${modalNovo.tipo === 'ganho' ? 'bg-green-600 shadow-green-500/20' : 'bg-[#e11d48] shadow-rose-500/20'}`}>Confirmar</button>
            <button onClick={() => setModalNovo({ aberto: false })} className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] p-2 italic">Voltar</button>
          </div>
        </div>
      )}
    </div>
  );
}