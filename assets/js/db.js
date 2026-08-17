/**
 * LM Segurança e Saúde - Camada de Banco de Dados (Supabase)
 * Este arquivo foi refatorado para utilizar o Supabase em vez do Firebase/LocalStorage.
 */

// Configure aqui as suas chaves do Supabase
const SUPABASE_URL = "SUA_URL_DO_SUPABASE";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_PUBLICA";

let dbFuncional = false;
let supabase = null;

try {
    if (SUPABASE_URL !== "SUA_URL_DO_SUPABASE") {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        dbFuncional = true;
        console.log("⚡ Supabase conectado com sucesso!");
    } else {
        console.warn("⚠️ Chaves do Supabase não configuradas. Você precisa adicionar sua URL e KEY no arquivo db.js.");
    }
} catch (e) {
    console.error("Erro ao inicializar Supabase:", e);
}

const DBService = {
    _validarPayloadCadastro(clienteData) {
        if (!clienteData.cnpj || clienteData.cnpj.replace(/\D/g, '').length !== 14) return "O CNPJ inserido tem um formato inválido.";
        if (!clienteData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteData.email)) return "O e-mail inserido é inválido.";
        if (!clienteData.senha || clienteData.senha.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
        return null;
    },

    async salvarCliente(clienteData) {
        const erroValidacao = this._validarPayloadCadastro(clienteData);
        if (erroValidacao) return { success: false, error: { message: erroValidacao } };

        if (!dbFuncional) return { success: false, error: { message: "Supabase não configurado." } };

        try {
            // Cria o usuário na Autenticação (A trigger sql já cria o profile)
            const { data, error } = await supabase.auth.signUp({
                email: clienteData.email,
                password: clienteData.senha,
                options: {
                    data: {
                        full_name: clienteData.razaoSocial,
                        cnpj: clienteData.cnpj,
                        telefone: clienteData.telefone
                    }
                }
            });

            if (error) throw error;

            // Como as informações extras (cnpj, telefone) ficam no metadata, se você 
            // quiser elas no painel do admin facilmente, o ideal é atualizar a tabela profiles.
            await supabase.from('profiles').update({
                cnpj: clienteData.cnpj,
                telefone: clienteData.telefone,
                email: clienteData.email // Salvando copia do email na tabela pública
            }).eq('id', data.user.id);

            return { success: true, id: data.user.id };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('already registered')) msg = "Este e-mail já está em uso.";
            return { success: false, error: { message: msg } };
        }
    },

    async loginCliente(acesso, senha) {
        if (!dbFuncional) return { success: false };

        try {
            let emailToLogin = acesso;

            // Se for CNPJ, buscar o e-mail primeiro na tabela profiles
            if (!acesso.includes('@')) {
                const { data: profileData, error: profileErr } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('cnpj', acesso)
                    .single();
                
                if (profileData) {
                    emailToLogin = profileData.email;
                } else {
                    return { success: false, error: { message: "CNPJ não encontrado." } };
                }
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailToLogin,
                password: senha,
            });

            if (error) return { success: false, error };

            const { data: userData } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            
            return { success: true, user: { id: data.user.id, ...userData } };
        } catch (error) {
            return { success: false, error };
        }
    },

    async enviarEmailRecuperacao(email) {
        if (!dbFuncional) return { success: false };
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    async alterarSenhaCliente(id, novaSenha) {
        // No Supabase apenas o próprio usuário pode mudar sua senha ou um admin usando a API admin (Server-side)
        // Para simular, se for chamado pelo painel admin precisaria de um backend. 
        return { success: false, error: { message: "Para alterar senha de terceiros requer API de Admin no Backend do Supabase." } };
    },

    async deleteCliente(id) {
        if (!dbFuncional) return { success: false };
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    async salvarAdmin(adminData) {
        if (!dbFuncional) return { success: false };
        try {
            const { data, error } = await supabase.auth.signUp({
                email: adminData.email,
                password: adminData.senha,
            });
            if (error) throw error;

            await supabase.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
            return { success: true, id: data.user.id };
        } catch (error) {
            return { success: false, error };
        }
    },

    async getAdmins() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from('profiles').select('*').eq('role', 'admin').order('created_at', { ascending: false });
        return data || [];
    },

    async deleteAdmin(id) {
        if (!dbFuncional) return;
        await supabase.from('profiles').delete().eq('id', id);
    },

    async promoverAdmin(clienteId) {
        if (!dbFuncional) return { success: false };
        try {
            const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', clienteId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    async loginAdmin(email, senha) {
        if (!dbFuncional) return { success: false };
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
            if (error) throw error;

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            if (profile && profile.role === 'admin') {
                return { success: true, admin: { id: data.user.id, ...profile } };
            }
            await supabase.auth.signOut();
            return { success: false, error: { message: "Você não tem permissão de administrador." } };
        } catch (e) {
            return { success: false, error: e };
        }
    },

    async addServico(nome) {
        if (!dbFuncional) return { success: false };
        const { data, error } = await supabase.from("servicos").insert([{ titulo: nome, descricao: '...' }]).select();
        return error ? { success: false, error } : { success: true, id: data[0].id };
    },
    
    async getServicos() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("servicos").select("*").order('created_at', { ascending: true });
        return data ? data.map(s => ({ id: s.id, nome: s.titulo })) : [];
    },

    async deleteServico(id) {
        if (!dbFuncional) return;
        await supabase.from("servicos").delete().eq('id', id);
    },

    async addServicoVitrine(item) {
        // Para manter a estrutura, vamos salvar isso em uma nova tabela 'servicos_vitrine' ou adaptar.
        if (!dbFuncional) return { success: false };
        const { data, error } = await supabase.from("servicos_vitrine").insert([item]).select();
        return error ? { success: false, error } : { success: true, id: data[0].id };
    },

    async getServicosVitrine() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("servicos_vitrine").select("*").order('criadoEm', { ascending: true });
        return data || [];
    },

    async deleteServicoVitrine(id) {
        if (!dbFuncional) return;
        await supabase.from("servicos_vitrine").delete().eq('id', id);
    },

    async addNoticia(noticiaData) {
        if (!dbFuncional) return { success: false };
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("noticias").insert([{
            titulo: noticiaData.titulo,
            conteudo: noticiaData.resumo,
            autor_id: user?.id,
            tag: noticiaData.tag,
            imagem: noticiaData.imagem
        }]).select();
        return error ? { success: false, error } : { success: true, id: data[0].id };
    },

    async getNoticias() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("noticias").select("*").order('created_at', { ascending: false });
        return data ? data.map(n => ({ id: n.id, titulo: n.titulo, resumo: n.conteudo, imagem: n.imagem, tag: n.tag })) : [];
    },

    async deleteNoticia(id) {
        if (!dbFuncional) return;
        await supabase.from("noticias").delete().eq('id', id);
    },

    async addGaleria(imgUrl) {
        if (!dbFuncional) return { success: false };
        const { data, error } = await supabase.from("galeria").insert([{ url: imgUrl }]).select();
        return error ? { success: false, error } : { success: true, id: data[0].id };
    },

    async getGaleria() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("galeria").select("*").order('created_at', { ascending: false });
        return data || [];
    },

    async deleteGaleria(id) {
        if (!dbFuncional) return;
        await supabase.from("galeria").delete().eq('id', id);
    },

    _gerarCodigoAgendamento() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'LM-';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    },

    async salvarAgendamento(agendamentoData) {
        if (!dbFuncional) return { success: false };
        const codigo = this._gerarCodigoAgendamento();
        const { data, error } = await supabase.from("agendamentos").insert([{
            user_id: agendamentoData.clienteId,
            servico_id: agendamentoData.servicoId || null,
            servico_nome: agendamentoData.servico, // fallback
            data_agendamento: agendamentoData.dataAgendamento + 'T00:00:00Z',
            observacoes: agendamentoData.observacoes,
            codigo: codigo,
            status: 'Pendente'
        }]).select();
        return error ? { success: false, error } : { success: true, id: data[0].id, codigo: codigo };
    },

    async getAgendamentosPorCliente(clienteId) {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("agendamentos").select("*").eq('user_id', clienteId).order('created_at', { ascending: false });
        return data ? data.map(a => ({ id: a.id, codigo: a.codigo, servico: a.servico_nome, dataAgendamento: a.data_agendamento.split('T')[0], status: a.status, observacoes: a.observacoes })) : [];
    },

    async getClientes() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("profiles").select("*").eq('role', 'client').order('created_at', { ascending: false });
        return data ? data.map(c => ({ id: c.id, razaoSocial: c.full_name, cnpj: c.cnpj, email: c.email, telefone: c.telefone })) : [];
    },

    async getAgendamentos() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("agendamentos").select(`
            *,
            profiles(full_name)
        `).order('created_at', { ascending: false });
        
        return data ? data.map(a => ({
            id: a.id,
            clienteId: a.user_id,
            clienteNome: a.profiles?.full_name,
            codigo: a.codigo,
            servico: a.servico_nome,
            dataAgendamento: a.data_agendamento.split('T')[0],
            status: a.status,
            observacoes: a.observacoes
        })) : [];
    },

    async updateAgendamentoStatus(id, novoStatus) {
        if (!dbFuncional) return;
        if (novoStatus === 'Cancelado') {
            await supabase.from("agendamentos").delete().eq('id', id);
        } else {
            await supabase.from("agendamentos").update({ status: novoStatus }).eq('id', id);
        }
    },

    async salvarFeedback(feedbackData) {
        if (!dbFuncional) return { success: false };
        const { data, error } = await supabase.from("depoimentos").insert([{
            nome: feedbackData.clienteNome,
            mensagem: feedbackData.mensagem,
            aprovado: false
        }]).select();
        return error ? { success: false, error } : { success: true, id: data[0].id };
    },

    async getFeedbacksPublic() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("depoimentos").select("*").eq('aprovado', true).order('created_at', { ascending: false });
        return data ? data.map(f => ({ id: f.id, clienteNome: f.nome, mensagem: f.mensagem, data: f.created_at, status: 'Aprovado' })) : [];
    },

    async getFeedbacksAdmin() {
        if (!dbFuncional) return [];
        const { data } = await supabase.from("depoimentos").select("*").order('created_at', { ascending: false });
        return data ? data.map(f => ({ id: f.id, clienteNome: f.nome, mensagem: f.mensagem, data: f.created_at, status: f.aprovado ? 'Aprovado' : 'Pendente' })) : [];
    },

    async updateFeedbackStatus(id, novoStatus) {
        if (!dbFuncional) return { success: false };
        await supabase.from("depoimentos").update({ aprovado: novoStatus === 'Aprovado' }).eq('id', id);
        return { success: true };
    },

    async deleteFeedback(id) {
        if (!dbFuncional) return { success: false };
        await supabase.from("depoimentos").delete().eq('id', id);
        return { success: true };
    }
};
