-- Adicionar coluna foto_hash à tabela fotos_vistoria
ALTER TABLE fotos_vistoria ADD COLUMN foto_hash VARCHAR(32) UNIQUE;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_fotos_vistoria_foto_hash ON fotos_vistoria(foto_hash);
