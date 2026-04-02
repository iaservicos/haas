#!/usr/bin/env node
/**
 * Script OTIMIZADO para importar 244k+ equipamentos
 * COM LOGS DE DEBUG para identificar contratos faltando
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const XLSX = require('xlsx');

// ============================================
// CONFIGURAÇÃO
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const EXCEL_FILE = './seriaisencerrando.XLSX';
const BATCH_SIZE = 1000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_KEY/VITE_SUPABASE_ANON_KEY não configurados no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// FUNÇÕES
// ============================================

async function readExcelFile(filePath) {
  console.log(`📖 Lendo arquivo: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ Arquivo lido! Total de linhas: ${data.length}\n`);
  return data;
}

async function importEquipamentos(data) {
  console.log('🖥️ ETAPA: IMPORTANDO EQUIPAMENTOS COM DEBUG');
  console.log('=====================================');
  console.log(`📊 Total de equipamentos a importar: ${data.length}\n`);
  
  // ⚡ Carregar TODOS os contratos em memória
  console.log('⚡ Carregando contratos em memória...');
  const { data: allContratos } = await supabase
    .from('contratos')
    .select('id, numero_contrato');
  
  const contratoMap = new Map();
  allContratos.forEach(c => {
    contratoMap.set(String(c.numero_contrato), c.id);
  });
  console.log(`✅ ${allContratos.length} contratos carregados`);
  console.log(`📋 Contratos no banco: ${Array.from(contratoMap.keys()).join(', ')}\n`);
  
  // ⚡ Carregar TODOS os equipamentos existentes em memória
  console.log('⚡ Carregando equipamentos existentes em memória...');
  const { data: allEquipamentos } = await supabase
    .from('contrato_equipamentos')
    .select('numero_serie');
  
  const equipamentoSet = new Set(allEquipamentos.map(e => String(e.numero_serie)));
  console.log(`✅ ${allEquipamentos.length} equipamentos existentes carregados\n`);
  
  // ⚡ Preparar dados para inserção em batch COM DEBUG
  console.log('⚡ Preparando dados para inserção em batch...');
  const equipamentosParaInserir = [];
  const contratoNaoEncontrado = new Map();
  const serialVazio = [];
  
  for (const row of data) {
    try {
      const numeroContrato = String(row.Contrato);
      const numeroSerie = String(row['Nº de série']);
      
      // Debug: verificar se serial está vazio
      if (!numeroSerie || numeroSerie === 'undefined' || numeroSerie === '') {
        serialVazio.push(row);
        continue;
      }
      
      // Debug: verificar se contrato existe
      const contratoId = contratoMap.get(numeroContrato);
      if (!contratoId) {
        if (!contratoNaoEncontrado.has(numeroContrato)) {
          contratoNaoEncontrado.set(numeroContrato, 0);
        }
        contratoNaoEncontrado.set(numeroContrato, contratoNaoEncontrado.get(numeroContrato) + 1);
        continue;
      }
      
      // Verificar duplicata em memória
      if (equipamentoSet.has(numeroSerie)) continue;
      
      equipamentosParaInserir.push({
        contrato_id: contratoId,
        numero_serie: numeroSerie,
        modelo: String(row.Modelo),
        sku: row.SKU ? String(row.SKU) : null,
      });
      
      equipamentoSet.add(numeroSerie);
    } catch (err) {
      // Ignorar linhas com erro
    }
  }
  
  // 🔴 RELATÓRIO DE DEBUG
  console.log('🔴 RELATÓRIO DE DEBUG:');
  console.log('=====================================');
  console.log(`✅ Equipamentos prontos para inserir: ${equipamentosParaInserir.length}`);
  console.log(`⚠️ Serial vazio: ${serialVazio.length}`);
  console.log(`❌ Contratos não encontrados: ${contratoNaoEncontrado.size}`);
  
  if (contratoNaoEncontrado.size > 0) {
    console.log('\n📋 Contratos não encontrados no banco:');
    for (const [contrato, count] of contratoNaoEncontrado) {
      console.log(`   - Contrato ${contrato}: ${count} equipamentos`);
    }
  }
  
  console.log('\n=====================================\n');
  
  // ⚡ Inserir em batches de 1000
  console.log('⚡ Iniciando inserção em batches...\n');
  
  let inserted = 0;
  let errors = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < equipamentosParaInserir.length; i += BATCH_SIZE) {
    const batch = equipamentosParaInserir.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from('contrato_equipamentos')
        .insert(batch);
      
      if (error) {
        console.warn(`⚠️ Erro ao inserir batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
      
      const percent = Math.round(((i + batch.length) / equipamentosParaInserir.length) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (inserted / (elapsed / 60)).toFixed(0);
      
      console.log(`📈 ${i + batch.length}/${equipamentosParaInserir.length} (${percent}%) - ${inserted} inseridos - ${rate} eq/min - ${elapsed}s`);
    } catch (err) {
      console.warn(`⚠️ Erro: ${err.message}`);
      errors += batch.length;
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Equipamentos: ${inserted} inseridos, ${errors} erros`);
  console.log(`⏱️ Tempo total: ${totalTime}s (${(inserted / (totalTime / 60)).toFixed(0)} eq/min)\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  try {
    console.log('🚀 INICIANDO IMPORTAÇÃO COM DEBUG');
    console.log('=====================================\n');
    
    const startTime = Date.now();
    
    // Read Excel
    const data = await readExcelFile(EXCEL_FILE);
    
    // Remove rows with empty contract
    const filteredData = data.filter(row => row.Contrato);
    console.log(`✅ Após filtrar: ${filteredData.length} linhas\n`);
    
    // Import equipment
    await importEquipamentos(filteredData);
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
    console.log('=====================================');
    console.log(`⏱️ Tempo total: ${totalTime} minutos`);
    
  } catch (err) {
    console.error('\n❌ ERRO:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
