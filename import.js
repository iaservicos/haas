#!/usr/bin/env node
/**
 * Script OTIMIZADO para importar 244k+ equipamentos
 * - Carrega contratos em memória (1 query)
 * - Carrega equipamentos existentes em memória (1 query)
 * - Insere em batches de 1000 (muito mais rápido)
 * - Deve terminar em MINUTOS, não DIAS
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
const BATCH_SIZE = 1000; // Inserir 1000 por vez

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_KEY/VITE_SUPABASE_ANON_KEY não configurados no .env');
  process.exit(1);
}

console.log('📋 CONFIGURAÇÃO:');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Arquivo: ${EXCEL_FILE}`);
console.log(`Batch Size: ${BATCH_SIZE}\n`);

// ============================================
// INICIALIZAR SUPABASE
// ============================================

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

async function importContratos(data) {
  console.log('📋 ETAPA 1: IMPORTANDO CONTRATOS');
  console.log('=====================================');
  
  // Get unique contracts
  const contractsMap = new Map();
  data.forEach(row => {
    if (row.Contrato && !contractsMap.has(row.Contrato)) {
      contractsMap.set(row.Contrato, {
        numero_contrato: String(row.Contrato),
        nome_cliente: row['Nome cliente'] || null,
        cliente: row.Cliente ? String(row.Cliente) : null,
      });
    }
  });
  
  const contracts = Array.from(contractsMap.values());
  console.log(`📊 Total de contratos únicos: ${contracts.length}`);
  
  let inserted = 0;
  let skipped = 0;
  
  // Inserir em batches
  for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
    const batch = contracts.slice(i, i + BATCH_SIZE);
    
    try {
      // Buscar contratos existentes em batch
      const { data: existing } = await supabase
        .from('contratos')
        .select('numero_contrato')
        .in('numero_contrato', batch.map(c => c.numero_contrato));
      
      const existingSet = new Set(existing.map(c => c.numero_contrato));
      
      // Filtrar apenas novos
      const newContracts = batch.filter(c => !existingSet.has(c.numero_contrato));
      
      if (newContracts.length > 0) {
        const { error } = await supabase
          .from('contratos')
          .insert(newContracts);
        
        if (error) {
          console.warn(`⚠️ Erro ao inserir batch: ${error.message}`);
          skipped += newContracts.length;
        } else {
          inserted += newContracts.length;
        }
      }
      
      skipped += existingSet.size;
    } catch (err) {
      console.warn(`⚠️ Erro: ${err.message}`);
      skipped += batch.length;
    }
  }
  
  console.log(`✅ Contratos: ${inserted} inseridos, ${skipped} ignorados\n`);
}

async function importEquipamentos(data) {
  console.log('🖥️ ETAPA 2: IMPORTANDO EQUIPAMENTOS');
  console.log('=====================================');
  console.log(`📊 Total de equipamentos a importar: ${data.length}\n`);
  
  // ⚡ OTIMIZAÇÃO 1: Carregar TODOS os contratos em memória
  console.log('⚡ Carregando contratos em memória...');
  const { data: allContratos } = await supabase
    .from('contratos')
    .select('id, numero_contrato');
  
  const contratoMap = new Map();
  allContratos.forEach(c => {
    contratoMap.set(String(c.numero_contrato), c.id);
  });
  console.log(`✅ ${allContratos.length} contratos carregados\n`);
  
  // ⚡ OTIMIZAÇÃO 2: Carregar TODOS os equipamentos existentes em memória
  console.log('⚡ Carregando equipamentos existentes em memória...');
  const { data: allEquipamentos } = await supabase
    .from('contrato_equipamentos')
    .select('numero_serie');
  
  const equipamentoSet = new Set(allEquipamentos.map(e => String(e.numero_serie)));
  console.log(`✅ ${allEquipamentos.length} equipamentos existentes carregados\n`);
  
  // ⚡ OTIMIZAÇÃO 3: Preparar dados para inserção em batch
  console.log('⚡ Preparando dados para inserção em batch...');
  const equipamentosParaInserir = [];
  
  for (const row of data) {
    try {
      const contratoId = contratoMap.get(String(row.Contrato));
      const numeroSerie = String(row['Nº de série']);
      
      // Validar
      if (!contratoId || !numeroSerie) continue;
      
      // Verificar duplicata em memória (muito mais rápido!)
      if (equipamentoSet.has(numeroSerie)) continue;
      
      equipamentosParaInserir.push({
        contrato_id: contratoId,
        numero_serie: numeroSerie,
        modelo: String(row.Modelo),
        sku: row.SKU ? String(row.SKU) : null,
      });
      
      // Marcar como inserido para evitar duplicatas no mesmo batch
      equipamentoSet.add(numeroSerie);
    } catch (err) {
      // Ignorar linhas com erro
    }
  }
  
  console.log(`✅ ${equipamentosParaInserir.length} equipamentos prontos para inserir\n`);
  
  // ⚡ OTIMIZAÇÃO 4: Inserir em batches de 1000
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
      
      // Progress log
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
    console.log('🚀 INICIANDO IMPORTAÇÃO OTIMIZADA');
    console.log('=====================================\n');
    
    const startTime = Date.now();
    
    // Read Excel
    const data = await readExcelFile(EXCEL_FILE);
    
    // Remove rows with empty contract
    const filteredData = data.filter(row => row.Contrato);
    console.log(`✅ Após filtrar: ${filteredData.length} linhas\n`);
    
    // Import contracts
    await importContratos(filteredData);
    
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
