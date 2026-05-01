/**
 * LM Segurança e Saúde - Camada de Banco de Dados (BaaS)
 * Este arquivo unifica o acesso para Salvar e Ler dados em Nuvem (Firebase).
 * Caso o Firebase não seja configurado com chaves válidas ainda, ele opera em Modo Local (LocalStorage) para desenvolvimento.
 */

// Cole o objeto de configuração (Firebase config) gerado lá no console do Firebase aqui:
const firebaseConfig = {
    apiKey: "AIzaSyAMmQjcaoDS0JFVvR06hfBe3c8YRgKdU_c",
    authDomain: "banco-de-dadoslm.firebaseapp.com",
    projectId: "banco-de-dadoslm",
    storageBucket: "banco-de-dadoslm.firebasestorage.app",
    messagingSenderId: "361853012334",
    appId: "1:361853012334:web:9c9583d4a44b63cad1597f",
    measurementId: "G-1D9EW0M8TH"
};

let dbFuncional = false;
let db = null;

try {
    if (firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        dbFuncional = true;
        console.log("🔥 Firebase conectado com sucesso!");
    } else {
        console.warn("⚠️ Chaves do Firebase não detectadas. Rodando Banco de Dados em MODO SIMULAÇÃO (Local).");
    }
} catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
}

const DBService = {
    // === CADASTRAR NOVO CLIENTE ===
    async salvarCliente(clienteData) {
        clienteData.dataCadastro = new Date().toISOString();

        if (dbFuncional) {
            try {
                // 1. Criar Auth Profile no Firebase
                const authUser = await firebase.auth().createUserWithEmailAndPassword(clienteData.email, clienteData.senha);
                const uid = authUser.user.uid;
                
                // Remove a senha para não salvar no Firestore
                const copiaCliente = { ...clienteData };
                delete copiaCliente.senha;
                
                // 2. Salvar no Firestore com o UID do Auth
                await db.collection("clientes").doc(uid).set(copiaCliente);
                return { success: true, id: uid };
            } catch (error) {
                // Traduz erros comuns de Auth
                if(error.code === 'auth/email-already-in-use') error.message = "Este e-mail já está em uso.";
                return { success: false, error };
            }
        } else {
            const clientes = JSON.parse(localStorage.getItem('lm_clientes') || '[]');
            const newClient = { ...clienteData, id: 'local_' + Date.now() };
            clientes.push(newClient);
            localStorage.setItem('lm_clientes', JSON.stringify(clientes));
            return { success: true, id: newClient.id, local: true };
        }
    },

    // === LOGIN DO CLIENTE ===
    async loginCliente(acesso, senha) {
        if (dbFuncional) {
            try {
                let emailToLogin = acesso;
                
                // Se acessou por CNPJ, tem que achar o e-mail primeiro
                if (!acesso.includes('@')) {
                    const snap = await db.collection("clientes").where("cnpj", "==", acesso).get();
                    if (!snap.empty) {
                        emailToLogin = snap.docs[0].data().email;
                    } else {
                        return { success: false, error: { message: "CNPJ não encontrado." } };
                    }
                }

                try {
                    // Tenta o login com Auth Nativo
                    const authRes = await firebase.auth().signInWithEmailAndPassword(emailToLogin, senha);
                    
                    // Puxar os dados do Firestore
                    const userDoc = await db.collection("clientes").doc(authRes.user.uid).get();
                    if (userDoc.exists) return { success: true, user: { id: userDoc.id, ...userDoc.data() } };
                    
                    // Se não bateu pelo UID (Migração), pega pelo e-mail
                    const snapFallback = await db.collection("clientes").where("email", "==", emailToLogin).get();
                    if (!snapFallback.empty) {
                        const doc = snapFallback.docs[0];
                        return { success: true, user: { id: doc.id, ...doc.data() } };
                    }
                } catch (authError) {
                    // Fallback para MIGRAÇÃO de usuários antigos (salvos em plain-text sem Firebase Auth criado)
                    const oldUserQuery = await db.collection("clientes").where("email", "==", emailToLogin).where("senha", "==", senha).get();
                    if (!oldUserQuery.empty) {
                        const oldDoc = oldUserQuery.docs[0];
                        try {
                            // Cria silenciosamente o Auth dele
                            const freshAuth = await firebase.auth().createUserWithEmailAndPassword(emailToLogin, senha);
                            // Cria com ID novo UID ou mantém documentação original? Manter o documento pode ser complexo mudar ID. 
                            // Excluir senha do firestore!
                            await db.collection("clientes").doc(oldDoc.id).update({
                                senha: firebase.firestore.FieldValue.delete()
                            });
                            return { success: true, user: { id: oldDoc.id, ...oldDoc.data() } };
                        } catch (e) {
                           return { success: false, error: e };
                        }
                    }
                    return { success: false, error: authError };
                }

                return { success: false };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const clientes = JSON.parse(localStorage.getItem('lm_clientes') || '[]');
            const user = clientes.find(c => (c.cnpj === acesso || c.email === acesso) && c.senha === senha);
            if (user) return { success: true, user };
            return { success: false };
        }
    },

    // === ENVIAR EMAIL DE RECUPERAÇÃO ===
    async enviarEmailRecuperacao(email) {
        if (dbFuncional) {
            try {
                 await firebase.auth().sendPasswordResetEmail(email);
                 return { success: true };
            } catch (error) {
                if(error.code === 'auth/user-not-found') error.message = "E-mail não está cadastrado em nosso sistema de Auth. Faça seu primeiro login para ativá-lo.";
                return { success: false, error };
            }
        } else {
            return { success: true, local: true };
        }
    },

    // === EDITAR SENHA DO CLIENTE (ADMIN) ===
    async alterarSenhaCliente(id, novaSenha) {
        if (dbFuncional) {
            try {
                await db.collection("clientes").doc(id).update({ senha: novaSenha });
                return { success: true };
            } catch (error) { return { success: false, error }; }
        } else {
            let clientes = JSON.parse(localStorage.getItem('lm_clientes') || '[]');
            clientes = clientes.map(c => c.id === id ? { ...c, senha: novaSenha } : c);
            localStorage.setItem('lm_clientes', JSON.stringify(clientes));
            return { success: true };
        }
    },

    // === DELETAR CLIENTE (ADMIN) ===
    async deleteCliente(id) {
        if (dbFuncional) {
            try {
                await db.collection("clientes").doc(id).delete();
                return { success: true };
            } catch (error) { return { success: false, error }; }
        } else {
            let clientes = JSON.parse(localStorage.getItem('lm_clientes') || '[]');
            localStorage.setItem('lm_clientes', JSON.stringify(clientes.filter(c => c.id !== id)));
            return { success: true };
        }
    },

    // === ADMINISTRAÇÃO DO SISTEMA (MÚLTIPLOS ADMINS) ===
    async salvarAdmin(adminData) {
        adminData.dataCriacao = new Date().toISOString();
        if (dbFuncional) {
            try { const res = await db.collection("admins").add(adminData); return { success: true, id: res.id }; }
            catch (error) { return { success: false, error }; }
        } else {
            const docs = JSON.parse(localStorage.getItem('lm_admins') || '[]');
            adminData.id = 'local_admin_' + Date.now();
            docs.push(adminData);
            localStorage.setItem('lm_admins', JSON.stringify(docs));
            return { success: true };
        }
    },
    async getAdmins() {
        if (dbFuncional) {
            const snap = await db.collection("admins").orderBy("dataCriacao", "desc").get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_admins') || '[]');
    },
    async deleteAdmin(id) {
        if (dbFuncional) await db.collection("admins").doc(id).delete();
        else {
            let docs = JSON.parse(localStorage.getItem('lm_admins') || '[]');
            localStorage.setItem('lm_admins', JSON.stringify(docs.filter(d => d.id !== id)));
        }
    },
    async loginAdmin(usuario, senha) {
        if (dbFuncional) {
            try {
                const snapshot = await db.collection("admins").where("usuario", "==", usuario).where("senha", "==", senha).get();
                if (!snapshot.empty) return { success: true, admin: snapshot.docs[0].data() };
                return { success: false };
            } catch (e) { return { success: false }; }
        } else {
            const admins = JSON.parse(localStorage.getItem('lm_admins') || '[]');
            const user = admins.find(a => a.usuario === usuario && a.senha === senha);
            return user ? { success: true, admin: user } : { success: false };
        }
    },

    // === CMS: SERVIÇOS DO COMBOBOX ===
    async addServico(nome) {
        const item = { nome: nome, data: new Date().toISOString() };
        if (dbFuncional) {
            const res = await db.collection("servicos").add(item);
            return { success: true, id: res.id };
        } else {
            const docs = JSON.parse(localStorage.getItem('lm_servicos') || '[]');
            item.id = 'local_' + Date.now();
            docs.push(item);
            localStorage.setItem('lm_servicos', JSON.stringify(docs));
            return { success: true };
        }
    },
    async getServicos() {
        if (dbFuncional) {
            const snap = await db.collection("servicos").orderBy("data", "asc").get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_servicos') || '[]');
    },
    async deleteServico(id) {
        if (dbFuncional) await db.collection("servicos").doc(id).delete();
        else {
            let docs = JSON.parse(localStorage.getItem('lm_servicos') || '[]');
            localStorage.setItem('lm_servicos', JSON.stringify(docs.filter(d => d.id !== id)));
        }
    },

    // === CMS: SERVIÇOS DA VITRINE (Cards visuais do site) ===
    async addServicoVitrine(data) {
        data.criadoEm = new Date().toISOString();
        if (dbFuncional) {
            const res = await db.collection("servicos_vitrine").add(data);
            return { success: true, id: res.id };
        } else {
            const docs = JSON.parse(localStorage.getItem('lm_servicos_vitrine') || '[]');
            data.id = 'local_' + Date.now();
            docs.push(data);
            localStorage.setItem('lm_servicos_vitrine', JSON.stringify(docs));
            return { success: true };
        }
    },
    async getServicosVitrine() {
        if (dbFuncional) {
            const snap = await db.collection("servicos_vitrine").orderBy("criadoEm", "asc").get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_servicos_vitrine') || '[]');
    },
    async deleteServicoVitrine(id) {
        if (dbFuncional) await db.collection("servicos_vitrine").doc(id).delete();
        else {
            let docs = JSON.parse(localStorage.getItem('lm_servicos_vitrine') || '[]');
            localStorage.setItem('lm_servicos_vitrine', JSON.stringify(docs.filter(d => d.id !== id)));
        }
    },

    // === CMS: NOTÍCIAS ===
    async addNoticia(noticiaData) {
        noticiaData.data = new Date().toISOString();
        if (dbFuncional) {
            const res = await db.collection("noticias").add(noticiaData);
            return { success: true, id: res.id };
        } else {
            const docs = JSON.parse(localStorage.getItem('lm_noticias') || '[]');
            noticiaData.id = 'local_' + Date.now();
            docs.push(noticiaData);
            localStorage.setItem('lm_noticias', JSON.stringify(docs));
            return { success: true };
        }
    },
    async getNoticias() {
        if (dbFuncional) {
            const snap = await db.collection("noticias").orderBy("data", "desc").get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_noticias') || '[]');
    },
    async deleteNoticia(id) {
        if (dbFuncional) await db.collection("noticias").doc(id).delete();
        else {
            let docs = JSON.parse(localStorage.getItem('lm_noticias') || '[]');
            localStorage.setItem('lm_noticias', JSON.stringify(docs.filter(d => d.id !== id)));
        }
    },

    // === CMS: GALERIA ===
    async addGaleria(imgUrl) {
        const item = { url: imgUrl, data: new Date().toISOString() };
        if (dbFuncional) {
            const res = await db.collection("galeria").add(item);
            return { success: true, id: res.id };
        } else {
            const docs = JSON.parse(localStorage.getItem('lm_galeria') || '[]');
            item.id = 'local_' + Date.now();
            docs.push(item);
            localStorage.setItem('lm_galeria', JSON.stringify(docs));
            return { success: true };
        }
    },
    async getGaleria() {
        if (dbFuncional) {
            const snap = await db.collection("galeria").orderBy("data", "desc").get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_galeria') || '[]');
    },
    async deleteGaleria(id) {
        if (dbFuncional) await db.collection("galeria").doc(id).delete();
        else {
            let docs = JSON.parse(localStorage.getItem('lm_galeria') || '[]');
            localStorage.setItem('lm_galeria', JSON.stringify(docs.filter(d => d.id !== id)));
        }
    },

    // === GERAR CÓDIGO ÚNICO DE AGENDAMENTO ===
    _gerarCodigoAgendamento() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'LM-';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    },

    // === GETTERS PADRÕES PARA ADMIN ===
    async salvarAgendamento(agendamentoData) {
        agendamentoData.dataSolicitacao = new Date().toISOString();
        agendamentoData.status = 'Pendente';
        agendamentoData.codigo = this._gerarCodigoAgendamento();
        if (dbFuncional) {
            try {
                const docRef = await db.collection("agendamentos").add(agendamentoData);
                return { success: true, id: docRef.id, codigo: agendamentoData.codigo };
            } catch (e) { return { success: false }; }
        } else {
            const ag = JSON.parse(localStorage.getItem('lm_agendamentos') || '[]');
            const n = { ...agendamentoData, id: 'local_' + Date.now() }; ag.push(n);
            localStorage.setItem('lm_agendamentos', JSON.stringify(ag));
            return { success: true, local: true, codigo: agendamentoData.codigo };
        }
    },

    // === BUSCAR AGENDAMENTO POR CÓDIGO ===
    async getAgendamentoPorCodigo(codigo) {
        if (dbFuncional) {
            const snap = await db.collection("agendamentos").where("codigo", "==", codigo.toUpperCase()).get();
            if (!snap.empty) {
                const doc = snap.docs[0];
                return { success: true, agendamento: { id: doc.id, ...doc.data() } };
            }
            return { success: false };
        } else {
            const ags = JSON.parse(localStorage.getItem('lm_agendamentos') || '[]');
            const found = ags.find(a => a.codigo === codigo.toUpperCase());
            return found ? { success: true, agendamento: found } : { success: false };
        }
    },
    async getAgendamentosPorCliente(clienteId) {
        if (dbFuncional) {
            const s = await db.collection("agendamentos").where("clienteId", "==", clienteId).get();
            let docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
            return docs.sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
        }
        const ags = JSON.parse(localStorage.getItem('lm_agendamentos') || '[]');
        return ags.filter(a => a.clienteId === clienteId).sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
    },
    async getClientes() {
        if (dbFuncional) {
            const s = await db.collection("clientes").orderBy("dataCadastro", "desc").get();
            return s.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_clientes') || '[]');
    },
    async getAgendamentos() {
        if (dbFuncional) {
            const s = await db.collection("agendamentos").orderBy("dataSolicitacao", "desc").get();
            return s.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        return JSON.parse(localStorage.getItem('lm_agendamentos') || '[]');
    },
    async updateAgendamentoStatus(id, novoStatus) {
        if (dbFuncional) {
            if (novoStatus === 'Cancelado') {
                await db.collection("agendamentos").doc(id).delete();
            } else {
                await db.collection("agendamentos").doc(id).update({ status: novoStatus });
            }
        } else {
            let ags = JSON.parse(localStorage.getItem('lm_agendamentos') || '[]');
            if (novoStatus === 'Cancelado') {
                ags = ags.filter(a => a.id !== id);
            } else {
                ags = ags.map(a => a.id === id ? { ...a, status: novoStatus } : a);
            }
            localStorage.setItem('lm_agendamentos', JSON.stringify(ags));
        }
    },

    // === ALTERAR SENHA DO ADMIN ===
    async alterarSenhaAdmin(id, novaSenha) {
        if (dbFuncional) {
            try {
                await db.collection("admins").doc(id).update({ senha: novaSenha });
                return { success: true };
            } catch (error) { return { success: false, error }; }
        } else {
            let admins = JSON.parse(localStorage.getItem('lm_admins') || '[]');
            admins = admins.map(a => a.id === id ? { ...a, senha: novaSenha } : a);
            localStorage.setItem('lm_admins', JSON.stringify(admins));
            return { success: true };
        }
    },

    // === BUSCAR CLIENTE POR EMAIL OU CNPJ (para recuperação de senha) ===
    async buscarClientePorAcesso(acesso) {
        if (dbFuncional) {
            try {
                let snap = await db.collection("clientes").where("email", "==", acesso).get();
                if (snap.empty) {
                    snap = await db.collection("clientes").where("cnpj", "==", acesso).get();
                }
                if (!snap.empty) {
                    const doc = snap.docs[0];
                    return { success: true, cliente: { id: doc.id, ...doc.data() } };
                }
                return { success: false };
            } catch (e) { return { success: false }; }
        } else {
            const clientes = JSON.parse(localStorage.getItem('lm_clientes') || '[]');
            const found = clientes.find(c => c.email === acesso || c.cnpj === acesso);
            return found ? { success: true, cliente: found } : { success: false };
        }
    }
}; 
