#!/usr/bin/env node
/**
 * Script para importar 244k+ equipamentos da planilha Excel para Supabase
 * Usa as credenciais do .env local
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_KEY/VITE_SUPABASE_ANON_KEY não configurados no .env');
  process.exit(1);
}

console.log('📋 CONFIGURAÇÃO:');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Arquivo: ${EXCEL_FILE}\n`);

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
  
  for (const contract of contracts) {
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('contratos')
        .select('id')
        .eq('numero_contrato', contract.numero_contrato)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Insert new contract
      const { error } = await supabase
        .from('contratos')
        .insert([{
          numero_contrato: contract.numero_contrato,
          nome_cliente: contract.nome_cliente,
          cliente: contract.cliente,
        }]);
      
      if (error) {
        console.warn(`⚠️ Erro ao inserir contrato ${contract.numero_contrato}: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    } catch (err) {
      console.warn(`⚠️ Erro: ${err.message}`);
      skipped++;
    }
  }
  
  console.log(`✅ Contratos: ${inserted} inseridos, ${skipped} ignorados\n`);
}

async function getContratoId(numero_contrato) {
  const { data, error } = await supabase
    .from('contratos')
    .select('id')
    .eq('numero_contrato', String(numero_contrato))
    .single();
  
  if (error) return null;
  return data?.id;
}

async function importEquipamentos(data) {
  console.log('🖥️ ETAPA 2: IMPORTANDO EQUIPAMENTOS');
  console.log('=====================================');
  console.log(`📊 Total de equipamentos a importar: ${data.length}\n`);
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const batchSize = 500;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      // Get contract ID
      const contratoId = await getContratoId(row.Contrato);
      
      if (!contratoId) {
        skipped++;
        continue;
      }
      
      // Check if equipment already exists
      const { data: existing } = await supabase
        .from('contrato_equipamentos')
        .select('id')
        .eq('numero_serie', String(row['Nº de série']))
        .single();
      
      if (existing) {
        skipped++;
      } else {
        // Insert equipment
        const { error } = await supabase
          .from('contrato_equipamentos')
          .insert([{
            contrato_id: contratoId,
            numero_serie: String(row['Nº de série']),
            modelo: String(row.Modelo),
            sku: row.SKU ? String(row.SKU) : null,
          }]);
        
        if (error) {
          errors++;
        } else {
          inserted++;
        }
      }
      
      // Progress log
      if ((i + 1) % batchSize === 0) {
        const percent = Math.round(((i + 1) / data.length) * 100);
        console.log(`📈 ${i + 1}/${data.length} (${percent}%) - ${inserted} inseridos, ${skipped} ignorados`);
      }
      
      if (errors > 100) {
        console.error('❌ Muitos erros! Parando.');
        break;
      }
    } catch (err) {
      errors++;
    }
  }
  
  console.log(`\n✅ Equipamentos: ${inserted} inseridos, ${skipped} ignorados, ${errors} erros\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  try {
    console.log('🚀 INICIANDO IMPORTAÇÃO COMPLETA');
    console.log('=====================================\n');
    
    // Read Excel
    const data = await readExcelFile(EXCEL_FILE);
    
    // Remove rows with empty contract
    const filteredData = data.filter(row => row.Contrato);
    console.log(`✅ Após filtrar: ${filteredData.length} linhas\n`);
    
    // Import contracts
    await importContratos(filteredData);
    
    // Import equipment
    await importEquipamentos(filteredData);
    
    console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
    console.log('=====================================');
    
  } catch (err) {
    console.error('\n❌ ERRO:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
