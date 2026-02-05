import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { AnimatePresence } from 'framer-motion';

export default function Personalizacao({ user, voltar }) {
  const MEU_TATUADOR_ID = user?.id;

  const PADRAO = {
    primaria: '#e11d48',
    fundo: '#050505',
    card: '#0d0d0d',
    texto: '#ffffff',
    subtexto: '#666666'
  };

  const [corPrimaria, setCorPrimaria] = useState(PADRAO.primaria);
  const [corFundo, setCorFundo] = useState(PADRAO.fundo);
  const [corCard, setCorCard] = useState(PADRAO.card);
  const [corTexto, setCorTexto] = useState(PADRAO.texto);
  const [corSubtexto, setCorSubtexto] = useState(PADRAO.subtexto);
  
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const refHeader = useRef(null);
  const refSeletores = useRef(null);
  const refMockup = useRef(null);
  const refBotaoSalvar = useRef(null);

  const [tutorialAtivo, setTutorialAtivo] = useState(false);
  const [passoTutorial, setPassoTutorial] = useState(0);
  const [coords, setCoords] = useState({ x: 0, y: 0, w: 0, h: 0, vTop: 0 });

  const passos = [
    { titulo: "O Laboratório", desc: "Defina a estética que seus clientes verão ao acessar seu perfil.", ref: refHeader },
    { titulo: "Paleta de Cores", desc: "Mude as cores do destaque, fundo, cards e textos aqui.", ref: refSeletores },
    { titulo: "Visual Final", desc: "Verifique se as cores permitem uma boa leitura.", ref: refMockup },
    { titulo: "Salvar Projeto", desc: "Salve para que as alterações fiquem visíveis no seu link.", ref: refBotaoSalvar }
  ];

  const updateCoords = useCallback(() => {
    const el = passos[passoTutorial]?.ref?.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        x: rect.left - 5,
        y: rect.top + window.scrollY - 5,
        w: rect.width + 10,
        h: rect.height + 10,
        vTop: rect.top
      });
    }
  }, [passoTutorial]);

  // Efeito para abrir o tutorial automaticamente na primeira vez
  useEffect(() => {
    const checkTutorial = () => {
        const jaViu = localStorage.getItem(`tutorial_design_v25_${MEU_TATUADOR_ID}`);
        if (!jaViu) {
            setTimeout(() => {
                setTutorialAtivo(true);
            }, 1200); // Delay suave para o usuário se situar antes do popup
        }
    };

    if (MEU_TATUADOR_ID) {
        checkTutorial();
    }
  }, [MEU_TATUADOR_ID]);

  // Lógica de Scroll e Coords
  useEffect(() => {
    if (tutorialAtivo) {
        if (passoTutorial === 3) {
            refBotaoSalvar.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (passoTutorial === 2) {
            refMockup.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (passoTutorial === 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        const timer = setTimeout(updateCoords, 400);
        return () => clearTimeout(timer);
    }
  }, [passoTutorial, tutorialAtivo, updateCoords]);

  useEffect(() => {
    const buscarConfiguracoes = async () => {
      const { data } = await supabase
        .from('tatuadores')
        .select('cor_primaria, cor_fundo, cor_card, cor_texto, cor_subtexto')
        .eq('id', MEU_TATUADOR_ID)
        .single();
      if (data) {
        setCorPrimaria(data.cor_primaria || PADRAO.primaria);
        setCorFundo(data.cor_fundo || PADRAO.fundo);
        setCorCard(data.cor_card || PADRAO.card);
        setCorTexto(data.cor_texto || PADRAO.texto);
        setCorSubtexto(data.cor_subtexto || PADRAO.subtexto);
      }
    };
    if (MEU_TATUADOR_ID) buscarConfiguracoes();
  }, [MEU_TATUADOR_ID]);

  useEffect(() => {
    if (tutorialAtivo) {
      updateCoords();
      window.addEventListener('scroll', updateCoords);
      window.addEventListener('resize', updateCoords);
      return () => {
        window.removeEventListener('scroll', updateCoords);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [tutorialAtivo, updateCoords]);

  const abrirTutorial = () => {
    setPassoTutorial(0);
    setTutorialAtivo(true);
  };

  const fecharTutorial = () => {
    localStorage.setItem(`tutorial_design_v25_${MEU_TATUADOR_ID}`, 'true');
    setTutorialAtivo(false);
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
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white flex flex-col font-sans relative max-w-md mx-auto ${tutorialAtivo ? 'overflow-hidden h-screen' : 'overflow-x-hidden'}`}>
      
      {/* 1. MÁSCARA SVG */}
      {tutorialAtivo && (
        <div className="fixed inset-0 z-[100000] pointer-events-none w-full h-full">
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <mask id="tutorialMaskFinalV11">
                        <rect width="100%" height="100%" fill="white" />
                        <rect 
                            x={coords.x} 
                            y={coords.y - window.scrollY} 
                            width={coords.w} 
                            height={coords.h} 
                            rx="25" 
                            fill="black" 
                            className="transition-all duration-300"
                        />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.94)" mask="url(#tutorialMaskFinalV11)" />
            </svg>
            <div 
                className="absolute border-2 border-[#e11d48] rounded-[25px] transition-all duration-300 shadow-[0_0_20px_rgba(225,29,72,0.5)] z-[100001]"
                style={{ top: coords.y - window.scrollY, left: coords.x, width: coords.w, height: coords.h }}
            />
        </div>
      )}

      {/* 2. HEADER */}
      <header ref={refHeader} className={`pt-10 pb-6 px-6 flex items-center justify-between sticky top-0 bg-[#050505] z-[50] ${tutorialAtivo && passoTutorial === 0 ? 'relative z-[100002]' : ''}`}>
        <button onClick={voltar} className="w-10 h-10 flex items-center justify-start active:scale-90 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex items-center gap-3">
            <span className="text-[11px] font-black tracking-[0.3em] uppercase italic text-white/40">Lab Design</span>
            <button onClick={abrirTutorial} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[12px] font-bold text-white/40 hover:text-white transition-all bg-white/5">?</button>
        </div>
        <button onClick={() => {
            setCorPrimaria(PADRAO.primaria); setCorFundo(PADRAO.fundo); setCorCard(PADRAO.card);
            setCorTexto(PADRAO.texto); setCorSubtexto(PADRAO.subtexto);
        }} className="text-[#e11d48] font-black uppercase text-[10px] tracking-tighter opacity-70 hover:opacity-100 transition-opacity">Reset</button>
      </header>

      {/* 3. SELETORES EM LINHA ÚNICA */}
      <div 
        ref={refSeletores} 
        className={`px-4 py-6 transition-all ${tutorialAtivo && passoTutorial === 1 ? 'relative z-[100002] bg-[#0d0d0d] rounded-3xl mx-2 shadow-2xl border border-white/5' : ''}`}
      >
        <div className="flex items-start justify-between">
            <ColorCircle value={corPrimaria} onChange={setCorPrimaria} label="Destaque" />
            <ColorCircle value={corFundo} onChange={setCorFundo} label="Fundo" />
            <ColorCircle value={corCard} onChange={setCorCard} label="Cards" />
            <ColorCircle value={corTexto} onChange={setCorTexto} label="Nome" />
            <ColorCircle value={corSubtexto} onChange={setCorSubtexto} label="Detalhes" />
        </div>
      </div>

      {/* 4. MOCKUP */}
      <div className="flex flex-col items-center px-6 py-4">
        <div 
          ref={refMockup}
          className={`w-full max-w-[280px] rounded-[50px] border-[8px] border-[#151515] shadow-2xl overflow-hidden flex flex-col transition-all ${tutorialAtivo && passoTutorial === 2 ? 'relative z-[100002] scale-105' : ''}`}
          style={{ backgroundColor: corFundo }}
        >
          <div className="h-7 w-full flex justify-center items-center bg-[#151515]/30">
            <div className="w-14 h-1.5 bg-[#151515] rounded-full"></div>
          </div>
          <div className="p-6 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                    <span style={{ color: corPrimaria }} className="text-[8px] font-black uppercase italic mb-1 tracking-widest">Tattoo Artist</span>
                    <h2 style={{ color: corTexto }} className="text-2xl font-black italic uppercase leading-none">{user?.user_metadata?.username || 'Artista'}</h2>
                    <span style={{ color: corSubtexto }} className="text-[8px] font-bold uppercase tracking-[0.2em] mt-2 opacity-80 italic">São Paulo, BR</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden ring-2 ring-white/5">
                    <img src={user?.user_metadata?.avatar_url} className="w-full h-full object-cover" alt="" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[1, 2].map(i => (
                <div key={i} className="aspect-[3/4] rounded-2xl border border-white/5 flex flex-col p-3" style={{ backgroundColor: corCard }}>
                   <div className="flex-1 bg-white/5 rounded-xl mb-3"></div>
                   <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: corPrimaria }}></div>
                </div>
              ))}
            </div>
            <div className="mt-auto h-12 rounded-2xl flex items-center justify-center text-[10px] font-black text-white italic shadow-lg uppercase tracking-widest" style={{ backgroundColor: corPrimaria }}>Agendar Agora</div>
          </div>
        </div>

        <div ref={refBotaoSalvar} className={`w-full max-w-[280px] mt-8 mb-12 ${tutorialAtivo && passoTutorial === 3 ? 'relative z-[100002]' : ''}`}>
            <button onClick={salvarEstilo} className="w-full bg-white text-black py-5 rounded-[22px] font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 italic shadow-2xl transition-transform">
                {carregando ? 'PROCESSANDO...' : 'SALVAR DESIGN'}
            </button>
        </div>
      </div>

      {/* 5. SUCESSO PADRONIZADO (COM PADRÃO DE EXCLUSÃO) */}
      <AnimatePresence>
        {sucesso && (
          <div className="fixed inset-0 bg-black/98 z-[2000000] flex items-center justify-center p-8 backdrop-blur-xl">
            <div className="w-full max-w-xs bg-[#0a0a0a] rounded-[50px] border border-white/10 p-12 text-center shadow-2xl">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 border border-green-500/20">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <h2 className="text-xl font-black uppercase mb-10 italic text-white tracking-tighter leading-none">Estilo Salvo!</h2>
                <button onClick={() => { setSucesso(false); voltar(); }} className="w-full bg-white text-black h-16 rounded-[25px] text-[11px] font-black uppercase italic shadow-lg active:scale-95 transition-all">FECHAR</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. POPUP DO TUTORIAL */}
      {tutorialAtivo && (
        <div 
          className="fixed z-[999999] pointer-events-auto w-[90%] max-w-[340px] bg-[#0d0d0d] border border-white/10 rounded-[45px] p-10 shadow-[0_40px_80px_rgba(0,0,0,1)] transition-all duration-500"
          style={{ 
              top: (passoTutorial === 2 || passoTutorial === 3) ? '60px' : `${Math.max(60, coords.vTop + coords.h + 20)}px`,
              left: '50%',
              transform: 'translateX(-50%)'
          }}
        >
          <div className="flex justify-between items-center mb-6 text-[#e11d48]">
            <span className="text-[8px] font-black uppercase tracking-[0.5em] italic">Guia Rápido</span>
            <span className="text-[10px] font-bold opacity-30">{passoTutorial + 1}/4</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 italic text-white tracking-tighter leading-none">{passos[passoTutorial].titulo}</h2>
          <p className="text-[12px] text-white/50 uppercase tracking-widest mb-10 leading-relaxed italic font-medium">{passos[passoTutorial].desc}</p>
          <button 
              onClick={() => {
                  if (passoTutorial < passos.length - 1) {
                      setPassoTutorial(p => p + 1);
                  } else {
                      fecharTutorial();
                  }
              }}
              className="w-full bg-[#e11d48] text-white py-5 rounded-[22px] font-black uppercase text-[11px] tracking-widest active:scale-95 italic shadow-xl"
          >
              {passoTutorial === passos.length - 1 ? "COMEÇAR AGORA" : "PRÓXIMO"}
          </button>
        </div>
      )}
    </div>
  );
}

function ColorCircle({ value, onChange, label }) {
    return (
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-white/10 overflow-hidden relative shadow-lg ring-4 ring-black/50">
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-10px] w-[150%] h-[150%] cursor-pointer bg-transparent border-none" />
            </div>
            <span className="text-[7px] font-black uppercase text-white/40 italic tracking-tight text-center truncate w-full">{label}</span>
        </div>
    );
}