import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

export default function Home() {
  const [artes, setArtes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estado para o Carrossel (Arte selecionada)
  const [arteSelecionada, setArteSelecionada] = useState(null);

  useEffect(() => {
    buscarArtes();
  }, []);

  const buscarArtes = async () => {
    try {
      const { data, error } = await supabase
        .from('artes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setArtes(data || []);
    } catch (err) {
      console.error("Erro ao carregar vitrine:", err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#e11d48]">
      {/* HEADER MINIMALISTA */}
      <header className="py-12 text-center border-b border-white/5">
        <h1 className="text-2xl font-black italic tracking-[0.3em] uppercase leading-none text-white">
          BLACK <span className="text-[#e11d48]">/</span> STUDIO
        </h1>
        <p className="text-[9px] tracking-[0.4em] text-gray-500 uppercase mt-4 font-bold">Tattoo & Art Gallery</p>
      </header>

      {/* GRADE DE ARTES */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-[#e11d48] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold">Carregando Galeria...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {artes.map((arte) => (
              <div 
                key={arte.id} 
                onClick={() => setArteSelecionada(arte)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/5 cursor-pointer active:scale-95 transition-all duration-500"
              >
                {/* Imagem de Capa (Primeira do array) */}
                <img 
                  src={Array.isArray(arte.imagem_url) ? arte.imagem_url[0] : arte.imagem_url} 
                  alt={arte.titulo}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                />

                {/* Badge de Múltiplas Fotos */}
                {Array.isArray(arte.imagem_url) && arte.imagem_url.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 z-10">
                     <p className="text-[7px] font-black text-white">+{arte.imagem_url.length - 1} FOTOS</p>
                  </div>
                )}

                {/* Overlay de Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest leading-tight">{arte.titulo}</h3>
                  <p className="text-[9px] text-[#e11d48] font-bold mt-1">{arte.preco}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-10 text-center border-t border-white/5 opacity-30">
        <p className="text-[8px] tracking-widest font-bold uppercase">© 2026 Black Studio • Privacy</p>
      </footer>

      {/* MODAL DO CARROSSEL (VIEWER) */}
      {arteSelecionada && (
        <div className="fixed inset-0 bg-black z-[500] flex flex-col animate-in fade-in duration-300">
          {/* Botão Fechar */}
          <button 
            onClick={() => setArteSelecionada(null)}
            className="absolute top-8 right-6 w-12 h-12 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center text-white z-[600] active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          {/* Área do Swiper */}
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              className="w-full h-[75vh]"
              spaceBetween={0}
              slidesPerView={1}
            >
              {Array.isArray(arteSelecionada.imagem_url) ? (
                arteSelecionada.imagem_url.map((url, idx) => (
                  <SwiperSlide key={idx} className="flex items-center justify-center p-4">
                    <img 
                      src={url} 
                      className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl" 
                      alt="" 
                    />
                  </SwiperSlide>
                ))
              ) : (
                <SwiperSlide className="flex items-center justify-center p-4">
                  <img src={arteSelecionada.imagem_url} className="max-w-full max-h-full object-contain rounded-3xl" alt="" />
                </SwiperSlide>
              )}
            </Swiper>
          </div>

          {/* Info Inferior do Modal */}
          <div className="p-8 text-center bg-gradient-to-t from-black to-transparent">
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{arteSelecionada.titulo}</h2>
            <p className="text-[#e11d48] font-bold text-sm mt-1">{arteSelecionada.preco}</p>
            
            <button className="mt-8 bg-white text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
              Agendar via WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* ESTILO PARA AS BOLINHAS DO PAGINATION (SWIPER) */}
      <style>{`
        .swiper-pagination-bullet { background: white !important; opacity: 0.3; }
        .swiper-pagination-bullet-active { background: #e11d48 !important; opacity: 1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}