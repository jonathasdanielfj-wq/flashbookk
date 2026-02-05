import React, { useState } from 'react';
import { uploadImagem } from '../../services/uploadService';
import { supabase } from '../../supabaseClient';

export default function ModalUpload({ aberto, fechar, aoSucesso, tatuadorId, setErroModal }) {
  const [imagens, setImagens] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [preco, setPreco] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  const limparNomeArquivo = (texto) => {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
  };

  const formatarMoeda = (valor) => {
    let limpo = valor.replace(/\D/g, "");
    if (!limpo) return "";
    return (Number(limpo) / 100).toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL',
    });
  };

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
      const nomeBase = limparNomeArquivo(titulo);
      const promessasUpload = imagens.map((img, index) => 
        uploadImagem(img.url, `${nomeBase}-${Date.now()}-${index}`)
      );
      
      const urlsFinais = await Promise.all(promessasUpload);
      
      const { error } = await supabase.from('artes').insert([{
        titulo: titulo.toUpperCase(),
        preco: preco.trim() === '' ? 'Sob consulta' : preco,
        imagem_url: [urlsFinais[0]], 
        imagens_carrossel: urlsFinais,
        tatuador_id: tatuadorId,
        disponivel: true
      }]);

      if (error) throw error;
      
      setImagens([]); setTitulo(''); setPreco(''); fechar(); 
      if (aoSucesso) aoSucesso(); 

    } catch (err) { 
      setErroModal({ aberto: true, mensagem: "Erro ao publicar. Tente um título simples." });
    } finally { 
      setCarregando(false); 
    }
  };

  const fecharTudo = () => {
    setImagens([]); setTitulo(''); setPreco(''); fechar();
  };

  return (
    <div className="fixed inset-0 bg-[#050505] z-[200] flex flex-col text-white italic overflow-y-auto no-scrollbar">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 shrink-0 sticky top-0 bg-[#050505] z-20">
        <button onClick={fecharTudo} className="text-white/60 font-black uppercase text-[9px] tracking-widest p-2">Cancelar</button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-[0.4em] uppercase text-[#e11d48]">Nova Arte</span>
            <div className="h-[1px] w-4 bg-[#e11d48] mt-1"></div>
        </div>
        <div className="w-12"></div>
      </div>

      <div className="px-6 flex flex-col items-center">
        
        {/* GALERIA DE MINIATURAS QUADRADAS */}
        <div className="w-full flex flex-wrap justify-center gap-3 py-6">
          {imagens.map((img, i) => (
            <div key={img.id} className="w-24 h-24 rounded-2xl overflow-hidden relative border border-white/20 bg-[#121212] shrink-0">
              <img src={img.url} className="w-full h-full object-cover" alt="" />
              <button 
                onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} 
                className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-md w-5 h-5 rounded-full text-[8px] flex items-center justify-center border border-white/10"
              >✕</button>
            </div>
          ))}

          {/* BOTÃO ADICIONAR (QUADRADO PEQUENO TAMBÉM) */}
          <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0">
            <span className="text-xl text-white/40 font-light">+</span>
            <span className="text-[7px] font-black uppercase tracking-tighter text-white/20">Add Foto</span>
            <input type="file" className="hidden" accept="image/*" onChange={aoSelecionarArquivo} />
          </label>
        </div>

        {/* FORMULÁRIO */}
        <div className="w-full max-w-xs space-y-8 mt-4 pb-20">
          <div className="relative">
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[#e11d48] absolute -top-3 left-1/2 -translate-x-1/2 italic whitespace-nowrap">Título do Projeto</span>
            <input 
              type="text" 
              placeholder="NOME DA ARTE" 
              value={titulo} 
              onChange={(e) => setTitulo(e.target.value)} 
              className="w-full bg-transparent border-b border-white/20 py-4 outline-none text-center font-black uppercase italic placeholder:text-white/10 focus:border-[#e11d48] transition-all text-sm" 
            />
          </div>

          <div className="relative">
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[#e11d48] absolute -top-3 left-1/2 -translate-x-1/2 italic whitespace-nowrap">Valor da Arte</span>
            <input 
              type="tel" 
              placeholder="R$ 0,00" 
              value={preco} 
              onChange={(e) => setPreco(formatarMoeda(e.target.value))} 
              className="w-full bg-transparent border-b border-white/20 py-4 outline-none text-center font-black text-2xl text-white italic placeholder:text-white/10 focus:border-[#e11d48] transition-all" 
            />
          </div>

          <button 
            onClick={salvarTudo} 
            disabled={carregando} 
            className="w-full bg-[#e11d48] py-5 rounded-[24px] font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_15px_40px_rgba(225,29,72,0.3)] active:scale-95 transition-all flex items-center justify-center"
          >
            {carregando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : 'PUBLICAR NO FEED'}
          </button>
        </div>
      </div>
    </div>
  );
}
