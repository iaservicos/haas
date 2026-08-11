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
        'Nº Série': '5A4044G3H',
        'Modelo': 'POS MASTER C6400 MINIPRO F8256N1XC IOS',
        'Tipo': 'MiniPro',
        'SKU': '1307211'
      },
      {
        'Nº Série': '4AF91NQ5F',
        'Modelo': 'POS MASTER N6440 H3-03922 SESI_DF FP',
        'Tipo': 'Máquina de pagamento',
        'SKU': '3045107'
      },
      {
        'Nº Série': '4AF91NQ4A',
        'Modelo': 'POS MASTER N6440 H3-03922 SESI_DF FP',
        'Tipo': 'Máquina de pagamento',
        'SKU': '3045107'
      }
    ];

    // Adicionar 100 linhas vazias
    for (let i = 0; i < 100; i++) {
      equipamentosData.push({
        'Nº Série': '',
        'Modelo': '',
        'Tipo': '',
        'SKU': ''
      });
    }

    const equipamentosSheet = XLSX.utils.json_to_sheet(equipamentosData);

    // Configurar largura das colunas
    equipamentosSheet['!cols'] = [
      { wch: 20 },  // Nº Série
      { wch: 35 },  // Modelo
      { wch: 20 },  // Tipo
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
      ['• Tipo: Tipo do equipamento (obrigatório)'],
      ['• SKU: Código SKU do equipamento (obrigatório)'],
      [''],
      ['TIPOS VÁLIDOS:'],
      ['Desktop, Monitor, Notebook, MiniPro, All in One, Duo, Tablet, Chromebook, Máquina de pagamento, Diversos, Celular'],
      [''],
      ['REGRAS:'],
      ['1. Não deixe campos obrigatórios em branco'],
      ['2. Use apenas os tipos válidos listados acima'],
      ['3. Não modifique o nome das colunas'],
      ['4. Não adicione novas colunas'],
      ['5. Use apenas a aba "Equipamentos"'],
      ['6. Equipamentos duplicados (mesma série) serão ignorados'],
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
    const nomeArquivo = `Template_Importar_Equipamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar arquivo Excel:', error);
    alert('Erro ao gerar arquivo Excel. Verifique o console para mais detalhes.');
  }
}
