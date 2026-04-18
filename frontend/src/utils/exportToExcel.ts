import * as XLSX from 'xlsx';

export function exportarParaExcel(dados: any[], nomeArquivo: string) {
  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

  // Ajustar largura das colunas
  const colWidths = Object.keys(dados[0] || {}).map(() => 20);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Fazer download
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}

export function exportarVistoriasParaExcel(vistorias: any[], nomeArquivo: string = 'vistorias') {
  const dados = vistorias.map((v: any) => ({
    'Data': new Date(v.data_inspecao).toLocaleDateString('pt-BR'),
    'Cliente': v.contrato_equipamentos?.contratos?.nome_cliente || '-',
    'Série': v.contrato_equipamentos?.numero_serie || '-',
    'Modelo': v.contrato_equipamentos?.modelo || '-',
    'Tipo': v.equipment_type || '-',
    'Contrato': v.contrato_equipamentos?.contratos?.numero_contrato || '-',
    'Status': Object.values(v.respostas || {}).some((r: any) => r === false || r === 'Não') ? 'Com Avaria' : 'OK',
    'Observações': v.observacoes || '-',
  }));

  exportarParaExcel(dados, nomeArquivo);
}
