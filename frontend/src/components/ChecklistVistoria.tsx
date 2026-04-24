import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  text: string;
  type: 'yes_no' | 'text' | 'select';
  options?: string[];
}

interface ChecklistVistoriaProps {
  confirmacaoId: string;  // Não é usado para salvar, apenas para compatibilidade
  equipmentType?: string;
  equipamentoId?: number;
  onChecklistSave?: (checklist: any) => void;
}

export const ChecklistVistoria: React.FC<ChecklistVistoriaProps> = ({ 
  confirmacaoId, 
  equipmentType = 'Desktop',
  equipamentoId,
  onChecklistSave 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [observacoes, setObservacoes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);

  // Get API base URL from environment variable
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const type = equipmentType || 'Desktop';
        console.log('[ChecklistVistoria] Carregando perguntas para:', type);
        
        // Use full URL with API_BASE_URL
        const url = `${API_BASE_URL}/inspecao/perguntas/${type}`;
        console.log('[ChecklistVistoria] URL da requisição:', url);
        
        const response = await fetch(url);
        console.log('[ChecklistVistoria] Status da resposta:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ChecklistVistoria] Erro na resposta:', errorText);
          throw new Error(`Erro ao carregar perguntas (${response.status})`);
        }
        
        const data = await response.json();
        console.log('[ChecklistVistoria] Perguntas recebidas:', data);
        
        setQuestions(data.questions || []);
        
        const initialAnswers: Record<string, string | boolean> = {};
        (data.questions || []).forEach((q: Question) => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar perguntas';
        console.error('[ChecklistVistoria] Erro:', errorMsg);
        setErro(errorMsg);
        setQuestions([]);
      }
    };

    loadQuestions();
  }, [equipmentType]);

  const handleAnswerChange = (questionId: string, value: string | boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  /**
   * Validar se todas as perguntas foram respondidas
   */
  const validarRespostas = (): boolean => {
    for (const question of questions) {
      const answer = answers[question.id];
      
      // Verificar se a resposta está vazia
      if (answer === '' || answer === undefined || answer === null) {
        setErro(`Por favor, responda a pergunta: "${question.text}"`);
        return false;
      }
    }
    
    setErro('');
    return true;
  };

  const handleSalvar = async () => {
    // Validar respostas
    if (!validarRespostas()) {
      return;
    }

    setLoading(true);
    setErro('');
    setSucesso(false);

    try {
      // Use full URL with API_BASE_URL
      const url = `${API_BASE_URL}/inspecao/salvar`;
      
      // NÃO enviar vistoriaId aqui, pois será gerado no VistoriaCliente
      // Este componente apenas coleta as respostas
      const payload = {
        vistoriaId: 'temp',  // Placeholder - será substituído no VistoriaCliente
        equipmentType,
        answers,
        observacoes,
        ...(equipamentoId && { equipamento_id: equipamentoId })
      };
      
      console.log('[ChecklistVistoria] Enviando payload:', payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar checklist');
      }

      const data = await response.json();
      console.log('[ChecklistVistoria] Resposta do servidor:', data);
      setSucesso(true);

      // Retornar os dados do checklist para o componente pai
      if (onChecklistSave) {
        onChecklistSave({
          answers,
          observacoes,
          equipmentType,
          equipamentoId
        });
      }

      setTimeout(() => {
        setSucesso(false);
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[ChecklistVistoria] Erro ao salvar:', errorMsg);
      setErro(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h3>Checklist de Vistoria - {equipmentType}</h3>
      {equipamentoId && <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Equipamento ID: {equipamentoId}</p>}

      {questions.length === 0 ? (
        <p style={{ color: '#666', marginTop: '10px' }}>Carregando perguntas...</p>
      ) : (
        <>
          {questions.map((question) => (
            <div key={question.id} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                {question.text}
              </label>

              {question.type === 'yes_no' && (
                <div>
                  <button
                    onClick={() => handleAnswerChange(question.id, true)}
                    style={{
                      padding: '8px 16px',
                      marginRight: '10px',
                      backgroundColor: answers[question.id] === true ? '#4CAF50' : '#ddd',
                      color: answers[question.id] === true ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => handleAnswerChange(question.id, false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: answers[question.id] === false ? '#f44336' : '#ddd',
                      color: answers[question.id] === false ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Não
                  </button>
                </div>
              )}

              {question.type === 'text' && (
                <textarea
                  value={answers[question.id]?.toString() || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Digite suas observações..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minHeight: '80px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                />
              )}

              {question.type === 'select' && question.options && (
                <select
                  value={answers[question.id]?.toString() || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  style={{
                    padding: '8px',
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                >
                  <option value="">Selecione uma opção</option>
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {/* CAMPO DE OBSERVAÇÕES GERAIS */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Observações Gerais
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite observações adicionais sobre a vistoria..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                minHeight: '80px',
                fontFamily: 'Arial, sans-serif',
              }}
            />
          </div>

          <button
            onClick={handleSalvar}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Salvando...' : 'Salvar Checklist'}
          </button>

          {erro && <p style={{ color: 'red', marginTop: '10px' }}>{erro}</p>}
          {sucesso && <p style={{ color: 'green', marginTop: '10px' }}>✅ Checklist salvo com sucesso!</p>}
        </>
      )}
    </div>
  );
};
