/**
 * Função para gerar template Excel dinamicamente no navegador
 * Carrega XLSX do CDN de forma robusta
 */

declare global {
  interface Window {
    XLSX: any;
  }
}

export const gerarTemplateExcel = () => {
  // Verificar se XLSX já está carregado
  if (window.XLSX) {
    gerarArquivoExcel();
    return;
  }

  // Carregar XLSX do CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.async = true;

  script.onload = () => {
    // Aguardar um pouco para garantir que XLSX está disponível
    setTimeout(() => {
      if (window.XLSX) {
        gerarArquivoExcel();
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

function gerarArquivoExcel() {
  try {
    const XLSX = window.XLSX;

    if (!XLSX || !XLSX.utils) {
      alert('Biblioteca XLSX não está disponível');
      return;
    }

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // ========== ABA 1: EQUIPAMENTOS ==========
    const equipamentosData = [
      {
        'Nº Série': 'SN001',
        'Modelo': 'Modelo A',
        'SKU': 'SKU001'
      },
      {
        'Nº Série': 'SN002',
        'Modelo': 'Modelo B',
        'SKU': 'SKU002'
      },
      {
        'Nº Série': 'SN003',
        'Modelo': 'Modelo C',
        'SKU': ''
      }
    ];

    // Adicionar 100 linhas vazias
    for (let i = 0; i < 100; i++) {
      equipamentosData.push({
        'Nº Série': '',
        'Modelo': '',
        'SKU': ''
      });
    }

    const equipamentosSheet = XLSX.utils.json_to_sheet(equipamentosData);

    // Configurar largura das colunas
    equipamentosSheet['!cols'] = [
      { wch: 20 },  // Nº Série
      { wch: 20 },  // Modelo
      { wch: 15 }   // SKU
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

    XLSX.utils.book_append_sheet(workbook, equipamentosSheet, 'Equipamentos');

    // ========== ABA 2: INSTRUÇÕES ==========
    const instrucoesData = [
      ['INSTRUÇÕES DE PREENCHIMENTO'],
      [''],
      ['COLUNAS OBRIGATÓRIAS:'],
      ['• Nº Série: Número de série do equipamento (obrigatório)'],
      ['• Modelo: Modelo do equipamento (obrigatório)'],
      [''],
      ['COLUNAS OPCIONAIS:'],
      ['• SKU: Código SKU do equipamento (opcional)'],
      [''],
      ['REGRAS:'],
      ['1. Não deixe campos obrigatórios em branco'],
      ['2. Não modifique o nome das colunas'],
      ['3. Não adicione novas colunas'],
      ['4. Use apenas a aba "Equipamentos"'],
      ['5. Equipamentos duplicados (mesma série) serão ignorados'],
      [''],
      ['EXEMPLO:'],
      ['Nº Série | Modelo | SKU'],
      ['SN001 | Modelo A | SKU001'],
      ['SN002 | Modelo B | SKU002'],
      ['SN003 | Modelo C | (deixar em branco)'],
      [''],
      ['SUPORTE:'],
      ['Em caso de dúvidas, entre em contato com o gerente do projeto']
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
    const nomeArquivo = `Template_Importar_Equipamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar arquivo Excel:', error);
    alert('Erro ao gerar arquivo Excel. Verifique o console para mais detalhes.');
  }
}
