import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function ModalAgendamento({ aberto, fechar, arte, aoSucesso, setErroModal }) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [enviando, setEnviando] = useState(false);
  
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [hora, setHora] = useState(new Date().getHours());
  const [minuto, setMinuto] = useState(0);

  const scrollHoraRef = useRef(null);
  const scrollMinutoRef = useRef(null);

  // Gerar 120 dias (4 meses) para o carrossel
  const dias = Array.from({ length: 120 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const aplicarMascaraWhatsapp = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    return v;
  };

  const handleScroll = (ref, setFn, range) => {
    if (!ref.current) return;
    const scrollPos = ref.current.scrollTop;
    const itemHeight = 32; 
    const index = Math.round(scrollPos / itemHeight);
    if (index >= 0 && index < range.length) {
      setFn(range[index]);
    }
  };

  if (!aberto) return null;

  const salvarAgendamento = async (e) => {
    e.preventDefault();
    
    if (!nome || whatsapp.length < 14) {
      setErroModal({ 
        aberto: true, 
        mensagem: "Preencha o nome e o WhatsApp completo para prosseguir." 
      });
      return;
    }

    setEnviando(true);
    try {
      const dataFinal = new Date(dataSelecionada);
      dataFinal.setHours(parseInt(hora), parseInt(minuto), 0);

      // 1. Salva o agendamento
      const { error } = await supabase.from('agendamentos').insert([{
        tatuador_id: arte.tatuador_id,
        arte_id: arte.id,
        cliente_nome: nome.toUpperCase(),
        cliente_whatsapp: whatsapp.replace(/\D/g, ""),
        data_hora: dataFinal.toISOString()
      }]);

      if (error) throw error;
      
      // 2. Marca a arte como vendida
      await supabase.from('artes').update({ vendida: true }).eq('id', arte.id);
      
      // 3. FLUXO DIRETO: Notifica o pai (Dashboard/Feed) e fecha o modal
      // Isso fará com que o pop-up de "Arte Publicada" (ou reservada) apareça na tela de início
      aoSucesso(); 
      fechar(); 

    } catch (err) {
      console.error(err);
      setErroModal({ 
        aberto: true, 
        mensagem: "Ocorreu um erro ao processar o agendamento." 
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-[45px] overflow-hidden flex flex-col shadow-2xl">
        
        {/* HEADER */}
        <div className="pt-8 px-8 pb-4 flex justify-between items-end">
          <div>
            <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.3em] italic">Nova Reserva</span>
            <h2 className="text-xl font-black italic uppercase tracking-tighter leading-none">Agendar<span className="text-[#e11d48]">.</span></h2>
          </div>
          <button onClick={fechar} type="button" className="text-white/20 mb-1 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={salvarAgendamento} className="px-6 pb-8 space-y-6">
          
          {/* SELETOR DE DATA */}
          <div className="space-y-3">
            <div className="px-2 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 italic">
                    {dataSelecionada.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
              {dias.map((dia, idx) => {
                const isSelected = dia.toDateString() === dataSelecionada.toDateString();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDataSelecionada(dia)}
                    className={`flex-shrink-0 w-16 h-20 rounded-[24px] flex flex-col items-center justify-center transition-all border ${
                      isSelected ? 'bg-white border-white text-black scale-105 shadow-lg' : 'bg-white/5 border-white/5 text-white/30'
                    }`}
                  >
                    <span className={`text-[8px] font-black uppercase mb-1 ${isSelected ? 'text-black/40' : 'text-white/20'}`}>
                        {dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}
                    </span>
                    <span className="text-lg font-black italic">{dia.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIME PICKER */}
          <div className="relative flex justify-center h-28 bg-black/40 rounded-[32px] border border-white/5 overflow-hidden">
              <div className="absolute inset-x-0 h-10 top-1/2 -translate-y-1/2 border-y border-[#e11d48]/20 pointer-events-none bg-[#e11d48]/5"></div>
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] z-10"></div>

              <div className="flex items-center gap-6 z-0">
                  <div 
                      ref={scrollHoraRef}
                      onScroll={() => handleScroll(scrollHoraRef, setHora, Array.from({length: 24}, (_, i) => i))}
                      className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-10"
                  >
                      {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className={`h-8 w-12 flex items-center justify-center text-sm font-black italic snap-center transition-all ${hora === i ? 'text-white' : 'text-white/10'}`}>
                          {i.toString().padStart(2, '0')}
                      </div>
                      ))}
                  </div>

                  <span className="text-xs font-black text-white/10">:</span>

                  <div 
                      ref={scrollMinutoRef}
                      onScroll={() => handleScroll(scrollMinutoRef, setMinuto, [0, 15, 30, 45])}
                      className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-10"
                  >
                      {[0, 15, 30, 45].map((m) => (
                      <div key={m} className={`h-8 w-12 flex items-center justify-center text-sm font-black italic snap-center transition-all ${minuto === m ? 'text-white' : 'text-white/10'}`}>
                          {m.toString().padStart(2, '0')}
                      </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* INPUTS */}
          <div className="space-y-3">
              <input 
                  placeholder="NOME DO CLIENTE"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-white/20 transition-all placeholder:text-white/10 italic"
              />
              <input 
                  placeholder="WHATSAPP"
                  value={whatsapp}
                  inputMode="tel"
                  onChange={(e) => setWhatsapp(aplicarMascaraWhatsapp(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-white/20 transition-all placeholder:text-white/10 italic"
              />
          </div>

          <button 
            disabled={enviando}
            className="w-full bg-[#e11d48] text-white py-5 rounded-[28px] font-black uppercase text-[10px] tracking-[0.3em] shadow-[0_15px_30px_rgba(225,29,72,0.2)] active:scale-95 transition-all disabled:opacity-30 italic"
          >
            {enviando ? 'RESERVANDO...' : 'FINALIZAR AGENDAMENTO'}
          </button>
        </form>
      </div>
    </div>
  );
}