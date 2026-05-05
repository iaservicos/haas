import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  text: string;
  type: 'yes_no' | 'text' | 'select';
  options?: string[];
}

interface ChecklistVistoriaProps {
  confirmacaoId: string;
  equipmentType?: string;
  equipamentoId?: number;
  onChecklistSave?: (checklist: any) => void;
}

// Função para gerar UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const ChecklistVistoria: React.FC<ChecklistVistoriaProps> = ({ 
  confirmacaoId, 
  equipmentType = 'Desktop',
  equipamentoId,
  onChecklistSave 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
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

  const handleSalvar = async () => {
    setLoading(true);
    setErro('');
    setSucesso(false);

    try {
      // Use full URL with API_BASE_URL
      const url = `${API_BASE_URL}/inspecao/salvar`;
      
      // ✅ CORREÇÃO: Gerar UUID válido ao invés de "equip-ID"
      const vistoriaId = confirmacaoId || generateUUID();
      
      const payload = {
        vistoriaId,
        equipmentType,
        answers,
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

      if (onChecklistSave) {
        onChecklistSave(data);
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
    <div className="p-4 md:p-6 border border-gray-300 rounded-lg bg-white mt-4 md:mt-6">
      <h3 className="text-lg md:text-xl font-bold mb-4">Checklist de Vistoria - {equipmentType}</h3>
      {equipamentoId && <p className="text-xs md:text-sm text-gray-600 mb-4">Equipamento ID: {equipamentoId}</p>}

      {questions.length === 0 ? (
        <p className="text-gray-600 mt-2">Carregando perguntas...</p>
      ) : (
        <>
          {questions.map((question, index) => (
            <div key={question.id} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0">
              <label className="block mb-3 font-bold text-gray-900 text-sm md:text-base">
                {index + 1}. {question.text}
              </label>

              {question.type === 'yes_no' && (
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => handleAnswerChange(question.id, true)}
                    className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded text-sm md:text-base font-semibold transition ${
                      answers[question.id] === true 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => handleAnswerChange(question.id, false)}
                    className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded text-sm md:text-base font-semibold transition ${
                      answers[question.id] === false 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
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
                  className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base min-h-24 md:min-h-32"
                />
              )}

              {question.type === 'select' && question.options && (
                <select
                  value={answers[question.id]?.toString() || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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

          <div className="mt-6 space-y-3">
            <button
              onClick={handleSalvar}
              disabled={loading}
              className="w-full px-4 md:px-6 py-3 md:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-bold text-sm md:text-base transition disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Checklist'}
            </button>

            {erro && (
              <div className="p-3 md:p-4 bg-red-50 border-l-4 border-red-600 rounded">
                <p className="text-red-700 text-sm md:text-base font-semibold">{erro}</p>
              </div>
            )}
            {sucesso && (
              <div className="p-3 md:p-4 bg-green-50 border-l-4 border-green-600 rounded">
                <p className="text-green-700 text-sm md:text-base font-semibold">✓ Checklist salvo com sucesso!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
