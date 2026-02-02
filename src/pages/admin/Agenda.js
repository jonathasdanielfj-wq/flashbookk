import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function Agenda({ user, voltar, aoAtualizar }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [exibirCalendario, setExibirCalendario] = useState(false);
  
  const [arteFocada, setArteFocada] = useState(null);
  const [indexFoto, setIndexFoto] = useState(0);
  const scrollRef = useRef(null);

  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [finalizando, setFinalizando] = useState(null);
  const [valorManual, setValorManual] = useState(""); // Novo estado para valor manual
  const [perguntarVitrine, setPerguntarVitrine] = useState(null); 
  const [formEdit, setFormEdit] = useState({ cliente_nome: '', cliente_whatsapp: '', data_hora: '' });

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  const buscarAgendamentos = async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          cliente_nome,
          cliente_whatsapp,
          data_hora,
          tatuador_id,
          arte_id,
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

  const confirmarFinalizacao = async () => {
    const ag = finalizando;
    try {
      let precoFinal = 0;

      // Se existe valor manual digitado, usa ele. Se não, tenta limpar o da arte.
      if (valorManual) {
        precoFinal = parseFloat(valorManual.replace(',', '.'));
      } else if (ag.artes?.preco) {
        const stringPreco = String(ag.artes.preco);
        precoFinal = parseFloat(stringPreco.replace(/[^\d,.-]/g, '').replace(',', '.'));
      }

      if (isNaN(precoFinal) || precoFinal <= 0) {
        alert("Por favor, insira um valor válido para a tattoo.");
        return;
      }

      // 1. Insere na tabela de finanças
      const { error: finError } = await supabase
        .from('financas')
        .insert([{
          tatuador_id: user.id,
          tipo: 'ganho',
          valor: precoFinal,
          descricao: `TATTOO: ${ag.cliente_nome.toUpperCase()} - ${ag.artes?.titulo?.toUpperCase() || 'SEM TÍTULO'}`
        }]);

      if (finError) throw finError;

      // 2. Remove da agenda
      const { error: agError } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', ag.id);

      if (agError) throw agError;

      setFinalizando(null);
      setValorManual("");
      buscarAgendamentos();
      if (aoAtualizar) aoAtualizar(); 
    } catch (err) {
      console.error("Erro detalhado:", err);
      alert("Erro ao finalizar agendamento.");
    }
  };

  const abrirWpp = (ag) => {
    let numero = ag.cliente_whatsapp?.replace(/\D/g, "");
    if (!numero) {
      alert("WhatsApp não encontrado.");
      return;
    }
    if (numero.length <= 11) numero = "55" + numero;
    const mensagem = encodeURIComponent(`Olá ${ag.cliente_nome}! Aqui é o seu tatuador. Estou passando para confirmar nosso agendamento da arte "${ag.artes?.titulo}". Podemos confirmar?`);
    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
  };

  const salvarEdicao = async () => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          cliente_nome: formEdit.cliente_nome.toUpperCase(),
          cliente_whatsapp: formEdit.cliente_whatsapp.replace(/\D/g, ""),
          data_hora: formEdit.data_hora 
        })
        .eq('id', editando.id);

      if (error) throw error;
      setEditando(null);
      buscarAgendamentos();
    } catch (err) {
      alert("Erro ao atualizar.");
    }
  };

  const confirmarExclusaoAgendamento = async () => {
    const agParaDeletar = excluindo;
    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agParaDeletar.id);

      if (error) throw error;
      
      setExcluindo(null);
      setPerguntarVitrine(agParaDeletar.artes); 
      buscarAgendamentos();
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  const voltarArteParaVitrine = async (arteId, status) => {
    if (status === 'sim' && arteId) {
      try {
        const { error } = await supabase
          .from('artes')
          .update({ vendida: false })
          .eq('id', arteId);
        
        if (error) throw error;
        if (aoAtualizar) aoAtualizar(); 
      } catch (err) {
        console.error("Erro ao voltar para vitrine:", err);
      }
    }
    setPerguntarVitrine(null);
  };

  const lidarComVoltar = () => {
    if (exibirCalendario || dataSelecionada) {
      setExibirCalendario(false);
      setDataSelecionada(null);
    } else {
      voltar(); 
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, offsetWidth } = scrollRef.current;
      const index = Math.round(scrollLeft / offsetWidth);
      setIndexFoto(index);
    }
  };

  const baixarImagem = async (url, nome) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `arte-${nome || 'tattoo'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar:", error);
    }
  };

  const getDiasNoMes = (baseDate) => {
    const data = baseDate || new Date();
    const ano = data.getFullYear();
    const mes = data.getMonth();
    const dias = new Date(ano, mes + 1, 0).getDate();
    return Array.from({ length: dias }, (_, i) => new Date(ano, mes, i + 1));
  };

  const diasDoMes = getDiasNoMes(dataSelecionada);
  const agendamentosExibidos = dataSelecionada 
    ? agendamentos.filter(ag => new Date(ag.data_hora).toDateString() === dataSelecionada.toDateString())
    : agendamentos;

  const temAgendamentoNoDia = (date) => {
    return agendamentos.some(ag => new Date(ag.data_hora).toDateString() === date.toDateString());
  };

  // Verifica se a arte tem um preço válido definido
  const temPrecoDefinido = (ag) => {
    if (!ag?.artes?.preco) return false;
    const p = String(ag.artes.preco).toLowerCase();
    return !p.includes("consulta") && !p.includes("valor") && p.replace(/[^\d]/g, '').length > 0;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 pb-32 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex items-center justify-between mb-10 pt-8">
        <button onClick={lidarComVoltar} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:text-[#e11d48] transition-colors"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
            <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] italic">Timeline</span>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Agenda<span className="text-[#e11d48]">.</span></h1>
        </div>
        <button onClick={() => { setExibirCalendario(!exibirCalendario); if (exibirCalendario) setDataSelecionada(null); }} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${exibirCalendario ? 'bg-[#e11d48] border-[#e11d48] shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'bg-white/5 border-white/10'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        </button>
      </header>

      {/* CALENDÁRIO */}
      {exibirCalendario && (
        <div className="mb-10 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-[#0d0d0d] border border-white/10 rounded-[35px] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-[10px] font-black uppercase tracking-widest italic text-white">{(dataSelecionada || new Date()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                {dataSelecionada && <button onClick={() => setDataSelecionada(null)} className="text-[8px] font-black uppercase text-[#e11d48] tracking-widest">Limpar Filtro</button>}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="text-[8px] font-black text-white/10 text-center mb-2">{d}</div>)}
                {diasDoMes.map((dia, idx) => {
                    const ativo = dataSelecionada && dia.toDateString() === dataSelecionada.toDateString();
                    const temMarcacao = temAgendamentoNoDia(dia);
                    return (
                        <button key={idx} onClick={() => setDataSelecionada(dia)} className={`relative aspect-square rounded-2xl flex items-center justify-center text-[10px] font-bold transition-all ${ativo ? 'bg-white text-black' : 'hover:bg-white/5 text-white/40'}`}>
                            {dia.getDate()}
                            {temMarcacao && <span className={`absolute bottom-1.5 w-1 h-1 rounded-full animate-pulse ${ativo ? 'bg-red-600' : 'bg-[#e11d48]'}`}></span>}
                        </button>
                    );
                })}
            </div>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="space-y-4">
        {carregando ? (
            <div className="py-20 flex justify-center italic text-[10px] text-white/10 tracking-widest animate-pulse">Sincronizando...</div>
        ) : agendamentosExibidos.length === 0 ? (
            <div className="py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{dataSelecionada ? 'Nenhum horário para este dia' : 'Agenda vazia'}</p>
            </div>
        ) : (
            agendamentosExibidos.map((ag) => {
                const dataAg = new Date(ag.data_hora);
                return (
                    <div key={ag.id} className="bg-[#0d0d0d] border border-white/10 rounded-[32px] p-5 flex flex-col gap-4 group transition-all">
                        <div className="flex items-center gap-5">
                          <div className="flex flex-col items-center justify-center border-r border-white/10 pr-5 min-w-[70px]">
                              <span className="text-[8px] font-black text-[#e11d48] uppercase tracking-tighter mb-1">{dataAg.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span>
                              <span className="text-xl font-black italic tracking-tighter leading-none">{dataAg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                              <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-widest block mb-0.5">Cliente</span>
                              <h4 className="text-[13px] font-black uppercase truncate italic leading-tight">{ag.cliente_nome}</h4>
                              <p className="text-[9px] text-white/40 font-bold uppercase tracking-tight truncate">{ag.artes?.titulo}</p>
                          </div>
                          <div onClick={() => setArteFocada(ag.artes)} className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0 cursor-pointer active:scale-90 transition-transform">
                              <img src={Array.isArray(ag.artes?.imagem_url) ? ag.artes?.imagem_url[0] : ag.artes?.imagem_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Arte" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <button 
                            onClick={() => { setFinalizando(ag); setValorManual(""); }}
                            className="w-full bg-white text-black h-12 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_5px_15px_rgba(255,255,255,0.1)]"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Finalizar Tattoo</span>
                          </button>

                          <div className="flex gap-2">
                            <button onClick={() => abrirWpp(ag)} className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-black h-10 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                              <span className="text-[8px] font-black uppercase tracking-widest">Wpp</span>
                            </button>
                            
                            <button onClick={() => { setEditando(ag); setFormEdit({ cliente_nome: ag.cliente_nome, cliente_whatsapp: ag.cliente_whatsapp || '', data_hora: ag.data_hora.slice(0, 16) }); }}
                              className="flex-1 bg-white/5 hover:bg-white hover:text-black text-white/40 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95">
                              <span className="text-[8px] font-black uppercase tracking-widest">Editar</span>
                            </button>

                            <button onClick={() => setExcluindo(ag)}
                              className="w-10 bg-white/5 hover:bg-[#e11d48]/20 text-white/20 hover:text-[#e11d48] h-10 rounded-xl flex items-center justify-center transition-all active:scale-95">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* POP-UP DE FINALIZAÇÃO (COM CAMPO DE VALOR SE NECESSÁRIO) */}
      {finalizando && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-[300px] bg-[#0d0d0d] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 mb-2">Concluir Serviço</p>
            <h3 className="text-sm font-black italic uppercase tracking-tighter mb-4 leading-tight">Deseja finalizar o agendamento de {finalizando.cliente_nome}?</h3>
            
            {temPrecoDefinido(finalizando) ? (
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-8 leading-relaxed">
                  Isso lançará um ganho de <span className="text-white">{finalizando.artes?.preco}</span> no seu financeiro.
              </p>
            ) : (
              <div className="mb-8">
                <p className="text-[9px] text-[#e11d48] font-black uppercase tracking-widest mb-3 italic">Qual o valor final da tattoo?</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">R$</span>
                  <input 
                    type="number" 
                    value={valorManual}
                    onChange={(e) => setValorManual(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl pl-10 pr-4 text-[14px] font-black text-white outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button onClick={confirmarFinalizacao} className="w-full bg-green-600 text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.2)]">Confirmar e Lançar</button>
              <button onClick={() => { setFinalizando(null); setValorManual(""); }} className="w-full bg-white/5 text-white/30 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest">Agora não</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editando && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in" onClick={() => setEditando(null)}>
          <div className="w-full max-w-[320px] bg-[#0d0d0d] rounded-[35px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] italic mb-2 block">Management</span>
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Editar Dados</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-white/30 ml-2">Cliente</label>
                <input type="text" value={formEdit.cliente_nome} onChange={e => setFormEdit({...formEdit, cliente_nome: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl px-5 text-[11px] font-bold uppercase text-white outline-none focus:border-[#e11d48]" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-white/30 ml-2">WhatsApp</label>
                <input type="text" value={formEdit.cliente_whatsapp} onChange={e => setFormEdit({...formEdit, cliente_whatsapp: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl px-5 text-[11px] font-bold uppercase text-white outline-none focus:border-[#e11d48]" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-white/30 ml-2">Data/Hora</label>
                <input type="datetime-local" value={formEdit.data_hora} onChange={e => setFormEdit({...formEdit, data_hora: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl px-5 text-[11px] font-bold uppercase text-white outline-none focus:border-[#e11d48]" />
              </div>
              <div className="pt-4 flex flex-col gap-3">
                <button onClick={salvarEdicao} className="w-full bg-white text-black h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Salvar Alterações</button>
                <button onClick={() => setEditando(null)} className="w-full text-white/30 h-10 text-[9px] font-black uppercase tracking-widest">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: CONFIRMAR EXCLUSÃO DO AGENDAMENTO */}
      {excluindo && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in" onClick={() => setExcluindo(null)}>
          <div className="w-full max-w-[300px] bg-[#0d0d0d] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-[#e11d48]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Atenção</p>
            <h3 className="text-sm font-black italic uppercase tracking-tighter mb-8 leading-tight">Você tem certeza que deseja excluir esse agendamento?</h3>
            <div className="space-y-3">
              <button onClick={confirmarExclusaoAgendamento} className="w-full bg-[#e11d48] text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Confirmar Exclusão</button>
              <button onClick={() => setExcluindo(null)} className="w-full bg-white/5 text-white/30 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: VOLTAR PARA VITRINE */}
      {perguntarVitrine && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-[300px] bg-[#0d0d0d] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e11d48] mb-2">Vitrine</p>
            <h3 className="text-sm font-black italic uppercase tracking-tighter mb-8 leading-tight">Deseja voltar a arte "{perguntarVitrine.titulo}" para a vitrine e catálogo?</h3>
            <div className="space-y-3">
              <button onClick={() => voltarArteParaVitrine(perguntarVitrine.id, 'sim')} className="w-full bg-white text-black h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Sim, Voltar para Vitrine</button>
              <button onClick={() => voltarArteParaVitrine(null, 'nao')} className="w-full bg-white/5 text-white/30 h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest">Não, Manter Vendida</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP ARTE */}
      {arteFocada && (() => {
        const fotos = Array.isArray(arteFocada.imagem_url) ? arteFocada.imagem_url : [arteFocada.imagem_url];
        return (
          <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in" onClick={() => setArteFocada(null)}>
            <div className="w-full max-w-[320px] bg-[#0d0d0d] rounded-[35px] border border-white/10 overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="relative aspect-[4/5] bg-black overflow-hidden">
                <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory h-full no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {fotos.map((url, i) => <div key={i} className="min-w-full h-full snap-center"><img src={url} className="w-full h-full object-cover" alt="" /></div>)}
                </div>
                <button onClick={() => setArteFocada(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/50 border border-white/20 rounded-full flex items-center justify-center text-white z-10">✕</button>
                {fotos.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">{fotos.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === indexFoto ? 'w-4 bg-white' : 'w-1 bg-white/30'}`} />)}</div>}
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] mb-1 block italic">Artwork</span>
                  <h3 className="text-sm font-black italic uppercase tracking-tighter truncate">{arteFocada.titulo}</h3>
                </div>
                <button onClick={() => baixarImagem(fotos[indexFoto], arteFocada.titulo)} className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl active:scale-90 transition-all shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Baixar</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}