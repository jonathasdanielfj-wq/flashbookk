import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LabelList
} from 'recharts';

export default function Financas({ user, voltar }) {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaInterna, setAbaInterna] = useState('dashboard');
  const [filtroData, setFiltroData] = useState('mes'); 
  
  const [modalNovo, setModalNovo] = useState({ aberto: false, tipo: 'gasto' });
  const [excluindo, setExcluindo] = useState(null); 
  const [form, setForm] = useState({ valor: '', descricao: '' });

  useEffect(() => {
    buscarDados();
  }, [filtroData]);

  const buscarDados = async () => {
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
  };

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
    v = v.replace(".", ",");
    v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
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
      // Fecha o modal direto e atualiza, sem pop-up de "sucesso" aqui dentro
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

  const dataGraficoPizza = [
    { name: 'Ganhos', value: entradas },
    { name: 'Gastos', value: saidas }
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 pb-32">
      
      <header className="flex items-center justify-between mb-8 pt-8">
        <button onClick={voltar} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
            <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] italic block">Financeiro</span>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Status<span className="text-[#e11d48]">.</span></h1>
        </div>
        <div className="w-12 h-12"></div>
      </header>

      {/* FILTROS */}
      <div className="flex justify-between gap-2 mb-6">
        {['hoje', '7dias', 'mes'].map((tipo) => (
          <button key={tipo} onClick={() => setFiltroData(tipo)} className={`flex-1 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${filtroData === tipo ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10'}`}>
            {tipo === '7dias' ? '7 Dias' : tipo}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/5">
        <button onClick={() => setAbaInterna('dashboard')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaInterna === 'dashboard' ? 'bg-[#e11d48]' : 'text-white/40'}`}>Painel</button>
        <button onClick={() => setAbaInterna('extrato')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaInterna === 'extrato' ? 'bg-[#e11d48]' : 'text-white/40'}`}>Extrato</button>
      </div>

      {abaInterna === 'dashboard' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="bg-[#e11d48] p-8 rounded-[40px] shadow-[0_20px_40px_rgba(225,29,72,0.2)]">
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/60 block mb-2 italic">Lucro Líquido</span>
             <h2 className="text-4xl font-black italic tracking-tighter">R$ {lucroPeriodo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
          </div>

          {/* VOLUME (BARRA) */}
          <div className="bg-[#0d0d0d] p-6 rounded-[40px] border border-white/5 h-[320px]">
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-10 text-white/20 italic text-center">Volume de Movimentação</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGraficoBarras} margin={{ top: 30 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10, fontWeight: 'black'}} />
                <Bar dataKey="valor" radius={[15, 15, 0, 0]} barSize={60}>
                  {dataGraficoBarras.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  <LabelList 
                    dataKey="valor" 
                    position="top" 
                    formatter={(v) => `R$ ${v.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} 
                    style={{fill: '#fff', fontSize: '14px', fontWeight: '900', fontStyle: 'italic'}} 
                    dy={-15}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PIZZA (DISTRIBUIÇÃO) */}
          <div className="bg-[#0d0d0d] p-8 rounded-[40px] border border-white/5 h-[220px] flex items-center justify-between">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={dataGraficoPizza} innerRadius={50} outerRadius={75} paddingAngle={8} dataKey="value">
                  {dataGraficoPizza.map((entry, index) => (
                    <Cell key={index} fill={entry.name === 'Ganhos' ? '#22c55e' : '#e11d48'} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[40%] space-y-4">
                 <h3 className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">Balanço Real</h3>
                 <div>
                    <p className="text-xs font-black text-green-500 italic leading-none">R$ {entradas.toLocaleString('pt-BR')}</p>
                    <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">Ganhos</p>
                 </div>
                 <div>
                    <p className="text-xs font-black text-[#e11d48] italic leading-none">R$ {saidas.toLocaleString('pt-BR')}</p>
                    <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">Gastos</p>
                 </div>
            </div>
          </div>
        </div>
      ) : (
        /* EXTRATO */
        <div className="space-y-3 animate-in fade-in duration-500">
           {movimentacoes.map((item) => (
                <div key={item.id} className="bg-[#0d0d0d] border border-white/5 rounded-[28px] p-5 flex justify-between items-center">
                  <div className="flex gap-4 items-center min-w-0">
                    <button 
                      onClick={() => setExcluindo(item)} 
                      className="w-10 h-10 bg-[#e11d48]/10 rounded-2xl flex items-center justify-center text-[#e11d48] shrink-0 active:scale-90 transition-all border border-[#e11d48]/20"
                    >
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
            ))}
        </div>
      )}

      {/* POP-UP EXCLUSÃO PADRONIZADO */}
      {excluindo && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-[300px] bg-[#0d0d0d] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 bg-[#e11d48]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 italic">Atenção</p>
            <h3 className="text-sm font-black italic uppercase tracking-tighter mb-8 leading-tight">Você tem certeza que deseja excluir essa movimentação?</h3>
            <div className="space-y-3">
              <button onClick={deletarLancamento} className="w-full bg-[#e11d48] text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all italic">Confirmar Exclusão</button>
              <button onClick={() => setExcluindo(null)} className="w-full bg-white/5 text-white/30 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest italic">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÕES FLUTUANTES */}
      <div className="fixed bottom-10 right-6 flex flex-col gap-3">
        <button onClick={() => setModalNovo({ aberto: true, tipo: 'ganho' })} className="bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 border-[4px] border-[#050505] transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg></button>
        <button onClick={() => setModalNovo({ aberto: true, tipo: 'gasto' })} className="bg-[#e11d48] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 border-[4px] border-[#050505] transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12h14"/></svg></button>
      </div>

      {modalNovo.aberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-8">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center animate-in zoom-in-90 duration-300">
            <h2 className="text-lg font-black uppercase mb-6 italic tracking-tighter">Registrar {modalNovo.tipo}</h2>
            <div className="w-full space-y-4 mb-8">
              <input placeholder="R$ 0,00" className={`w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-center text-xl font-black italic outline-none ${modalNovo.tipo === 'ganho' ? 'text-green-500' : 'text-[#e11d48]'}`} value={form.valor} onChange={(e) => handleMoneyInput(e.target.value)} inputMode="numeric" />
              <input placeholder="DESCRIÇÃO" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[9px] font-bold uppercase tracking-[0.2em] outline-none text-center text-white italic" value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})} />
            </div>
            <button onClick={salvarMovimentacao} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest mb-3 italic ${modalNovo.tipo === 'ganho' ? 'bg-green-600' : 'bg-[#e11d48]'}`}>Confirmar</button>
            <button onClick={() => setModalNovo({ aberto: false })} className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] p-2 italic">Voltar</button>
          </div>
        </div>
      )}
    </div>
  );
}