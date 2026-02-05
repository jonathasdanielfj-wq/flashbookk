import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function Login() {
  const [estaCadastrando, setEstaCadastrando] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [username, setUsername] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const manipularWhatsapp = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    setWhatsapp(v.substring(0, 15));
  };

  const lidarComAutenticacao = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    if (estaCadastrando) {
      if (senha !== confirmarSenha) {
        setCarregando(false);
        return setMensagem({ tipo: 'erro', texto: 'As senhas não coincidem!' });
      }
      if (senha.length < 6) {
        setCarregando(false);
        return setMensagem({ tipo: 'erro', texto: 'A senha deve ter no mínimo 6 caracteres.' });
      }
    }

    try {
      if (estaCadastrando) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { username } }
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: perfilError } = await supabase
            .from('tatuadores')
            .insert([
              { 
                id: authData.user.id, 
                username: username.toLowerCase().trim().replace(/\s+/g, '-'), 
                whatsapp: whatsapp.replace(/\D/g, ""), 
              }
            ]);

          if (perfilError) throw perfilError;
          setMensagem({ tipo: 'sucesso', texto: 'Conta criada! Verifique seu e-mail.' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password: senha 
        });
        if (error) throw error;
      }
    } catch (error) {
      let erroTexto = error.message;
      if (erroTexto.includes("valid password")) erroTexto = "Senha inválida ou muito curta.";
      if (erroTexto.includes("Invalid login credentials")) erroTexto = "E-mail ou senha incorretos.";
      setMensagem({ tipo: 'erro', texto: erroTexto });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans overflow-x-hidden">
      
      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
            Ink <span className="text-[#e11d48]">Studio</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mt-3">Professional Portfolio</p>
        </div>

        <form onSubmit={lidarComAutenticacao} className="w-full space-y-5">
          
          {estaCadastrando && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#e11d48] ml-4 italic">Username único</label>
                <input 
                  type="text" 
                  placeholder="EX: SEU-NOME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#e11d48] transition-all text-[16px] md:text-sm font-bold uppercase placeholder:text-white/10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#e11d48] ml-4 italic">WhatsApp</label>
                <input 
                  type="tel" 
                  placeholder="(00) 00000-0000"
                  value={whatsapp}
                  onChange={manipularWhatsapp}
                  className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#e11d48] transition-all text-[16px] md:text-sm font-bold placeholder:text-white/10"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-4 italic">E-mail de acesso</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#e11d48] transition-all text-[16px] md:text-sm font-bold placeholder:text-white/10"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-4 italic">Senha secreta</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#e11d48] transition-all text-[16px] md:text-sm font-bold placeholder:text-white/10"
                required
              />
            </div>

            {estaCadastrando && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#e11d48] ml-4 italic">Confirmar Senha</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-2xl outline-none focus:border-[#e11d48] transition-all text-[16px] md:text-sm font-bold placeholder:text-white/10"
                  required
                />
              </div>
            )}
          </div>

          {mensagem.texto && (
            <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center italic animate-bounce ${mensagem.tipo === 'erro' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
              {mensagem.texto}
            </div>
          )}

          <button 
            type="submit" 
            disabled={carregando}
            className="w-full bg-[#e11d48] text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_15px_40px_rgba(225,29,72,0.2)] active:scale-95 transition-all mt-6 italic"
          >
            {carregando ? 'AUTENTICANDO...' : estaCadastrando ? 'CRIAR CONTA AGORA' : 'ENTRAR NO PAINEL'}
          </button>
        </form>

        <button 
          onClick={() => {
            setEstaCadastrando(!estaCadastrando);
            setMensagem({ tipo: '', texto: '' });
          }}
          className="mt-10 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-[#e11d48] transition-colors"
        >
          {estaCadastrando ? '← Já sou membro do estúdio' : 'Não tem conta? Comece aqui →'}
        </button>
      </div>
    </div>
  );
}