import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function Agenda({ user, voltar, aoAtualizar }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [exibirCalendario, setExibirCalendario] = useState(false);
  
  const [detalheAgendamento, setDetalheAgendamento] = useState(null);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [finalizando, setFinalizando] = useState(null);
  const [valorManual, setValorManual] = useState("");
  const [formEdit, setFormEdit] = useState({ cliente_nome: '', cliente_whatsapp: '', data_hora: '' });

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  const buscarAgendamentos = async () => {
    try {
      setCarregando(true);
      // Removida a coluna 'imagens_adicionais' que causava o erro 400
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, cliente_nome, cliente_whatsapp, data_hora, tatuador_id, arte_id,
          artes (id, titulo, preco, imagem_url)
        `)
        .eq('tatuador_id', user.id)
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    } finally {
      setCarregando(false);
    }
  };

  const baixarImagem = async (url, nomeArquivo) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${nomeArquivo || 'tattoo'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { console.error(err); }
  };

  const confirmarFinalizacao = async () => {
    const ag = finalizando;
    try {
      let precoFinal = valorManual ? parseFloat(valorManual.replace(',', '.')) : (ag.artes?.preco ? parseFloat(String(ag.artes.preco).replace(/[^\d,.-]/g, '').replace(',', '.')) : 0);
      
      await supabase.from('financas').insert([{
        tatuador_id: user.id,
        tipo: 'ganho',
        valor: precoFinal,
        descricao: `TATTOO: ${ag.cliente_nome.toUpperCase()} - ${ag.artes?.titulo?.toUpperCase() || 'SEM TÍTULO'}`
      }]);

      await supabase.from('agendamentos').delete().eq('id', ag.id);
      setFinalizando(null); setDetalheAgendamento(null);
      buscarAgendamentos();
      if (aoAtualizar) aoAtualizar(); 
    } catch (err) { console.error(err); }
  };

  const confirmarExclusaoAgendamento = async () => {
    try {
      await supabase.from('agendamentos').delete().eq('id', excluindo.id);
      setExcluindo(null); setDetalheAgendamento(null);
      buscarAgendamentos();
    } catch (err) { console.error(err); }
  };

  const salvarEdicao = async () => {
    try {
      await supabase.from('agendamentos').update({ 
          cliente_nome: formEdit.cliente_nome.toUpperCase(),
          cliente_whatsapp: formEdit.cliente_whatsapp.replace(/\D/g, ""),
          data_hora: formEdit.data_hora 
        }).eq('id', editando.id);
      setEditando(null); setDetalheAgendamento(null);
      buscarAgendamentos();
    } catch (err) { console.error(err); }
  };

  const renderCalendarioGrade = () => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const dias = [];

    for (let i = 0; i < primeiroDiaMes.getDay(); i++) {
      dias.push(<div key={`empty-${i}`} className="h-12" />);
    }

    for (let d = 1; d <= ultimoDiaMes.getDate(); d++) {
      const temTattoo = agendamentos.some(ag => {
        const da = new Date(ag.data_hora);
        return da.getDate() === d && da.getMonth() === hoje.getMonth() && da.getFullYear() === hoje.getFullYear();
      });

      dias.push(
        <button 
          key={d}
          onClick={() => {
            setDataSelecionada(new Date(hoje.getFullYear(), hoje.getMonth(), d));
            setExibirCalendario(false);
          }}
          className="h-12 w-full rounded-xl flex flex-col items-center justify-center relative bg-white/5 active:bg-[#e11d48]/20 transition-all"
        >
          <span className="text-xs font-black text-white/60">{d}</span>
          {temTattoo && <div className="w-1.5 h-1.5 rounded-full mt-1 bg-[#e11d48] shadow-[0_0_8px_#e11d48]" />}
        </button>
      );
    }
    return dias;
  };

  const agendamentosExibidos = dataSelecionada 
    ? agendamentos.filter(ag => {
        const d = new Date(ag.data_hora);
        return d.getDate() === dataSelecionada.getDate() && d.getMonth() === dataSelecionada.getMonth();
      })
    : agendamentos;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden relative">
      <AnimatePresence mode="wait">
        {!detalheAgendamento ? (
          <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
            <header className="flex items-center justify-between mb-8 pt-8">
              <button onClick={voltar} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="text-center">
                  <h1 className="text-2xl font-black italic uppercase tracking-tighter">Agenda<span className="text-[#e11d48]">.</span></h1>
                  <button onClick={() => setDataSelecionada(null)} className="text-[7px] font-black text-[#e11d48] uppercase tracking-[0.3em] bg-rose-500/10 px-2 py-1 rounded-full">
                    {dataSelecionada ? "Limpar Filtro" : "Todos os Horários"}
                  </button>
              </div>
              <button onClick={() => setExibirCalendario(!exibirCalendario)} className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${exibirCalendario ? 'bg-[#e11d48] border-[#e11d48]' : 'bg-white/5 border-white/10'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </button>
            </header>

            {exibirCalendario && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-8 bg-[#0d0d0d] rounded-[32px] p-6 border border-white/5 shadow-2xl">
                <div className="grid grid-cols-7 gap-2 text-center mb-4">
                  {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-[10px] font-black text-white/20">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderCalendarioGrade()}</div>
              </motion.div>
            )}

            <div className="space-y-3">
              {carregando ? (
                <div className="py-20 text-center text-white/10 text-[10px] font-black uppercase tracking-widest">Sincronizando...</div>
              ) : agendamentosExibidos.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-[40px]">
                  <p className="text-[10px] font-black uppercase text-white/10 tracking-[0.2em] italic">Nenhum agendamento encontrado</p>
                </div>
              ) : (
                agendamentosExibidos.map((ag) => (
                  <div key={ag.id} onClick={() => setDetalheAgendamento(ag)} className="bg-[#0d0d0d] border border-white/5 rounded-[32px] p-6 flex items-center justify-between active:scale-[0.98] transition-all">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#e11d48] uppercase italic mb-1">
                        {new Date(ag.data_hora).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} • {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <h4 className="text-lg font-black uppercase italic tracking-tighter leading-none">{ag.cliente_nome}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="detalhes" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed inset-0 bg-[#050505] z-[50] p-6 pb-12 overflow-y-auto">
             <header className="flex items-center justify-between mb-8 pt-8">
              <button onClick={() => setDetalheAgendamento(null)} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button onClick={() => { setFormEdit({ cliente_nome: detalheAgendamento.cliente_nome, cliente_whatsapp: detalheAgendamento.cliente_whatsapp, data_hora: detalheAgendamento.data_hora.split('.')[0] }); setEditando(detalheAgendamento); }} className="text-[#e11d48] font-black text-[10px] uppercase italic tracking-widest">Editar</button>
            </header>

            <div className="max-w-md mx-auto">
              <span className="text-[#e11d48] text-[10px] font-black uppercase italic tracking-[0.2em]">Cliente</span>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8 leading-none">{detalheAgendamento.cliente_nome}</h2>

              {detalheAgendamento.artes?.imagem_url && (
                <div className="mb-8">
                   <div className="relative aspect-[4/5] rounded-[45px] overflow-hidden border border-white/10 bg-[#0a0a0a]">
                      <img src={detalheAgendamento.artes.imagem_url} alt="Referência" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => baixarImagem(detalheAgendamento.artes.imagem_url, `tattoo-${detalheAgendamento.cliente_nome}`)}
                        className="absolute top-6 right-6 w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all z-10"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      </button>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <a href={`https://wa.me/${detalheAgendamento.cliente_whatsapp}`} target="_blank" rel="noreferrer" className="bg-white/5 border border-white/10 h-16 rounded-[22px] flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <span className="text-[10px] font-black uppercase italic tracking-widest">WhatsApp</span>
                </a>
                <button onClick={() => setExcluindo(detalheAgendamento)} className="bg-white/5 border border-white/10 h-16 rounded-[22px] flex items-center justify-center active:scale-95 transition-all text-white/30">
                  <span className="text-[10px] font-black uppercase italic tracking-widest">Excluir</span>
                </button>
              </div>

              <button onClick={() => { setFinalizando(detalheAgendamento); setValorManual(""); }} className="w-full bg-[#e11d48] text-white h-20 rounded-[35px] font-black uppercase text-xs active:scale-95 transition-all italic shadow-2xl shadow-rose-500/20">Finalizar Sessão</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(finalizando || excluindo || editando) && (
          <div className="fixed inset-0 bg-black/95 z-[11000] flex items-center justify-center p-8 backdrop-blur-xl">
            <div className="w-full max-w-xs bg-[#0a0a0a] rounded-[45px] border border-white/10 p-8 shadow-2xl text-center">
              {finalizando && (
                <>
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <h2 className="text-sm font-black uppercase mb-6 italic tracking-tighter text-white">Lançar ganho?</h2>
                  <input type="text" value={valorManual} onChange={(e) => setValorManual(e.target.value)} placeholder={`R$ ${finalizando.artes?.preco || '0,00'}`} className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl mb-4 text-center text-white font-black" />
                  <button onClick={confirmarFinalizacao} className="w-full bg-green-600 text-white h-14 rounded-[24px] text-[10px] font-black uppercase active:scale-95 italic">CONFIRMAR</button>
                </>
              )}
              {excluindo && (
                <>
                  <div className="w-16 h-16 bg-[#e11d48]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#e11d48]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase text-[#e11d48] mb-2">Você tem certeza?</p>
                  <h2 className="text-sm font-black uppercase mb-8 italic text-white">Deseja excluir esse agendamento?</h2>
                  <button onClick={confirmarExclusaoAgendamento} className="w-full bg-[#e11d48] text-white h-14 rounded-[24px] text-[10px] font-black uppercase active:scale-95 italic">SIM, EXCLUIR</button>
                </>
              )}
              {editando && (
                <div className="text-left space-y-4">
                  <h2 className="text-lg font-black uppercase mb-4 italic text-center">Editar</h2>
                  <input type="text" value={formEdit.cliente_nome} onChange={e => setFormEdit({...formEdit, cliente_nome: e.target.value})} className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl px-4 text-xs font-bold uppercase text-white" placeholder="Nome" />
                  <input type="datetime-local" value={formEdit.data_hora} onChange={e => setFormEdit({...formEdit, data_hora: e.target.value})} className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl px-4 text-xs font-bold uppercase text-white" />
                  <button onClick={salvarEdicao} className="w-full bg-white text-black h-14 rounded-2xl text-[10px] font-black uppercase italic">SALVAR</button>
                </div>
              )}
              <button onClick={() => { setFinalizando(null); setExcluindo(null); setEditando(null); }} className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] py-6 italic w-full">CANCELAR</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}