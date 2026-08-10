-- Remover a constraint UNIQUE se existir
ALTER TABLE fotos_vistoria DROP CONSTRAINT IF EXISTS fotos_vistoria_foto_hash_key;

-- Remover índice antigo se existir
DROP INDEX IF EXISTS idx_fotos_vistoria_foto_hash;

-- Criar índice parcial: UNIQUE apenas para valores NOT NULL
CREATE UNIQUE INDEX idx_fotos_vistoria_foto_hash_unique ON fotos_vistoria(foto_hash) WHERE foto_hash IS NOT NULL;

-- Criar índice normal para buscas
CREATE INDEX idx_fotos_vistoria_foto_hash ON fotos_vistoria(foto_hash);
