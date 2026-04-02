#!/usr/bin/env node
/**
 * Script para limpar as tabelas de contratos e equipamentos
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_KEY não configurados');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function limparTabelas() {
  try {
    console.log('🗑️ LIMPANDO TABELAS');
    console.log('=====================================\n');
    
    // 1. Limpar contrato_equipamentos
    console.log('⚡ Deletando todos os equipamentos...');
    const { data: equipDeleted, error: equipError } = await supabase
      .from('contrato_equipamentos')
      .delete()
      .neq('id', 0);  // Delete all
    
    if (equipError) {
      console.error('❌ Erro ao deletar equipamentos:', equipError.message);
    } else {
      console.log('✅ Equipamentos deletados!\n');
    }
    
    // 2. Limpar contratos
    console.log('⚡ Deletando todos os contratos...');
    const { data: contratoDeleted, error: contratoError } = await supabase
      .from('contratos')
      .delete()
      .neq('id', 0);  // Delete all
    
    if (contratoError) {
      console.error('❌ Erro ao deletar contratos:', contratoError.message);
    } else {
      console.log('✅ Contratos deletados!\n');
    }
    
    console.log('✅ LIMPEZA CONCLUÍDA!');
    console.log('=====================================');
    console.log('Agora você pode rodar o import novamente com tudo limpo!');
    
  } catch (err) {
    console.error('\n❌ ERRO:');
    console.error(err.message);
    process.exit(1);
  }
}

limparTabelas();
