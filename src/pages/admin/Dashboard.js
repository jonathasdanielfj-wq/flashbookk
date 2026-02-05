import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { deletarImagens, uploadImagem } from '../../services/uploadService';
import { AnimatePresence, motion } from 'framer-motion';
import Cropper from 'react-easy-crop';
import ModalUpload from './ModalUpload';
import ModalAgendamento from './ModalAgendamento';
import Agenda from './Agenda';
import Financas from './Financas';
import Personalizacao from './Personalizacao';

export default function Dashboard({ user }) {
  const usernameSlug = user?.user_metadata?.username || "perfil";
  const MEU_TATUADOR_ID = user?.id;
  
  const [artes, setArtes] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [nomeExibicao, setNomeExibicao] = useState(user?.user_metadata?.full_name || usernameSlug);
  const [subindoFoto, setSubindoFoto] = useState(false);
  const [telaAtual, setTelaAtual] = useState('dashboard');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [agendaAberto, setAgendaAberto] = useState({ aberto: false, arte: null });
  const [sucessoAberto, setSucessoAberto] = useState(false);
  const [sucessoUploadAberto, setSucessoUploadAberto] = useState(false); 
  const [copiado, setCopiado] = useState(false);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState({ aberto: false, id: null, urls: [] });
  const [erroModal, setErroModal] = useState({ aberto: false, mensagem: "" });

  const [imagemParaCortar, setImagemParaCortar] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const refHeader = useRef(null);
  const refLink = useRef(null);
  const refArtes = useRef(null);
  const refNav = useRef(null);
  const refAdd = useRef(null);

  const [tutorialAtivo, setTutorialAtivo] = useState(false);
  const [passoTutorial, setPassoTutorial] = useState(0);
  const [coords, setCoords] = useState({ x: 0, y: 0, w: 0, h: 0, position: 'bottom' });

  const passos = [
    { titulo: "Seu Espaço", desc: "Este é o Lab. Onde você organiza sua produção e controla sua agenda de forma brutal.", ref: refHeader },
    { titulo: "Sua Vitrine", desc: "Este link é sua Vitrine Online. É aqui que seus clientes entram para ver seus flashes e solicitar agendamentos.", ref: refLink },
    { titulo: "Gestão de Flash", desc: "Suas artes ficam aqui. Clique em uma para inserir dados do cliente e agendar a sessão.", ref: refArtes },
    { titulo: "Novo Trabalho", desc: "Use este botão para publicar um flash novo na sua vitrine instantaneamente.", ref: refAdd },
    { titulo: "Navegação", desc: "Acesse sua Agenda, veja seu Financeiro ou mude as Cores do seu portfólio por aqui.", ref: refNav }
  ];

  const updateCoords = useCallback(() => {
    const el = passos[passoTutorial]?.ref?.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY;
      const isElementLowerHalf = (rect.top + rect.height / 2) > window.innerHeight / 2;
      
      setCoords({
        x: rect.left - 5,
        y: rect.top + scrollY - 5,
        w: rect.width + 10,
        h: rect.height + 10,
        position: isElementLowerHalf ? 'top' : 'bottom'
      });
    }
  }, [passoTutorial]);

  const fileInputRef = useRef(null);
  const portfolioUrl = `${window.location.origin}/p/${usernameSlug}`;

  const buscarArtes = useCallback(async () => {
    if (!MEU_TATUADOR_ID) return;
    const { data, error } = await supabase.from('artes').select('*').eq('tatuador_id', MEU_TATUADOR_ID).eq('vendida', false).order('created_at', { ascending: false });
    if (!error) setArtes(data || []);
  }, [MEU_TATUADOR_ID]);

  const buscarPerfil = useCallback(async () => {
    if (!MEU_TATUADOR_ID) return;
    // Tenta buscar por nome_exibicao ou nome_completo para evitar erro de coluna
    const { data, error } = await supabase
      .from('tatuadores')
      .select('*') 
      .eq('id', MEU_TATUADOR_ID)
      .maybeSingle();

    if (error) {
       console.warn("Erro ao buscar perfil:", error.message);
       return;
    }

    if (data) {
      setAvatarUrl(data.avatar_url || user?.user_metadata?.avatar_url);
      setNomeExibicao(data.nome_exibicao || data.nome_completo || user?.user_metadata?.full_name || usernameSlug);
    }
  }, [MEU_TATUADOR_ID, user, usernameSlug]);

  useEffect(() => { 
    buscarArtes(); buscarPerfil();
    const jaViu = localStorage.getItem(`tutorial_v7_${MEU_TATUADOR_ID}`);
    if (!jaViu) setTimeout(() => setTutorialAtivo(true), 1000);
  }, [buscarArtes, buscarPerfil, MEU_TATUADOR_ID]);

  useEffect(() => {
    if (tutorialAtivo) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      return () => window.removeEventListener('resize', updateCoords);
    }
  }, [tutorialAtivo, updateCoords]);

  const fecharTutorial = () => { localStorage.setItem(`tutorial_v7_${MEU_TATUADOR_ID}`, 'true'); setTutorialAtivo(false); };

  const onCropComplete = useCallback((clampedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const criarImagemCortada = async () => {
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imagemParaCortar;
        img.crossOrigin = "anonymous"; 
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height
      );

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleSalvarFoto = async () => {
    setSubindoFoto(true);
    try {
      const base64Cortada = await criarImagemCortada();
      if (base64Cortada) {
        // Sanitização do nome para evitar erro de caracteres especiais
        const nomeLimpo = `avatar_${MEU_TATUADOR_ID}_${Date.now()}`;
        const url = await uploadImagem(base64Cortada, nomeLimpo);
        
        await supabase.from('tatuadores').upsert({ 
            id: MEU_TATUADOR_ID, 
            avatar_url: url,
            nome_exibicao: nomeExibicao 
        });

        setAvatarUrl(url);
        setImagemParaCortar(null);
      }
    } catch (err) {
      setErroModal({ aberto: true, mensagem: "Erro ao processar ou subir imagem." });
    } finally {
      setSubindoFoto(false);
    }
  };

  const salvarPerfil = async () => {
    try {
      const { error } = await supabase
        .from('tatuadores')
        .upsert({ 
            id: MEU_TATUADOR_ID, 
            nome_exibicao: nomeExibicao 
        });
      
      if (error) throw error;
      setModalPerfilAberto(false);
    } catch (err) {
      setErroModal({ aberto: true, mensagem: "Erro ao salvar alterações no perfil. Verifique se a tabela tatuadores está correta." });
    }
  };

  const excluirArte = async () => {
    const { id, urls } = confirmacaoExcluir;
    const { error } = await supabase.from('artes').delete().eq('id', id);
    if (!error) {
      await deletarImagens(Array.isArray(urls) ? urls : [urls]);
      setArtes(artes.filter(a => a.id !== id));
      setConfirmacaoExcluir({ aberto: false, id: null, urls: [] });
    }
  };

  if (telaAtual === 'agenda') return <Agenda user={user} voltar={() => setTelaAtual('dashboard')} aoAtualizar={buscarArtes} />;
  if (telaAtual === 'financas') return <Financas user={user} voltar={() => setTelaAtual('dashboard')} />;
  if (telaAtual === 'personalizacao') return <Personalizacao user={user} voltar={() => setTelaAtual('dashboard')} />;

  return (
    <div className={`min-h-screen bg-[#050505] text-white font-sans flex flex-col relative ${tutorialAtivo ? 'overflow-hidden h-screen' : 'overflow-x-hidden'}`}>
      
      {/* MÁSCARA DO TUTORIAL */}
      {tutorialAtivo && (
        <>
          <div className="fixed inset-0 z-[100000] pointer-events-none w-full h-full">
              <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                      <mask id="maskDashboard">
                          <rect width="100%" height="100%" fill="white" />
                          <rect x={coords.x} y={coords.y - window.scrollY} width={coords.w} height={coords.h} rx="25" fill="black" className="transition-all duration-300" />
                      </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.95)" mask="url(#maskDashboard)" />
              </svg>
              <div className="absolute border-2 border-[#e11d48] rounded-[25px] transition-all duration-300 shadow-[0_0_20px_rgba(225,29,72,0.5)] z-[100001]" style={{ top: coords.y - window.scrollY, left: coords.x, width: coords.w, height: coords.h }} />
          </div>
          <div className="fixed left-0 right-0 z-[100010] flex justify-center pointer-events-none transition-all duration-500 px-6" style={{ top: coords.position === 'top' ? '10%' : 'auto', bottom: coords.position === 'bottom' ? '15%' : 'auto' }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pointer-events-auto w-full max-w-[320px] bg-[#0d0d0d] border border-white/10 rounded-[40px] p-8 shadow-[0_40px_80px_rgba(0,0,0,1)] flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#e11d48]/10 rounded-full flex items-center justify-center mb-6 text-[#e11d48] border border-[#e11d48]/20"><span className="text-xl font-black italic">{passoTutorial + 1}</span></div>
              <h2 className="text-xl font-black uppercase mb-3 italic text-white tracking-tighter">{passos[passoTutorial].titulo}</h2>
              <p className="text-[11px] text-white/40 uppercase tracking-[0.15em] mb-8 leading-relaxed font-bold italic">{passos[passoTutorial].desc}</p>
              <button onClick={() => passoTutorial < passos.length - 1 ? setPassoTutorial(p => p + 1) : fecharTutorial()} className="w-full bg-white text-black py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest italic"> {passoTutorial === passos.length - 1 ? "ENTREI" : "ENTENDI"} </button>
            </motion.div>
          </div>
        </>
      )}

      {/* HEADER */}
      <header ref={refHeader} className={`pt-12 pb-6 px-6 max-w-screen-xl mx-auto w-full flex items-center justify-between transition-all ${tutorialAtivo && passoTutorial === 0 ? 'relative z-[100002]' : ''}`}>
        <div className="flex flex-col">
            <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] mb-1 italic">Dashboard</span>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{nomeExibicao}<span className="text-[#e11d48]">.</span></h1>
            <button onClick={() => supabase.auth.signOut()} className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 hover:text-[#e11d48] transition-colors text-left mt-2">[ Sair da conta ]</button>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setModalPerfilAberto(true)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-white transition-colors active:scale-90">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button onClick={() => { setPassoTutorial(0); setTutorialAtivo(true); }} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-white transition-colors active:scale-90"><span className="text-lg font-black italic">?</span></button>
            <div onClick={() => setModalPerfilAberto(true)} className="w-14 h-14 rounded-full p-0.5 border border-white/5 overflow-hidden cursor-pointer active:scale-90">
                <img src={avatarUrl || `https://ui-avatars.com/api/?name=${usernameSlug}&background=0D0D0D&color=fff`} className="w-full h-full object-cover rounded-full grayscale" alt="Perfil" />
            </div>
        </div>
      </header>

      {/* MODAL EDITAR PERFIL */}
      <AnimatePresence>
        {modalPerfilAberto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[3000] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[45px] p-8 flex flex-col items-center">
              <div className="relative group mb-6">
                <div onClick={() => fileInputRef.current.click()} className="w-24 h-24 rounded-full p-1 border-2 border-[#e11d48] overflow-hidden cursor-pointer relative shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                  <img src={avatarUrl || `https://ui-avatars.com/api/?name=${usernameSlug}&background=0D0D0D&color=fff`} className={`w-full h-full object-cover rounded-full transition-opacity grayscale ${subindoFoto ? 'opacity-30' : 'opacity-100'}`} alt="Perfil" />
                  {subindoFoto && <div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files[0];
                  if(file) {
                    const reader = new FileReader();
                    reader.onload = () => setImagemParaCortar(reader.result);
                    reader.readAsDataURL(file);
                  }
                }} className="hidden" accept="image/*" />
              </div>

              <h2 className="text-xl font-black uppercase mb-2 italic text-white tracking-tighter text-center">Configurar Perfil</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-8 leading-relaxed italic text-center">Personalize como os clientes verão seu nome e foto.</p>

              <div className="w-full mb-8">
                <label className="text-[7px] font-black uppercase tracking-[0.3em] text-[#e11d48] mb-2 block ml-4 italic">Nome de Exibição</label>
                <input type="text" value={nomeExibicao} onChange={(e) => setNomeExibicao(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-[#e11d48] outline-none transition-colors" />
              </div>

              <button onClick={salvarPerfil} className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] italic mb-2">SALVAR ALTERAÇÕES</button>
              <button onClick={() => setModalPerfilAberto(false)} className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] py-2 italic">CANCELAR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CROP */}
      <AnimatePresence>
        {imagemParaCortar && (
          <div className="fixed inset-0 bg-black z-[4000] flex flex-col">
            <div className="relative flex-1 bg-[#050505]">
              <Cropper
                image={imagemParaCortar}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="bg-[#0a0a0a] border-t border-white/10 p-10 flex flex-col items-center">
              <div className="w-full mb-8">
                <input 
                  type="range" value={zoom} min={1} max={3} step={0.1} 
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e11d48]"
                />
              </div>
              <button onClick={handleSalvarFoto} disabled={subindoFoto} className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] italic mb-2">
                {subindoFoto ? "PROCESSANDO..." : "CONFIRMAR CORTE"}
              </button>
              <button onClick={() => setImagemParaCortar(null)} className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] py-2 italic">CANCELAR</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* VITRINE LINK */}
      <section ref={refLink} className={`px-6 mb-6 max-w-screen-xl mx-auto w-full transition-all ${tutorialAtivo && passoTutorial === 1 ? 'relative z-[100002]' : ''}`}>
        <div className="bg-[#0d0d0d]/50 border border-white/5 rounded-3xl p-3 pl-5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-[#e11d48] block mb-0.5 italic">Link da sua Vitrine</span>
                <p className="text-[9px] text-white/40 truncate tracking-tight">{portfolioUrl.replace('https://', '')}</p>
            </div>
            <div className="flex gap-1.5">
                <button onClick={() => window.open(portfolioUrl, '_blank')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg></button>
                <button onClick={() => { navigator.clipboard.writeText(portfolioUrl); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${copiado ? 'bg-green-500 text-black' : 'bg-white text-black'}`}>{copiado ? 'OK' : 'Copiar'}</button>
            </div>
        </div>
      </section>

      {/* GALERIA DE ARTES */}
      <main ref={refArtes} className={`flex-1 px-4 overflow-y-auto no-scrollbar pb-32 transition-all ${tutorialAtivo && passoTutorial === 2 ? 'relative z-[100002] bg-[#050505] rounded-t-[40px] pt-4' : ''}`}>
        <div className="max-w-screen-xl mx-auto">
            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] mb-5 px-2 text-white/10 italic">Flash Disponível</h3>
            {artes.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-10">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-widest italic">Sua vitrine está vazia</p>
                </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                  {artes.map((arte) => (
                    <div key={arte.id} className="relative aspect-[3/4] rounded-[32px] overflow-hidden bg-[#0d0d0d] border border-white/5 group">
                        <img onClick={() => setAgendaAberto({ aberto: true, arte: arte })} src={Array.isArray(arte.imagem_url) ? arte.imagem_url[0] : arte.imagem_url} className="w-full h-full object-cover" alt="" />
                        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                          <p className="text-[9px] font-black uppercase tracking-wider truncate mb-0.5 italic">{arte.titulo}</p>
                          <p className="text-[8px] text-[#e11d48] font-bold tracking-widest">{arte.preco}</p>
                        </div>
                        <button onClick={() => setConfirmacaoExcluir({ aberto: true, id: arte.id, urls: arte.imagem_url })} className="absolute top-3 right-3 bg-black/60 backdrop-blur-md w-8 h-8 rounded-full border border-white/10 flex items-center justify-center z-10 pointer-events-auto"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                  ))}
              </div>
            )}
        </div>
      </main>

      {/* NAVEGAÇÃO */}
      <div ref={refNav} className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[90] bg-[#0d0d0d]/80 backdrop-blur-xl p-2 rounded-[40px] border border-white/5 shadow-2xl transition-all ${tutorialAtivo && passoTutorial === 4 ? 'z-[100003] border-[#e11d48]' : ''} pointer-events-auto`}>
        <button onClick={() => setTelaAtual('agenda')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-white/40 active:scale-90 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="3" x2="21" y1="10" y2="10"/></svg></button>
        <button onClick={() => setTelaAtual('financas')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-white/40 active:scale-90 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></button>
        <button ref={refAdd} onClick={() => setModalAberto(true)} className={`relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#e11d48] to-[#fb7185] border-[4px] border-[#0d0d0d] shadow-[0_8px_20px_rgba(225,29,72,0.4)] active:scale-90 transition-all group z-[91] pointer-events-auto ${tutorialAtivo && passoTutorial === 3 ? 'z-[100004] scale-125' : ''}`}><span className="text-3xl font-light text-white leading-none mb-1">+</span></button>
        <button onClick={() => setTelaAtual('personalizacao')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-white/40 active:scale-90 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg></button>
        <button onClick={() => window.open(portfolioUrl, '_blank')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-white/40 active:scale-90 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
      </div>

      <ModalUpload aberto={modalAberto} fechar={() => setModalAberto(false)} aoSucesso={() => { setModalAberto(false); setSucessoUploadAberto(true); buscarArtes(); }} tatuadorId={MEU_TATUADOR_ID} setErroModal={setErroModal} />
      <ModalAgendamento aberto={agendaAberto.aberto} fechar={() => setAgendaAberto({ aberto: false, arte: null })} arte={agendaAberto.arte} aoSucesso={() => { setAgendaAberto({ aberto: false, arte: null }); setSucessoAberto(true); buscarArtes(); }} setErroModal={setErroModal} />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (PADRÃO VISUAL) */}
      <AnimatePresence>
        {confirmacaoExcluir.aberto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[5000] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[45px] p-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#e11d48]/10 rounded-full flex items-center justify-center mb-6 text-[#e11d48] border border-[#e11d48]/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <h2 className="text-xl font-black uppercase mb-2 italic text-white tracking-tighter text-center">Você tem certeza?</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-8 leading-relaxed italic text-center">Essa arte será excluída permanentemente da sua vitrine.</p>
              <button onClick={excluirArte} className="w-full bg-[#e11d48] text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] italic mb-2 shadow-[0_10px_20px_rgba(225,29,72,0.3)]">SIM, EXCLUIR</button>
              <button onClick={() => setConfirmacaoExcluir({ aberto: false, id: null, urls: [] })} className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] py-2 italic">CANCELAR</button>
            </motion.div>
          </div>
        )}

        {/* MODAL DE ERRO (PADRÃO VISUAL IDENTICO) */}
        {erroModal.aberto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[5001] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[45px] p-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 text-orange-500 border border-orange-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01"/></svg>
              </div>
              <h2 className="text-xl font-black uppercase mb-2 italic text-white tracking-tighter text-center">Ops! Algo deu errado</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-8 leading-relaxed italic text-center">{erroModal.mensagem}</p>
              <button onClick={() => setErroModal({ aberto: false, mensagem: "" })} className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] italic mb-2">ENTENDI</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}