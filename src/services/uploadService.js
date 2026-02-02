import { supabase } from '../supabaseClient';

export const uploadImagem = async (base64Data, fileName) => {
  try {
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const filePath = `${Date.now()}_${fileName.replace(/\s/g, '_')}.png`;

    const { error: uploadError } = await supabase.storage
      .from('artes')
      .upload(filePath, blob);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('artes')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Erro no uploadService:', error);
    throw error;
  }
};

// NOVA FUNÇÃO: Deleta as imagens do Storage
export const deletarImagens = async (urls) => {
  try {
    if (!urls || urls.length === 0) return;

    // Extrai apenas o nome do arquivo da URL pública
    const paths = urls.map(url => url.split('/').pop());

    const { error } = await supabase.storage
      .from('artes')
      .remove(paths);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar arquivos do storage:', error);
  }
};