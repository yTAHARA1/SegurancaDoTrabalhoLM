// Initialize Lucide Icons
lucide.createIcons();

async function renderNoticias() {
    const noticiasGrid = document.getElementById('news-container');
    if (!noticiasGrid) return;

    // Fetch dynamically or fallback locally
    let newsList = await DBService.getNoticias();
    if (newsList.length === 0) {
        newsList = [
            { titulo: 'Novo Custo do eSocial para 2026', resumo: 'Entenda as principais mudanças na tabela de multas por falta de envio dos eventos...', tag: 'Legislação', imagem: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80', data: new Date().toISOString() },
            { titulo: 'A importância da NR-12 em Máquinas Pesadas', resumo: 'Como adequar o seu maquinário e evitar paralisações pela fiscalização do trabalho.', tag: 'Prevenção', imagem: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80', data: new Date().toISOString() },
            { titulo: 'Treinamento de Brigada de Incêndio', resumo: 'Abrimos novas turmas corporativas para treinamento prático de combate a incêndio.', tag: 'Cursos', imagem: 'https://images.unsplash.com/photo-1599389914442-70b991316b25?auto=format&fit=crop&q=80', data: new Date().toISOString() }
        ];
    }

    // Filter if search
    const search = document.getElementById('news-search')?.value.toLowerCase() || '';
    const filtered = newsList.filter(n => n.titulo.toLowerCase().includes(search) || n.resumo.toLowerCase().includes(search) || (n.tag && n.tag.toLowerCase().includes(search)));

    noticiasGrid.innerHTML = filtered.map(news => `
        <article class="news-card">
            <img src="${news.imagem || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80'}" alt="${news.titulo}" class="news-img">
            <div class="news-content">
                <span class="news-tag">${news.tag || 'Atualização'}</span>
                <h3 class="news-title">${news.titulo}</h3>
                <p class="news-excerpt">${news.resumo}</p>
            </div>
        </article>
    `).join('');
}

document.getElementById('news-search')?.addEventListener('input', renderNoticias);

async function renderGaleria() {
    const galleryGrid = document.getElementById('gallery-container');
    if (!galleryGrid) return;

    let galleryItems = await DBService.getGaleria();
    if (galleryItems.length === 0) {
        galleryItems = [
            { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80' },
            { url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80' },
            { url: 'https://images.unsplash.com/photo-1533583204996-03f69cf0acbc?auto=format&fit=crop&q=80' },
            { url: 'https://images.unsplash.com/photo-1541888086026-62bda2472ff2?auto=format&fit=crop&q=80' }
        ];
    }

    galleryGrid.innerHTML = galleryItems.map(item => `
        <div class="gallery-item">
            <img src="${item.url}" alt="Foto SST">
            <div class="gallery-overlay">
                <i data-lucide="zoom-in"></i>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Initial renders
async function renderServicosVitrine() {
    const container = document.getElementById('servicos-vitrine-container');
    if (!container) return;

    let servicos = await DBService.getServicosVitrine();

    // Fallback com os 4 serviços originais se o banco estiver vazio
    if (!servicos || servicos.length === 0) {
        servicos = [
            { icone: 'file-text', titulo: 'Documentação Obrigatória', descricao: 'Elaboração técnica de PGR, PCMSO, LTCAT, laudos técnicos específicos e <strong>Regularização eSocial SST</strong>.' },
            { icone: 'graduation-cap', titulo: 'Treinamentos (NRs) e SIPAT', descricao: 'Capacitação prática e teórica em <strong>NR-06, NR-12, NR-35</strong> (Trabalho em Altura), Espaço Confinado e SIPAT.' },
            { icone: 'search', titulo: 'Auditorias e Inspeções', descricao: 'Vistorias minuciosas, identificar não conformidades e recomendar providências de forma preventiva.' },
            { icone: 'headphones', titulo: 'Consultoria Contínua', descricao: 'Apoio na gestão contínua e estratégica da segurança do trabalho em tempo integral.' }
        ];
    }

    container.innerHTML = servicos.map(s => `
        <div class="service-card glass-panel">
            <i data-lucide="${s.icone}" class="service-icon"></i>
            <div class="service-content">
                <h3>${s.titulo}</h3>
                <p>${s.descricao}</p>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function renderServicosDropdown() {
    const select = document.getElementById('agendamento-servico');
    if (!select) return;

    let servicos = await DBService.getServicos();

    // Fallback com serviços padrão se o banco estiver vazio
    if (!servicos || servicos.length === 0) {
        servicos = [
            { id: 'pgr', nome: 'Levantamento para PGR/PCMSO' },
            { id: 'treinamento', nome: 'Treinamento NR-35 / NR-33' },
            { id: 'auditoria', nome: 'Auditoria de Segurança' },
            { id: 'consultoria', nome: 'Consultoria Geral' }
        ];
    }

    select.innerHTML = `<option value="">Selecione um Serviço...</option>` +
        servicos.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
}

window.addEventListener('DOMContentLoaded', () => {
    renderNoticias();
    renderGaleria();
    renderServicosDropdown();
    renderServicosVitrine();
});
// --- SPA Navigation Logic ---
const navLinks = document.querySelectorAll('.nav-link');
const views = document.querySelectorAll('.view');
const mobileMenuToggle = document.getElementById('mobile-toggle');
const navLinksContainer = document.getElementById('nav-links');

function switchView(targetId) {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update active view
    views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(`view-${targetId}`);
    if (targetView) targetView.classList.add('active');

    // Update active nav link
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-target="${targetId}"]`)?.classList.add('active');

    // Close mobile menu if open
    navLinksContainer.classList.remove('show');
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        switchView(target);

        // Also update URL hash without jump
        history.pushState(null, null, `#${target}`);
    });
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1) || 'home';
    switchView(hash);
});

// Mobile menu toggle
mobileMenuToggle?.addEventListener('click', () => {
    navLinksContainer.classList.toggle('show');
});


// --- Modals Logic ---
function setupModal(triggerBtnId, modalId, closeBtnId) {
    const triggerBtn = document.getElementById(triggerBtnId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);

    if (triggerBtn && modal && closeBtn) {
        triggerBtn.addEventListener('click', () => modal.classList.add('active'));
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
}

setupModal('btnLoginModal', 'loginModal', 'closeLoginModal');
setupModal('btnAgendamentoHome', 'agendamentoModal', 'closeAgendamentoModal');
setupModal('btnCadastroModal', 'cadastroModal', 'closeCadastroModal');

// Form Submissions DB Connection
document.getElementById('cadastroForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Salvando...';

    const cliente = {
        razaoSocial: document.getElementById('cad-empresa').value,
        cnpj: document.getElementById('cad-cnpj').value,
        responsavel: document.getElementById('cad-responsavel').value,
        email: document.getElementById('cad-email').value,
        telefone: document.getElementById('cad-telefone').value,
        senha: document.getElementById('cad-senha').value
    };

    const result = await DBService.salvarCliente(cliente);

    if (result.success) {
        await CustomUI.alert('Cadastro realizado com sucesso!\n\n⚠️ INSTRUÇÃO IMPORTANTE: Enviamos um link de verificação para o seu endereço de e-mail. Por favor, acesse seu e-mail e clique no link para ativar sua conta antes de fazer o Login.', 'Sucesso');
        document.getElementById('cadastroModal').classList.remove('active');
        e.target.reset();
    } else {
        console.error("Erro detalhado no Banco de Dados: ", result.error);
        await CustomUI.alert('Houve um erro no banco de dados: ' + (result.error?.message || 'Permissão Negada. Verifique o Firebase.'), 'Erro');
    }
    btn.innerHTML = originalText;
});

document.getElementById('agendamentoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const servicoSelect = document.getElementById('agendamento-servico');
    const servicoText = servicoSelect.options[servicoSelect.selectedIndex].text;
    const data = document.getElementById('agendamento-data').value;
    const obs = document.getElementById('agendamento-obs').value;
    const dataFormatada = data.split('-').reverse().join('/');

    const userStr = sessionStorage.getItem('lm_user');
    let clienteId = null;
    let clienteNome = '';
    if (userStr) {
        const user = JSON.parse(userStr);
        clienteId = user.id;
        clienteNome = user.razaoSocial;
    }

    // 1. Salvar no Banco de Dados (agora retorna o código)
    const result = await DBService.salvarAgendamento({
        servico: servicoText,
        dataAgendamento: dataFormatada,
        observacoes: obs,
        clienteId: clienteId || null,
        clienteNome: clienteNome || 'Visitante/Não Logado'
    });

    const codigoGerado = result.codigo || '---';

    if (clienteId) renderAreaCliente();

    // 2. Enviar para WhatsApp do Diretor
    let mensagem = `Olá! Gostaria de pré-agendar um serviço pela LM Segurança.\n\n`;
    mensagem += `*Código:* ${codigoGerado}\n`;
    mensagem += `*Serviço:* ${servicoText}\n`;
    mensagem += `*Data Preferencial:* ${dataFormatada}\n`;
    if (obs) {
        mensagem += `*Obs:* ${obs}`;
    }

    // 3. Mostrar o código ao usuário
    await CustomUI.alert(`✅ Agendamento solicitado com sucesso!\n\nSeu código de acompanhamento é:\n\n🔖 ${codigoGerado}\n\nGuarde este código para consultar o status do seu agendamento.`, 'Sucesso');

    const whatsappUrl = `https://wa.me/5518991526770?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');

    document.getElementById('agendamentoModal').classList.remove('active');
    e.target.reset();
});

document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('contato-nome')?.value || '';
    const email = document.getElementById('contato-email')?.value || '';
    const msg = document.getElementById('contato-msg')?.value || '';

    let mensagem = `Olá, meu nome é *${nome}*.\n`;
    if (email) mensagem += `Meu e-mail para contato é: ${email}\n\n`;
    mensagem += `*Mensagem:*\n${msg}`;

    const whatsappUrl = `https://wa.me/5518991526770?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');

    e.target.reset();
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Verificando...';

    const acesso = document.getElementById('login-acesso').value;
    const senha = document.getElementById('login-senha').value;

    // Admin redirect check (Dinâmico do banco)
    if (typeof DBService.loginAdmin === 'function') {
        const adminRes = await DBService.loginAdmin(acesso, senha);
        if (adminRes.success) {
            sessionStorage.setItem('adminAuth', 'true');
            window.location.href = 'admin.html';
            return;
        }
    }

    const res = await DBService.loginCliente(acesso, senha);
    if (res.success) {
        sessionStorage.setItem('lm_user', JSON.stringify(res.user));
        document.getElementById('loginModal').classList.remove('active');
        e.target.reset();
        checkLoginState();
        switchView('area-cliente');
    } else {
        // Exibe mensagem customizada se for erro de validação de e-mail
        if (res.error && res.error.code === 'auth/email-not-verified') {
            await CustomUI.alert(res.error.message, 'Atenção');
        } else {
            await CustomUI.alert('Acesso ou senha inválidos. Tente novamente.', 'Erro');
        }
    }
    btn.innerHTML = originalText;
});

// === ESQUECI MINHA SENHA ===
document.getElementById('btnEsqueciSenha')?.addEventListener('click', async () => {
    const acesso = document.getElementById('login-acesso').value.trim();

    if (!acesso) {
        await CustomUI.alert('Por favor, preencha o campo de CNPJ ou E-mail acima antes de clicar em "Esqueci minha senha".', 'Aviso');
        return;
    }

    const btn = document.getElementById('btnEsqueciSenha');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Enviando...';
    btn.style.pointerEvents = 'none';

    const res = await DBService.buscarClientePorAcesso(acesso);

    if (res.success) {
        const cliente = res.cliente;
        const email = cliente.email;
        
        // Disparando E-mail pelo Firebase Auth
        const resetRes = await DBService.enviarEmailRecuperacao(email);
        
        if (resetRes.local || resetRes.success) {
            await CustomUI.alert('✅ E-mail de recuperação enviado!\n\nVerifique a caixa de entrada (e spam) do e-mail: ' + email + '\nVocê receberá um e-mail noreply para cadastrar uma nova senha.', 'Sucesso');
        } else {
            console.error("Erro ao enviar email", resetRes.error);
            await CustomUI.alert('❌ Não foi possível enviar o e-mail no momento:\n' + (resetRes.error?.message || 'Tente novamente mais tarde.'), 'Erro');
        }
    } else {
        await CustomUI.alert('❌ Nenhuma conta encontrada com este CNPJ ou E-mail.\nVerifique os dados digitados e tente novamente.', 'Erro');
    }

    btn.innerHTML = originalText;
    btn.style.pointerEvents = 'auto';
});

// Resumo e estado da sessão do cliente
async function renderAreaCliente() {
    const userStr = sessionStorage.getItem('lm_user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const clienteNameEl = document.getElementById('cliente-nome-display');
    if (clienteNameEl) clienteNameEl.innerText = `Bem-vindo, ${user.responsavel || user.razaoSocial}.`;

    const agendamentos = await DBService.getAgendamentosPorCliente(user.id);
    const tbody = document.getElementById('lista-meus-agendamentos');
    if (tbody) {
        tbody.innerHTML = agendamentos.map(a => {
            const statusColors = { 'Pendente': '#f59e0b', 'Em Andamento': '#3b82f6', 'Concluído': '#10b981', 'Cancelado': '#ef4444' };
            const statusColor = statusColors[a.status] || '#f59e0b';
            return `
            <tr style="border-bottom: 1px solid var(--c-gray-200);">
                <td style="padding: 1rem;"><span style="background: var(--c-primary); color: white; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">${a.codigo || '---'}</span></td>
                <td style="padding: 1rem;"><strong>${a.servico}</strong><br><small style="color:gray">${a.observacoes || ''}</small></td>
                <td style="padding: 1rem;">${a.dataAgendamento}</td>
                <td style="padding: 1rem;"><span style="color: ${statusColor}; font-weight: 500;">${a.status || 'Pendente'}</span></td>
            </tr>`;
        }).join('') || `<tr><td colspan="4" style="padding: 1rem;">Nenhuma solicitação encontrada.</td></tr>`;
    }
}

function checkLoginState() {
    const userStr = sessionStorage.getItem('lm_user');
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');

    if (userStr) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        renderAreaCliente();
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

document.getElementById('btnLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem('lm_user');
    checkLoginState();
    switchView('home');
});

window.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 20) {
        navbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    }
});
