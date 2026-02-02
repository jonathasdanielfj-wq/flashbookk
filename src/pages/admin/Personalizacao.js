import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function Personalizacao({ user, voltar }) {
  const MEU_TATUADOR_ID = user?.id;

  // VALORES PADRÃO (PARA RESTAURAR)
  const PADRAO = {
    primaria: '#e11d48',
    fundo: '#050505',
    card: '#0d0d0d',
    texto: '#ffffff',
    subtexto: '#666666'
  };

  // ESTADOS DE PERSONALIZAÇÃO
  const [corPrimaria, setCorPrimaria] = useState(PADRAO.primaria);
  const [corFundo, setCorFundo] = useState(PADRAO.fundo);
  const [corCard, setCorCard] = useState(PADRAO.card);
  const [corTexto, setCorTexto] = useState(PADRAO.texto);
  const [corSubtexto, setCorSubtexto] = useState(PADRAO.subtexto);
  
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // BUSCAR CONFIGURAÇÕES ATUAIS
  useEffect(() => {
    const buscarConfiguracoes = async () => {
      const { data } = await supabase
        .from('tatuadores')
        .select('cor_primaria, cor_fundo, cor_card, cor_texto, cor_subtexto')
        .eq('id', MEU_TATUADOR_ID)
        .single();

      if (data) {
        if (data.cor_primaria) setCorPrimaria(data.cor_primaria);
        if (data.cor_fundo) setCorFundo(data.cor_fundo);
        if (data.cor_card) setCorCard(data.cor_card);
        if (data.cor_texto) setCorTexto(data.cor_texto);
        if (data.cor_subtexto) setCorSubtexto(data.cor_subtexto);
      }
    };
    buscarConfiguracoes();
  }, [MEU_TATUADOR_ID]);

  const restaurarPadrao = () => {
    setCorPrimaria(PADRAO.primaria);
    setCorFundo(PADRAO.fundo);
    setCorCard(PADRAO.card);
    setCorTexto(PADRAO.texto);
    setCorSubtexto(PADRAO.subtexto);
  };

  const salvarEstilo = async () => {
    setCarregando(true);
    try {
      const { error } = await supabase
        .from('tatuadores')
        .update({
          cor_primaria: corPrimaria,
          cor_fundo: corFundo,
          cor_card: corCard,
          cor_texto: corTexto,
          cor_subtexto: corSubtexto
        })
        .eq('id', MEU_TATUADOR_ID);

      if (error) throw error;
      setSucesso(true);
    } catch (err) {
      alert("Erro ao salvar personalização");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans overflow-y-auto no-scrollbar">
      
      {/* HEADER FIXO */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between sticky top-0 bg-[#050505]/90 backdrop-blur-md z-50">
        <button onClick={voltar} className="text-white/20 font-black uppercase text-[9px] tracking-[0.3em] active:scale-90 transition-all">
          [ Voltar ]
        </button>
        <span className="text-[10px] font-black tracking-[0.5em] uppercase italic text-white/40">Lab Design</span>
        <button onClick={restaurarPadrao} className="text-[#e11d48] font-black uppercase text-[8px] tracking-[0.2em] active:scale-90 transition-all">
          Restaurar
        </button>
      </header>

      {/* SELETORES EM CÍRCULOS */}
      <div className="px-6 py-6 overflow-x-auto no-scrollbar">
        <div className="flex justify-start sm:justify-center gap-6 min-w-max">
          <ColorCircle value={corPrimaria} onChange={setCorPrimaria} label="Destaque" />
          <ColorCircle value={corFundo} onChange={setCorFundo} label="Fundo" />
          <ColorCircle value={corCard} onChange={setCorCard} label="Cards" />
          <ColorCircle value={corTexto} onChange={setCorTexto} label="Nome" />
          <ColorCircle value={corSubtexto} onChange={setCorSubtexto} label="Detalhes" />
        </div>
      </div>

      {/* ÁREA DO MOCKUP */}
      <div className="flex-1 flex flex-col items-center px-6 pb-10">
        <div 
          className="w-full max-w-[300px] rounded-[45px] border-[8px] border-[#151515] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col transition-all duration-500"
          style={{ backgroundColor: corFundo }}
        >
          {/* Topo do Celular */}
          <div className="h-7 w-full flex justify-center items-start pt-2">
            <div className="w-16 h-3.5 bg-[#151515] rounded-full"></div>
          </div>

          <div className="p-6 pt-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                    <span style={{ color: corPrimaria }} className="text-[7px] font-black uppercase tracking-widest italic mb-1">Tattoo Artist</span>
                    <h2 style={{ color: corTexto }} className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                        {user?.username || 'Username'}<span style={{ color: corPrimaria }}>.</span>
                    </h2>
                    <span className="text-[7px] font-bold uppercase tracking-widest text-green-500 flex items-center gap-1 mt-2 italic">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> Agenda Aberta
                    </span>
                </div>
                <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 overflow-hidden grayscale">
                    <img src={user?.user_metadata?.avatar_url || 'https://via.placeholder.com/100'} alt="" className="w-full h-full object-cover" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[1, 2].map(i => (
                <div key={i} className="aspect-[3/4] rounded-[20px] border border-white/5 flex flex-col p-2 shadow-lg" style={{ backgroundColor: corCard }}>
                  <div className="flex-1 bg-white/5 rounded-xl mb-2"></div>
                  <div className="h-1 w-full rounded-full" style={{ backgroundColor: corPrimaria }}></div>
                  <div className="h-1 w-1/2 mt-1 rounded-full opacity-30" style={{ backgroundColor: corTexto }}></div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 mb-8">
                <div className="h-1 w-full rounded-full" style={{ backgroundColor: corSubtexto, opacity: 0.5 }}></div>
                <div className="h-1 w-[80%] rounded-full" style={{ backgroundColor: corSubtexto, opacity: 0.3 }}></div>
            </div>

            <div className="mt-auto mb-2 h-12 rounded-2xl flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-white shadow-xl italic" style={{ backgroundColor: corPrimaria }}>
              AGENDAR FLASH
            </div>
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <div className="w-full max-w-[300px] mt-10 pb-20">
            <button 
                onClick={salvarEstilo}
                disabled={carregando}
                className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all italic shadow-2xl"
            >
                {carregando ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
        </div>
      </div>

      {/* POP-UP DE SUCESSO PADRÃO - FECHAR VOLTA PARA HOME */}
      {sucesso && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-8">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500 border border-green-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 className="text-lg font-black uppercase mb-2 italic tracking-tighter">Estilo Salvo!</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-8">Sua página foi atualizada.</p>
            
            {/* O BOTÃO ABAIXO AGORA EXECUTA O VOLTAR() */}
            <button 
              onClick={() => {
                setSucesso(false);
                voltar();
              }} 
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all italic"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorCircle({ value, onChange, label }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full border-2 border-white/10 p-0 overflow-hidden shadow-xl relative">
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="absolute inset-[-5px] w-[120%] h-[120%] cursor-pointer bg-transparent border-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none" 
                />
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{label}</span>
        </div>
    );
}