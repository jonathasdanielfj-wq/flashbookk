import React, { useState } from 'react';
import { uploadImagem } from '../../services/uploadService';
import { supabase } from '../../supabaseClient';

export default function ModalUpload({ aberto, fechar, aoSucesso, tatuadorId, setErroModal }) {
  const [imagens, setImagens] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [preco, setPreco] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  const formatarMoeda = (valor) => {
    let limpo = valor.replace(/\D/g, "");
    if (!limpo) return "";
    return (Number(limpo) / 100).toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL',
    });
  };

  const manipularPreco = (e) => setPreco(formatarMoeda(e.target.value));

  const aoSelecionarArquivo = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagens([...imagens, { url: reader.result?.toString(), id: Date.now() }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  const salvarTudo = async () => {
    if (!titulo) return setErroModal({ aberto: true, mensagem: "Dê um nome ao projeto!" });
    if (imagens.length === 0) return setErroModal({ aberto: true, mensagem: "Selecione pelo menos uma foto!" });
    
    setCarregando(true);
    try {
      const promessasUpload = imagens.map((img, index) => 
        uploadImagem(img.url, `${titulo.replace(/\s+/g, '-')}-${Date.now()}-${index}`)
      );
      const urlsFinais = await Promise.all(promessasUpload);
      
      const { error } = await supabase.from('artes').insert([{
        titulo: titulo.toUpperCase(),
        preco: preco.trim() === '' ? 'Sob consulta' : preco,
        imagem_url: urlsFinais, 
        tatuador_id: tatuadorId
      }]);

      if (error) throw error;
      
      // LIMPEZA E FECHAMENTO AUTOMÁTICO
      // Removemos o estado interno de sucesso para evitar o popup duplicado
      setImagens([]);
      setTitulo('');
      setPreco('');
      
      // 1. Fecha o modal de upload imediatamente
      fechar(); 
      
      // 2. Notifica a Dashboard para mostrar o popup de "Arte Publicada"
      if (aoSucesso) aoSucesso(); 

    } catch (err) { 
      setErroModal({ aberto: true, mensagem: "Erro no upload" });
    } finally { 
      setCarregando(false); 
    }
  };

  const fecharTudo = () => {
    setImagens([]);
    setTitulo('');
    setPreco('');
    fechar();
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-hidden text-white">
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 pt-2 shrink-0">
        <button onClick={fecharTudo} className="text-white/40 font-black uppercase text-[9px] tracking-widest active:scale-90 transition-all">
          Cancelar
        </button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-[0.4em] uppercase italic text-[#e11d48]">Nova Arte</span>
            <div className="h-[1px] w-4 bg-[#e11d48] mt-1"></div>
        </div>
        <div className="w-12"></div>
      </div>

      {/* ÁREA DO CARROSSEL */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {imagens.length === 0 ? (
          <label className="w-40 h-52 rounded-[32px] border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all group">
            <div className="w-10 h-10 bg-white/5 group-hover:bg-white/10 text-white rounded-full flex items-center justify-center mb-3 transition-colors">
              <span className="text-lg font-light">+</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 italic">Fazer Upload</span>
            <input type="file" className="hidden" accept="image/*" onChange={aoSelecionarArquivo} />
          </label>
        ) : (
          <div className="w-full flex gap-3 overflow-x-auto py-4 no-scrollbar snap-x items-center px-4">
            {imagens.map((img, i) => (
              <div key={img.id} className="min-w-[140px] h-[190px] rounded-[24px] overflow-hidden relative border border-white/10 shrink-0 snap-center shadow-xl">
                <img src={img.url} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm w-6 h-6 rounded-full text-[8px] flex items-center justify-center text-white border border-white/10 active:scale-75">✕</button>
              </div>
            ))}
            <label className="min-w-[80px] h-[190px] rounded-[24px] border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center shrink-0 cursor-pointer snap-center active:bg-white/5 transition-colors">
              <span className="text-xl text-white/20 font-light">+</span>
              <input type="file" className="hidden" accept="image/*" onChange={aoSelecionarArquivo} />
            </label>
          </div>
        )}
      </div>

      {/* FORMULÁRIO */}
      <div className="mt-8 mb-6 shrink-0 w-full max-w-xs mx-auto space-y-8">
        <div className="space-y-6">
          <input 
            type="text" 
            placeholder="TÍTULO DO PROJETO" 
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)} 
            className="w-full bg-transparent border-b border-white/10 py-3 outline-none text-[12px] font-black text-white text-center tracking-[0.2em] uppercase placeholder:text-white/10 focus:border-[#e11d48] transition-colors italic" 
          />
          
          <div className="relative">
            <input 
              type="tel" 
              placeholder="R$ 0,00 (OPCIONAL)" 
              value={preco} 
              onChange={manipularPreco} 
              className="w-full bg-transparent border-b border-white/10 py-3 outline-none text-[12px] font-black text-[#e11d48] text-center tracking-[0.2em] uppercase placeholder:text-white/10 focus:border-[#e11d48] transition-colors italic" 
            />
            <span className="absolute -bottom-5 left-0 right-0 text-center text-[7px] text-white/20 tracking-widest uppercase italic font-bold">Vazio = Sob Consulta</span>
          </div>
        </div>
        
        <button 
          onClick={salvarTudo} 
          disabled={carregando} 
          className="w-full bg-[#e11d48] text-white py-5 rounded-full font-black uppercase text-[10px] tracking-[0.3em] shadow-[0_15px_40px_rgba(225,29,72,0.2)] active:scale-95 transition-all mt-4 italic"
        >
          {carregando ? 'ENVIANDO...' : 'PUBLICAR NO FEED'}
        </button>
      </div>
    </div>
  );
}