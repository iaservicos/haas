// ⚡ SUBSTITUA APENAS A FUNÇÃO carregarUsuarios (linhas 88-140)
// Copie esta função e substitua a função antiga no seu arquivo GerenciarClientes.tsx

const carregarUsuarios = async () => {
  try {
    const offset = (currentPage - 1) * itemsPerPage;

    let countQuery = supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', 'client');

    if (filtroNome) {
      countQuery = countQuery.ilike('nome', `%${filtroNome}%`);
    }

    const { count } = await countQuery;
    setTotalUsuarios(count || 0);

    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('user_type', 'client')
      .order('data_criacao', { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    if (filtroNome) {
      query = query.ilike('nome', `%${filtroNome}%`);
    }

    const { data: usuariosData, error } = await query;

    if (error) throw error;

    // ⚡ OTIMIZAÇÃO: Se não há usuários, retorna vazio
    if (!usuariosData || usuariosData.length === 0) {
      setUsuarios([]);
      return;
    }

    // ⚡ OTIMIZAÇÃO: Carregar TODOS os contratos de uma vez com IN
    const usuarioIds = usuariosData.map(u => u.id);
    
    const { data: todosUsuarioContratos, error: contratoError } = await supabase
      .from('usuario_contratos')
      .select('usuario_id, contrato_id')
      .in('usuario_id', usuarioIds);  // ← Uma única query para TODOS!

    if (contratoError) throw contratoError;

    // ⚡ OTIMIZAÇÃO: Mapear em memória (muito mais rápido)
    const contratosPorUsuario = new Map<string, number[]>();
    
    (todosUsuarioContratos || []).forEach(uc => {
      if (!contratosPorUsuario.has(uc.usuario_id)) {
        contratosPorUsuario.set(uc.usuario_id, []);
      }
      contratosPorUsuario.get(uc.usuario_id)!.push(uc.contrato_id);
    });

    // ⚡ OTIMIZAÇÃO: Construir resultado em memória (sem loops)
    const usuariosComContratos: UsuarioComContratos[] = usuariosData.map(usr => {
      const contratoIds = contratosPorUsuario.get(usr.id) || [];
      const contratosDoUsuario = contratos.filter(c => contratoIds.includes(c.id));

      return {
        ...usr,
        contratos: contratosDoUsuario,
      };
    });

    setUsuarios(usuariosComContratos);
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  }
};
