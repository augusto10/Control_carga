import React, { useState } from 'react';
import { Button, Box, Typography, Avatar } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const PhotoUploadTest: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('foto', file);

      const response = await fetch('/api/usuarios/upload-foto', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        updateUser({ foto: data.fotoUrl });
        alert('Foto atualizada com sucesso!');
      } else {
        setError(data.message || 'Erro ao fazer upload');
      }
    } catch (err) {
      setError('Erro ao fazer upload da foto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Teste de Upload de Foto
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Avatar
          src={user?.foto || undefined}
          sx={{ width: 100, height: 100 }}
        >
          {!user?.foto && user?.nome?.[0]}
        </Avatar>
        
        <Button
          variant="contained"
          component="label"
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Escolher Foto'}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleFileSelect}
          />
        </Button>
        
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        
        {user?.foto && (
          <Typography variant="body2" color="text.secondary">
            URL da foto: {user.foto}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PhotoUploadTest;
