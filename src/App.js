import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Dashboard from './pages/admin/Dashboard';
import Login from './pages/admin/Login';
import PerfilPublico from './pages/public/PerfilPublico';

function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Verifica sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setCarregando(false);
    });

    // Escuta mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      setCarregando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#e11d48] font-black animate-pulse tracking-[0.3em] text-[10px] uppercase italic">
          Carregando Studio<span className="animate-bounce">...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. ROTA DE LOGIN - Se logado, vai para admin */}
        <Route 
          path="/login" 
          element={!sessao ? <Login /> : <Navigate to="/admin" replace />} 
        />

        {/* 2. ROTA PROTEGIDA - Dashboard Admin */}
        <Route 
          path="/admin" 
          element={sessao ? <Dashboard user={sessao.user} /> : <Navigate to="/login" replace />} 
        />

        {/* 3. ROTA DO PERFIL PÚBLICO - Usando prefixo /p/ para evitar conflitos */}
        <Route path="/p/:username" element={<PerfilPublico />} />

        {/* 4. RAIZ DO SITE - Redireciona conforme estado de login */}
        <Route path="/" element={<Navigate to={sessao ? "/admin" : "/login"} replace />} />
        
        {/* 5. FALLBACK - Qualquer rota errada volta para a raiz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;