import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { deletarImagens, uploadImagem } from '../../services/uploadService';
import ModalUpload from './ModalUpload';
import ModalAgendamento from './ModalAgendamento';
import Agenda from './Agenda';
import Financas from './Financas';
import Personalizacao from './Personalizacao'; // Importando a nova aba

export default function Dashboard({ user }) {
  const usernameSlug = user?.user_metadata?.username || "perfil";
  const MEU_TATUADOR_ID = user?.id;
  
  const [artes, setArtes] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [subindoFoto, setSubindoFoto] = useState(false);
  const [telaAtual, setTelaAtual] = useState('dashboard');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [agendaAberto, setAgendaAberto] = useState({ aberto: false, arte: null });
  const [sucessoAberto, setSucessoAberto] = useState(false);
  const [sucessoUploadAberto, setSucessoUploadAberto] = useState(false); 
  const [copiado, setCopiado] = useState(false);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState({ aberto: false, id: null, urls: [] });
  const [erroModal, setErroModal] = useState({ aberto: false, mensagem: "" });

  const fileInputRef = useRef(null);
  const portfolioUrl = `${window.location.origin}/p/${usernameSlug}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(portfolioUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const abrirLink = () => {
    window.open(portfolioUrl, '_blank');
  };

  const buscarArtes = async () => {
    if (!MEU_TATUADOR_ID) return;
    const { data, error } = await supabase
      .from('artes')
      .select('*')
      .eq('tatuador_id', MEU_TATUADOR_ID)
      .eq('vendida', false)
      .order('created_at', { ascending: false });
    
    if (!error) setArtes(data || []);
  };

  const buscarAvatar = async () => {
    if (!MEU_TATUADOR_ID) return;
    const { data } = await supabase
      .from('tatuadores')
      .select('avatar_url')
      .eq('id', MEU_TATUADOR_ID)
      .single();
    
    if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
    } else {
        setAvatarUrl(user?.user_metadata?.avatar_url);
    }
  };

  useEffect(() => { 
    buscarArtes();
    buscarAvatar();
  }, [MEU_TATUADOR_ID]);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const alterarFotoPerfil = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSubindoFoto(true);
      const base64 = await fileToBase64(file);
      const urlPublica = await uploadImagem(base64, `avatar_${MEU_TATUADOR_ID}`);
      await supabase.from('tatuadores').update({ avatar_url: urlPublica }).eq('id', MEU_TATUADOR_ID);
      await supabase.auth.updateUser({ data: { avatar_url: urlPublica } });
      setAvatarUrl(urlPublica);
    } catch (err) {
      setErroModal({ aberto: true, mensagem: "Erro ao processar imagem de perfil." });
    } finally {
      setSubindoFoto(false);
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

  // NAVEGAÇÃO ENTRE TELAS
  if (telaAtual === 'agenda') {
    return <Agenda user={user} voltar={() => setTelaAtual('dashboard')} aoAtualizar={buscarArtes} />;
  }

  if (telaAtual === 'financas') {
    return <Financas user={user} voltar={() => setTelaAtual('dashboard')} />;
  }

  if (telaAtual === 'personalizacao') {
    return <Personalizacao user={user} voltar={() => setTelaAtual('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col overflow-x-hidden">
      
      {/* HEADER COMPACTO */}
      <header className="pt-12 pb-6 px-6 max-w-screen-xl mx-auto w-full flex items-center justify-between">
        <div className="flex flex-col">
            <span className="text-[#e11d48] text-[7px] font-black uppercase tracking-[0.4em] mb-1 italic">Dashboard</span>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                {usernameSlug}<span className="text-[#e11d48]">.</span>
            </h1>
            <button onClick={() => supabase.auth.signOut()} className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 hover:text-[#e11d48] transition-colors text-left mt-2">
              [ Logout ]
            </button>
        </div>

        <div 
            onClick={() => !subindoFoto && fileInputRef.current.click()}
            className={`w-14 h-14 rounded-full p-0.5 border border-white/5 shadow-2xl overflow-hidden cursor-pointer transition-all active:scale-90 ${subindoFoto ? 'animate-pulse opacity-50' : 'hover:border-[#e11d48]'}`}
        >
            <img 
              src={avatarUrl || `https://ui-avatars.com/api/?name=${usernameSlug}&background=0D0D0D&color=fff`} 
              className="w-full h-full object-cover rounded-full grayscale hover:grayscale-0 transition-all" 
              alt="Perfil"
            />
            <input type="file" ref={fileInputRef} onChange={alterarFotoPerfil} className="hidden" accept="image/*" />
        </div>
      </header>

      {/* LINK SECTION */}
      <section className="px-6 mb-6 max-w-screen-xl mx-auto w-full">
        <div className="bg-[#0d0d0d]/50 border border-white/5 rounded-3xl p-3 pl-5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20 block mb-0.5 italic">Portfólio Online</span>
                <p className="text-[9px] text-white/40 truncate tracking-tight">{portfolioUrl.replace('https://', '')}</p>
            </div>
            
            <div className="flex gap-1.5">
                <button 
                    onClick={abrirLink}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center active:scale-90 transition-all hover:bg-white/10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                </button>
                <button 
                    onClick={copiarLink} 
                    className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${copiado ? 'bg-green-500 text-black' : 'bg-white text-black'}`}
                >
                    {copiado ? 'OK!' : 'Copiar'}
                </button>
            </div>
        </div>
      </section>

      {/* GRID ARTES */}
      <main className="flex-1 px-4 overflow-y-auto no-scrollbar pb-32">
        <div className="max-w-screen-xl mx-auto">
            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] mb-5 px-2 text-white/10 italic">Flash Disponível</h3>
            {artes.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center opacity-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest">Vazio</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                  {artes.map((arte) => (
                    <div key={arte.id} className="relative aspect-[3/4] rounded-[32px] overflow-hidden bg-[#0d0d0d] border border-white/5 group">
                        <img 
                          onClick={() => setAgendaAberto({ aberto: true, arte: arte })}
                          src={Array.isArray(arte.imagem_url) ? arte.imagem_url[0] : arte.imagem_url} 
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-110 grayscale-[0.2]" 
                          alt="" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none"></div>
                        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                          <p className="text-[9px] font-black uppercase tracking-wider truncate mb-0.5 italic">{arte.titulo}</p>
                          <p className="text-[8px] text-[#e11d48] font-bold tracking-widest">{arte.preco}</p>
                        </div>
                        <button onClick={() => setConfirmacaoExcluir({ aberto: true, id: arte.id, urls: arte.imagem_url })} className="absolute top-3 right-3 bg-black/60 backdrop-blur-md w-8 h-8 rounded-full border border-white/10 flex items-center justify-center active:bg-red-600 transition-colors z-10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                  ))}
              </div>
            )}
        </div>
      </main>

      {/* NAV FLUTUANTE ATUALIZADA */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[90] bg-[#0d0d0d]/80 backdrop-blur-xl p-2 rounded-[40px] border border-white/5 shadow-2xl">
        <button onClick={() => setTelaAtual('agenda')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:text-[#e11d48] transition-colors"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        </button>

        <button onClick={() => setTelaAtual('financas')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:text-[#e11d48] transition-colors"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </button>

        <button onClick={() => setModalAberto(true)} className="bg-[#e11d48] text-white w-14 h-14 rounded-full shadow-[0_15px_35px_rgba(225,29,72,0.4)] flex items-center justify-center active:scale-90 transition-all border-[4px] border-[#050505]">
          <span className="text-2xl font-light">+</span>
        </button>

        {/* BOTÃO DE PERSONALIZAÇÃO */}
        <button onClick={() => setTelaAtual('personalizacao')} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:text-[#e11d48] transition-colors"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 5 5"/><path d="m5.2 9.6 3.3 3.3"/></svg>
        </button>

        <button onClick={abrirLink} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:text-[#e11d48] transition-colors"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      {/* MODAL UPLOAD */}
      <ModalUpload 
        aberto={modalAberto} 
        fechar={() => setModalAberto(false)} 
        aoSucesso={() => { 
            setModalAberto(false); 
            setSucessoUploadAberto(true); 
            buscarArtes(); 
        }} 
        tatuadorId={MEU_TATUADOR_ID} 
        setErroModal={setErroModal} 
      />

      {/* MODAL AGENDAMENTO */}
      <ModalAgendamento 
        aberto={agendaAberto.aberto} 
        fechar={() => setAgendaAberto({ aberto: false, arte: null })} 
        arte={agendaAberto.arte}
        aoSucesso={() => { setAgendaAberto({ aberto: false, arte: null }); setSucessoAberto(true); buscarArtes(); }}
        setErroModal={setErroModal}
      />

      {/* POP-UP DE EXCLUSÃO */}
      {confirmacaoExcluir.aberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-8">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mb-6 text-red-600 border border-red-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <h2 className="text-lg font-black uppercase mb-2 italic tracking-tighter">Apagar Arte?</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-8">Essa ação não pode ser desfeita.</p>
            <button onClick={excluirArte} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest mb-3">Excluir</button>
            <button onClick={() => setConfirmacaoExcluir({ aberto: false, id: null, urls: [] })} className="text-[9px] font-bold text-white/30 uppercase tracking-widest p-2">Voltar</button>
          </div>
        </div>
      )}

      {/* POP-UP SUCESSO UPLOAD */}
      {sucessoUploadAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-8">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500 border border-green-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 className="text-lg font-black uppercase mb-2 italic tracking-tighter">Arte Publicada!</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-8">Seu novo flash já está no feed.</p>
            <button 
                onClick={() => setSucessoUploadAberto(false)} 
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all italic"
            >
                FECHAR
            </button>
          </div>
        </div>
      )}

      {/* POP-UP SUCESSO AGENDAMENTO */}
      {sucessoAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-8">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500 border border-green-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 className="text-lg font-black uppercase mb-2 italic tracking-tighter">Agendado!</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-8">Horário reservado com sucesso.</p>
            <button 
                onClick={() => { setSucessoAberto(false); setTelaAtual('agenda'); }} 
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all italic"
            >
                VER AGENDA
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ERRO */}
      {erroModal.aberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-8">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[40px] p-8 flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500 border border-amber-500/20">
              <span className="text-2xl font-black italic">!</span>
            </div>
            <h2 className="text-lg font-black uppercase mb-2 italic tracking-tighter">Atenção</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-8">{erroModal.mensagem}</p>
            <button 
                onClick={() => setErroModal({ aberto: false, mensagem: "" })} 
                className="w-full bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] italic"
            >
                OK, VOLTAR
            </button>
          </div>
        </div>
      )}

    </div>
  );
}