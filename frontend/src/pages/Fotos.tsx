import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

interface Foto {
  id: string;
  url_foto: string;
  nome_arquivo: string;
  nome_tecnico: string;
  telefone_tecnico: string;
  data_foto: string;
  message_id: string;
}

interface GrupoFotos {
  chave: string;
  tecnico: string;
  data: string;
  fotos: Foto[];
  aberto: boolean;
}

const FOTOS_POR_PAGINA = 50;

export function Fotos() {
  const { usuario, logout } = useAuth();
  const [todasFotos, setTodasFotos] = useState<Foto[]>([]);
  const [gruposFotos, setGruposFotos] = useState<GrupoFotos[]>([]);
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState("todos");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paginasGrupo, setPaginasGrupo] = useState<{ [key: string]: number }>({});

  // Buscar lista de técnicos
  useEffect(() => {
    const buscarTecnicos = async () => {
      try {
        const { data, error } = await supabase
          .from("fotos")
          .select("nome_tecnico")
          .order("nome_tecnico", { ascending: true });

        if (error) throw error;

        const tecnicosUnicos = [...new Set(data?.map((f) => f.nome_tecnico) || [])];
        setTecnicos(tecnicosUnicos);
      } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
      }
    };

    buscarTecnicos();
  }, []);

  // Buscar fotos com filtros
  useEffect(() => {
    const buscarFotos = async () => {
      try {
        setCarregando(true);
        let query = supabase.from("fotos").select("*");

        if (tecnicoSelecionado !== "todos") {
          query = query.eq("nome_tecnico", tecnicoSelecionado);
        }

        if (dataSelecionada) {
          const [dia, mes, ano] = dataSelecionada.split("/");
          const dataFormatada = `${ano}-${mes}-${dia}`;
          const proximoDia = new Date(dataFormatada);
          proximoDia.setDate(proximoDia.getDate() + 1);
          const proximoDiaFormatada = proximoDia.toISOString().split("T")[0];

          query = query
            .gte("data_foto", `${dataFormatada}T00:00:00`)
            .lt("data_foto", `${proximoDiaFormatada}T00:00:00`);
        }

        const { data, error } = await query.order("data_foto", {
          ascending: false,
        });

        if (error) throw error;

        setTodasFotos(data || []);
      } catch (error) {
        console.error("Erro ao buscar fotos:", error);
        setTodasFotos([]);
      } finally {
        setCarregando(false);
      }
    };

    buscarFotos();
  }, [tecnicoSelecionado, dataSelecionada]);

  // Agrupar fotos por técnico e data
  useEffect(() => {
    const agrupar = () => {
      const grupos: { [key: string]: GrupoFotos } = {};

      todasFotos.forEach((foto) => {
        const data = new Date(foto.data_foto).toLocaleDateString("pt-BR");
        const chave = `${foto.nome_tecnico}_${data}`;

        if (!grupos[chave]) {
          grupos[chave] = {
            chave,
            tecnico: foto.nome_tecnico,
            data,
            fotos: [],
            aberto: false,
          };
        }

        grupos[chave].fotos.push(foto);
      });

      setGruposFotos(Object.values(grupos));
    };

    agrupar();
  }, [todasFotos]);

  // Toggle abrir/fechar pasta
  const togglePasta = (chave: string) => {
    setGruposFotos((grupos) =>
      grupos.map((g) =>
        g.chave === chave ? { ...g, aberto: !g.aberto } : g
      )
    );
    // Resetar página ao abrir
    if (!gruposFotos.find((g) => g.chave === chave)?.aberto) {
      setPaginasGrupo((prev) => ({ ...prev, [chave]: 1 }));
    }
  };

  // Obter página atual de um grupo
  const getPaginaGrupo = (chave: string) => paginasGrupo[chave] || 1;

  // Mudar página de um grupo
  const mudarPaginaGrupo = (chave: string, novaPagina: number) => {
    setPaginasGrupo((prev) => ({ ...prev, [chave]: novaPagina }));
  };

  const limparFiltros = () => {
    setTecnicoSelecionado("todos");
    setDataSelecionada("");
    setPaginasGrupo({});
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Menu</div>
          
          <a href="/" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Dashboard</span>}
          </a>

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Confirmações</span>}
          </a>

          <a href="/fotos" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Fotos</span>}
          </a>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-600 rounded transition"
          >
            {sidebarOpen && <span>Sair</span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
                alt="Logo Positivo"
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">Fotos das Vistorias</h1>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Bem-vindo, <span className="font-semibold text-gray-900">{usuario?.nome || 'Carregando...'}</span></p>
            </div>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* FILTROS */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded hover:bg-gray-700 transition"
                >
                  Limpar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Técnico</label>
                  <select
                    value={tecnicoSelecionado}
                    onChange={(e) => setTecnicoSelecionado(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos os Técnicos</option>
                    {tecnicos.map((tecnico) => (
                      <option key={tecnico} value={tecnico}>
                        {tecnico}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data</label>
                  <input
                    type="date"
                    value={dataSelecionada ? dataSelecionada.split('/').reverse().join('-') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [ano, mes, dia] = e.target.value.split('-');
                        setDataSelecionada(`${dia}/${mes}/${ano}`);
                      } else {
                        setDataSelecionada('');
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* PASTAS DE FOTOS */}
            <div>
              {carregando ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-semibold">Carregando fotos...</p>
                </div>
              ) : todasFotos.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-600 font-semibold">Nenhuma foto encontrada com esses filtros</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gruposFotos.map((grupo) => (
                    <div key={grupo.chave} className="bg-white rounded-lg shadow overflow-hidden">
                      {/* HEADER DA PASTA */}
                      <button
                        onClick={() => togglePasta(grupo.chave)}
                        className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 transition flex items-center justify-between border-b border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {grupo.aberto ? '📂' : '📁'}
                          </span>
                          <div className="text-left">
                            <h3 className="text-lg font-bold text-gray-900">
                              {grupo.tecnico} - {grupo.data}
                            </h3>
                            <p className="text-sm text-gray-600">{grupo.fotos.length} foto(s)</p>
                          </div>
                        </div>
                        <span className="text-gray-600 font-bold">
                          {grupo.aberto ? '▼' : '▶'}
                        </span>
                      </button>

                      {/* CONTEÚDO DA PASTA (FOTOS) */}
                      {grupo.aberto && (() => {
                        const paginaAtual = getPaginaGrupo(grupo.chave);
                        const totalFotos = grupo.fotos.length;
                        const totalPaginas = Math.ceil(totalFotos / FOTOS_POR_PAGINA);
                        const inicio = (paginaAtual - 1) * FOTOS_POR_PAGINA;
                        const fim = inicio + FOTOS_POR_PAGINA;
                        const fotosPagina = grupo.fotos.slice(inicio, fim);

                        return (
                          <div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
                              {fotosPagina.map((foto) => (
                                <div key={foto.id} className="group relative">
                                  <img
                                    src={foto.url_foto}
                                    alt={foto.nome_arquivo}
                                    className="w-full h-32 object-cover rounded-lg hover:opacity-75 transition cursor-pointer"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition rounded-lg flex items-center justify-center">
                                    <a
                                      href={foto.url_foto}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-white opacity-0 group-hover:opacity-100 transition text-sm font-semibold"
                                    >
                                      Ver
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* PAGINAÇÃO */}
                            {totalPaginas > 1 && (
                              <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-200">
                                <button
                                  onClick={() => mudarPaginaGrupo(grupo.chave, Math.max(1, paginaAtual - 1))}
                                  disabled={paginaAtual === 1}
                                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                  ←
                                </button>
                                <span className="text-sm text-gray-600">
                                  Página {paginaAtual} de {totalPaginas}
                                </span>
                                <button
                                  onClick={() => mudarPaginaGrupo(grupo.chave, Math.min(totalPaginas, paginaAtual + 1))}
                                  disabled={paginaAtual === totalPaginas}
                                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
