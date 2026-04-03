/**
 * Função para gerar template Excel com equipamentos já cadastrados
 * Busca todos os equipamentos dos contratos e permite preencher apenas NF e Destino
 */

import { supabase } from '../services/supabase';

declare global {
  interface Window {
    XLSX: any;
  }
}

export const gerarTemplateEquipamentosComDados = async () => {
  // Verificar se XLSX já está carregado
  if (window.XLSX) {
    await gerarArquivoExcel();
    return;
  }

  // Carregar XLSX do CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.async = true;

  script.onload = async () => {
    // Aguardar um pouco para garantir que XLSX está disponível
    setTimeout(async () => {
      if (window.XLSX) {
        await gerarArquivoExcel();
      } else {
        alert('Erro ao carregar biblioteca. Tente novamente.');
      }
    }, 200);
  };

  script.onerror = () => {
    alert('Erro ao carregar biblioteca do servidor. Verifique sua conexão.');
    console.error('Erro ao carregar XLSX do CDN');
  };

  document.head.appendChild(script);
};

async function gerarArquivoExcel() {
  try {
    const XLSX = window.XLSX;

    if (!XLSX || !XLSX.utils) {
      alert('Biblioteca XLSX não está disponível');
      return;
    }

    // Buscar todos os equipamentos cadastrados
    const { data: equipamentos, error } = await supabase
      .from('contrato_equipamentos')
      .select(`
        id,
        numero_serie,
        modelo,
        sku,
        nota_fiscal,
        destino,
        contratos:contrato_id(numero_contrato, nome_cliente)
      `)
      .order('numero_serie', { ascending: true });

    if (error) {
      console.error('Erro ao buscar equipamentos:', error);
      alert('Erro ao buscar equipamentos. Tente novamente.');
      return;
    }

    if (!equipamentos || equipamentos.length === 0) {
      alert('Nenhum equipamento cadastrado nos contratos.');
      return;
    }

    // Preparar dados para o Excel
    const equipamentosData = equipamentos.map((eq: any) => ({
      'Nº Série': eq.numero_serie || '',
      'Modelo': eq.modelo || '',
      'SKU': eq.sku || '',
      'Contrato': (eq.contratos && Array.isArray(eq.contratos) ? eq.contratos[0]?.numero_contrato : eq.contratos?.numero_contrato) || '',
      'Cliente': (eq.contratos && Array.isArray(eq.contratos) ? eq.contratos[0]?.nome_cliente : eq.contratos?.nome_cliente) || '',
      'Nota Fiscal': eq.nota_fiscal || '',
      'Destino': eq.destino || ''
    }));

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // ========== ABA 1: EQUIPAMENTOS ==========
    const equipamentosSheet = XLSX.utils.json_to_sheet(equipamentosData);

    // Configurar largura das colunas
    equipamentosSheet['!cols'] = [
      { wch: 20 },  // Nº Série
      { wch: 30 },  // Modelo
      { wch: 15 },  // SKU
      { wch: 18 },  // Contrato
      { wch: 25 },  // Cliente
      { wch: 20 },  // Nota Fiscal
      { wch: 25 }   // Destino
    ];

    // Formatar cabeçalho
    const headerRange = XLSX.utils.decode_range(equipamentosSheet['!ref'] || 'A1');
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!equipamentosSheet[address]) continue;

      equipamentosSheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '3B82F6' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Proteger colunas de leitura (Série, Modelo, SKU, Contrato, Cliente)
    // Deixar apenas Nota Fiscal e Destino editáveis
    for (let R = 2; R <= equipamentosData.length + 1; ++R) {
      for (let C = 0; C <= 4; ++C) {
        const address = XLSX.utils.encode_col(C) + R;
        if (!equipamentosSheet[address]) continue;
        equipamentosSheet[address].s = {
          fill: { fgColor: { rgb: 'E5E7EB' } },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, equipamentosSheet, 'Equipamentos');

    // ========== ABA 2: INSTRUÇÕES ==========
    const instrucoesData = [
      ['INSTRUÇÕES DE PREENCHIMENTO'],
      [''],
      ['COLUNAS SOMENTE LEITURA (não modificar):'],
      ['- Nº Série: Número de série do equipamento'],
      ['- Modelo: Modelo do equipamento'],
      ['- SKU: Código SKU do equipamento'],
      ['- Contrato: Número do contrato'],
      ['- Cliente: Nome do cliente'],
      [''],
      ['COLUNAS PARA PREENCHER:'],
      ['- Nota Fiscal: Número da nota fiscal (obrigatório)'],
      ['- Destino: Localização/destino do equipamento (obrigatório)'],
      [''],
      ['REGRAS IMPORTANTES:'],
      ['1. NÃO modifique as colunas de leitura (Série, Modelo, SKU, Contrato, Cliente)'],
      ['2. Preencha APENAS as colunas: Nota Fiscal e Destino'],
      ['3. Não deixe campos em branco nas colunas de preenchimento'],
      ['4. Não adicione novas colunas'],
      ['5. Use apenas a aba "Equipamentos"'],
      ['6. Máximo de 2.000 equipamentos por importação'],
      [''],
      ['EXEMPLOS DE PREENCHIMENTO:'],
      ['Nota Fiscal: NF-2024-001234'],
      ['Destino: São Paulo - SP'],
      [''],
      ['SUPORTE:'],
      ['Em caso de dúvidas, entre em contato com a Equipe da IA Serviços']
    ];

    const instrucoesSheet = XLSX.utils.aoa_to_sheet(instrucoesData);
    instrucoesSheet['!cols'] = [{ wch: 80 }];

    // Formatar título
    instrucoesSheet['A1'].s = {
      font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F2937' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    XLSX.utils.book_append_sheet(workbook, instrucoesSheet, 'Instruções');

    // ========== GERAR ARQUIVO ==========
    const nomeArquivo = `Template_Equipamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    alert(`Template gerado com ${equipamentosData.length} equipamentos!`);
  } catch (error) {
    console.error('Erro ao gerar arquivo Excel:', error);
    alert('Erro ao gerar arquivo Excel. Verifique o console para mais detalhes.');
  }
}
