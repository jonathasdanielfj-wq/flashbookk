import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function PerfilPublico() {
  const { username } = useParams();
  const [tatuador, setTatuador] = useState(null);
  const [artes, setArtes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [imagemFocada, setImagemFocada] = useState(null);
  const [indexFoto, setIndexFoto] = useState(0);
  const [verFotoInteira, setVerFotoInteira] = useState(null);
  const [erro, setErro] = useState(null); // Estado para capturar erros
  const scrollRef = useRef(null);

  const [cores, setCores] = useState({
    primaria: '#e11d48',
    fundo: '#050505',
    card: '#0d0d0d',
    texto: '#ffffff',
    subtexto: '#666666'
  });

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregando(true);
        // 1. Busca o tatuador
        const { data: prof, error: errorProf } = await supabase
          .from('tatuadores')
          .select('*')
          .eq('username', username)
          .maybeSingle(); // maybeSingle evita erro se não achar nada

        if (errorProf) throw errorProf;
        
        if (!prof) {
          setErro("Perfil não encontrado.");
          setCarregando(false);
          return;
        }

        setTatuador(prof);
        
        // Aplica cores com fallback (importante para não quebrar o estilo)
        setCores({
          primaria: prof.cor_primaria || '#e11d48',
          fundo: prof.cor_fundo || '#050505',
          card: prof.cor_card || '#0d0d0d',
          texto: prof.cor_texto || '#ffffff',
          subtexto: prof.cor_subtexto || '#666666'
        });

        // 2. Busca as artes (usando o ID garantido)
        const { data: listaArtes, error: errorArtes } = await supabase
          .from('artes')
          .select('*')
          .eq('tatuador_id', prof.id)
          .order('vendida', { ascending: true }) 
          .order('created_at', { ascending: false });

        if (errorArtes) throw errorArtes;
        setArtes(listaArtes || []);

      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setErro("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };

    if (username) buscarDados();
  }, [username]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, offsetWidth } = scrollRef.current;
      const index = Math.round(scrollLeft / offsetWidth);
      setIndexFoto(index);
    }
  };

  const fecharPopup = () => {
    setImagemFocada(null);
    setIndexFoto(0);
  };

  const abrirOrcamentoComArte = (e, arte) => {
    e.stopPropagation();
    if (!tatuador?.whatsapp) return alert("WhatsApp não configurado.");
    const numeroLimpo = tatuador.whatsapp.replace(/\D/g, "");
    const fotos = Array.isArray(arte?.imagem_url) ? arte.imagem_url : [arte?.imagem_url];
    const urlArte = fotos[indexFoto] || fotos[0];
    const mensagem = encodeURIComponent(`Olá @${username}! Vi seu portfólio e quero orçar: ${arte?.titulo}\nRef: ${urlArte}`);
    window.open(`https://wa.me/${numeroLimpo}?text=${mensagem}`, '_blank');
  };

  if (carregando) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center text-[10px] font-black tracking-[0.5em] text-white/20 uppercase">
      Sincronizando...
    </div>
  );

  if (erro) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10 text-center">
      <h2 className="text-white font-black uppercase italic mb-4">{erro}</h2>
      <button onClick={() => window.location.reload()} className="text-[#e11d48] text-[10px] font-black uppercase tracking-widest">Tentar Novamente</button>
    </div>
  );

  return (
    <div 
      className="min-h-screen font-sans overflow-x-hidden pb-10 transition-all duration-500"
      style={{ backgroundColor: cores.fundo }}
    >
      <header className="pt-14 pb-10 px-6 max-w-screen-xl mx-auto flex items-start justify-between">
        <div className="flex flex-col flex-1 pr-4">
            <span style={{ color: cores.primaria }} className="text-[8px] font-black uppercase tracking-[0.4em] mb-1 italic">Tattoo Artist</span>
            <h1 style={{ color: cores.texto }} className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                {username}<span style={{ color: cores.primaria }}>.</span>
            </h1>
            <span className="text-[9px] font-bold uppercase tracking-widest text-green-500 flex items-center gap-2 mb-2 italic">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span> Agenda Aberta
            </span>
        </div>

        <div className="w-14 h-14 rounded-full p-0.5 border border-white/10 shadow-xl overflow-hidden mt-2">
            <img 
              src={tatuador?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=0D0D0D&color=fff`} 
              className="w-full h-full object-cover rounded-full grayscale" 
              alt=""
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${username}&background=0D0D0D&color=fff` }}
            />
        </div>
      </header>

      <main className="px-4 grid grid-cols-2 gap-3 max-w-screen-xl mx-auto">
        {artes.map((arte) => {
          const isReservado = arte.vendida === true;
          // Garante que imagem_url seja tratada corretamente
          const urlImagem = Array.isArray(arte.imagem_url) ? arte.imagem_url[0] : arte.imagem_url;

          return (
            <div 
              key={arte.id} 
              onClick={() => !isReservado && setImagemFocada(arte)}
              className={`group relative transition-all ${isReservado ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
            >
              <div 
                className={`relative overflow-hidden rounded-[24px] aspect-[3/4] border border-white/5 shadow-2xl transition-all duration-500 ${isReservado ? 'opacity-40' : ''}`}
                style={{ backgroundColor: cores.card }}
              >
                <img 
                  src={urlImagem} 
                  className={`w-full h-full object-cover transition-all duration-700 ${isReservado ? 'grayscale' : 'grayscale-[0.2] group-hover:grayscale-0'}`} 
                  alt={arte.titulo} 
                />
                
                <div className="absolute top-3 right-4 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                  {isReservado ? (
                    <span className="text-[7px] font-black uppercase tracking-widest text-[#e11d48] italic">Reservado</span>
                  ) : (
                    <span className="text-[7px] font-black uppercase tracking-widest text-green-500 italic">Disponível</span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
                  <p className="text-[8px] font-black uppercase tracking-widest">
                    {isReservado ? (
                      <span style={{ color: cores.subtexto }} className="line-through opacity-50">Indisponível</span>
                    ) : (
                      <span style={{ color: cores.primaria }}>{arte.preco}</span>
                    )}
                  </p>
                </div>
              </div>
              
              {!isReservado && (
                <p style={{ color: cores.texto }} className="mt-2 ml-2 text-[9px] font-black uppercase tracking-tighter italic opacity-80">
                  {arte.titulo}
                </p>
              )}
            </div>
          );
        })}
      </main>

      {imagemFocada && (() => {
        const fotos = Array.isArray(imagemFocada.imagem_url) ? imagemFocada.imagem_url : [imagemFocada.imagem_url];
        
        return (
          <div 
            className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-md"
            onClick={fecharPopup}
          >
            <div 
              className="w-full max-w-[320px] rounded-[32px] border border-white/10 flex flex-col overflow-hidden shadow-2xl"
              style={{ backgroundColor: cores.card }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[4/5] bg-black overflow-hidden">
                <div 
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full w-full no-scrollbar"
                >
                  {fotos.map((url, i) => (
                    <div key={i} className="min-w-full h-full snap-center">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setVerFotoInteira(fotos[indexFoto] || fotos[0])}
                  className="absolute bottom-4 right-4 w-9 h-9 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white z-10"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                </button>

                <button onClick={fecharPopup} className="absolute top-4 right-4 w-8 h-8 bg-black/50 border border-white/20 rounded-full flex items-center justify-center text-white z-10 text-xs">✕</button>
              </div>

              <div className="p-6">
                  <div className="mb-6">
                      <span style={{ color: cores.primaria }} className="text-[7px] font-black uppercase tracking-[0.4em] mb-1 block italic">Details</span>
                      <h2 style={{ color: cores.texto }} className="text-xl font-black italic uppercase tracking-tighter leading-none mb-1">
                        {imagemFocada?.titulo}
                      </h2>
                      <p style={{ color: cores.subtexto }} className="font-bold text-[9px] tracking-[0.2em] uppercase opacity-60">
                        Referência disponível • {imagemFocada?.preco}
                      </p>
                  </div>

                  <button 
                    onClick={(e) => abrirOrcamentoComArte(e, imagemFocada)}
                    style={{ backgroundColor: cores.primaria }}
                    className="w-full text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl italic"
                  >
                    Solicitar Projeto
                  </button>
              </div>
            </div>
          </div>
        );
      })()}

      {verFotoInteira && (
        <div 
          className="fixed inset-0 bg-black z-[10000] flex items-center justify-center"
          onClick={() => setVerFotoInteira(null)}
        >
          <img src={verFotoInteira} className="max-w-full max-h-full object-contain" alt="" />
        </div>
      )}
    </div>
  );
}
