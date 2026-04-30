/**
 * Função para gerar template Excel para importação de confirmações
 * Carrega XLSX do CDN de forma robusta
 */

declare global {
  interface Window {
    XLSX: any;
  }
}

export const gerarTemplateConfirmacoes = () => {
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

    // ========== ABA 1: CONFIRMAÇÕES ==========
    const confirmacoesData = [
      {
        'Serial': '5A4044G3H',
        'Nota Fiscal': '123456',
        'Destino': 'São Paulo - SP'
      },
      {
        'Serial': '4AF91NQ5F',
        'Nota Fiscal': '123457',
        'Destino': 'Rio de Janeiro - RJ'
      },
      {
        'Serial': '4AF91NQ4A',
        'Nota Fiscal': '123458',
        'Destino': 'Belo Horizonte - MG'
      }
    ];

    // Adicionar 100 linhas vazias
    for (let i = 0; i < 100; i++) {
      confirmacoesData.push({
        'Serial': '',
        'Nota Fiscal': '',
        'Destino': ''
      });
    }

    const confirmacoesSheet = XLSX.utils.json_to_sheet(confirmacoesData);

    // Configurar largura das colunas
    confirmacoesSheet['!cols'] = [
      { wch: 20 },  // Serial
      { wch: 20 },  // Nota Fiscal
      { wch: 25 }   // Destino
    ];

    // Formatar cabeçalho
    const headerRange = XLSX.utils.decode_range(confirmacoesSheet['!ref'] || 'A1');
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!confirmacoesSheet[address]) continue;

      confirmacoesSheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '3B82F6' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, confirmacoesSheet, 'Confirmacoes');

    // ========== ABA 2: INSTRUÇÕES ==========
    const instrucoesData = [
      ['INSTRUÇÕES DE PREENCHIMENTO'],
      [''],
      ['COLUNAS OBRIGATÓRIAS:'],
      ['• Serial: Número de série do equipamento (obrigatório)'],
      ['• Nota Fiscal: Número da nota fiscal (obrigatório)'],
      ['• Destino: Local de destino do equipamento (obrigatório)'],
      [''],
      ['REGRAS:'],
      ['1. Não deixe campos obrigatórios em branco'],
      ['2. Não modifique o nome das colunas'],
      ['3. Não adicione novas colunas'],
      ['4. Use apenas a aba "Confirmacoes"'],
      ['5. Serial deve existir na base de dados'],
      ['6. Se serial não existir, a linha será ignorada'],
      [''],
      ['EXEMPLOS:'],
      ['Serial: 5A4044G3H'],
      ['Nota Fiscal: NF-123456 ou 123456'],
      ['Destino: São Paulo - SP ou Sao Paulo'],
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
    const nomeArquivo = `Template_Importar_Confirmacoes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar arquivo Excel:', error);
    alert('Erro ao gerar arquivo Excel. Verifique o console para mais detalhes.');
  }
}
