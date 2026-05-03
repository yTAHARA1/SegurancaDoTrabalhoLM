/* 
 * Sistema Dinâmico de Modais Customizados
 * Substitui window.alert, window.confirm e window.prompt por caixas em Glassmorphism
 */
window.CustomUI = {
    _createOverlay() {
        if (document.getElementById('custom-ui-overlay')) return null;
        const overlay = document.createElement('div');
        overlay.id = 'custom-ui-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999;
            opacity: 0; transition: opacity 0.3s ease;
        `;
        return overlay;
    },

    _createModalBox() {
        const box = document.createElement('div');
        box.className = 'glass-panel';
        box.style.cssText = `
            background: rgba(30, 41, 59, 0.85); /* Dark background with opacity */
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            color: #fff;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        return box;
    },

    alert(message, title = 'Aviso') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            if (!overlay) return resolve(); // Anti-spam: já existe um alert na tela
            
            const box = this._createModalBox();
            
            box.innerHTML = `
                <div style="width: 48px; height: 48px; background: rgba(16, 185, 129, 0.15); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${title}</h3>
                <p style="color: var(--c-gray-300); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; white-space: pre-wrap;">${message}</p>
                <button id="uiBtnOk" class="btn btn-primary" style="width: 100%;">Entendi</button>
            `;
            
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                box.style.transform = 'translateY(0) scale(1)';
            });

            const closeUI = () => {
                overlay.style.opacity = '0';
                box.style.transform = 'translateY(20px) scale(0.95)';
                setTimeout(() => { overlay.remove(); resolve(); }, 300);
            };

            box.querySelector('#uiBtnOk').addEventListener('click', closeUI);
        });
    },

    confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            if (!overlay) return resolve(false); // Anti-spam
            
            const box = this._createModalBox();
            
            box.innerHTML = `
                <div style="width: 48px; height: 48px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${title}</h3>
                <p style="color: var(--c-gray-300); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; white-space: pre-wrap;">${message}</p>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-outline" id="uiBtnCancel" style="flex: 1; padding: 0.6rem;">Cancelar</button>
                    <button class="btn btn-primary" id="uiBtnConfirm" style="flex: 1; padding: 0.6rem;">Confirmar</button>
                </div>
            `;
            
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                box.style.transform = 'translateY(0) scale(1)';
            });

            const closeUI = (result) => {
                overlay.style.opacity = '0';
                box.style.transform = 'translateY(20px) scale(0.95)';
                setTimeout(() => { overlay.remove(); resolve(result); }, 300);
            };

            box.querySelector('#uiBtnConfirm').addEventListener('click', () => closeUI(true));
            box.querySelector('#uiBtnCancel').addEventListener('click', () => closeUI(false));
        });
    },

    prompt(message, defaultValue = '', title = 'Entrada de Dados') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            if (!overlay) return resolve(null); // Anti-spam
            
            const box = this._createModalBox();
            
            box.innerHTML = `
                <div style="width: 48px; height: 48px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${title}</h3>
                <p style="color: var(--c-gray-300); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem; white-space: pre-wrap;">${message}</p>
                <input type="text" id="uiPromptInput" value="${defaultValue}" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; padding: 0.75rem; margin-bottom: 1.5rem; font-size: 1rem; outline: none; transition: border 0.3s;" onfocus="this.style.borderColor='var(--c-primary)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-outline" id="uiBtnCancel" style="flex: 1; padding: 0.6rem;">Cancelar</button>
                    <button class="btn btn-primary" id="uiBtnConfirm" style="flex: 1; padding: 0.6rem;">Salvar</button>
                </div>
            `;
            
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const input = box.querySelector('#uiPromptInput');
            input.focus();

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                box.style.transform = 'translateY(0) scale(1)';
            });

            const closeUI = (result) => {
                overlay.style.opacity = '0';
                box.style.transform = 'translateY(20px) scale(0.95)';
                setTimeout(() => { overlay.remove(); resolve(result); }, 300);
            };

            box.querySelector('#uiBtnConfirm').addEventListener('click', () => closeUI(input.value));
            box.querySelector('#uiBtnCancel').addEventListener('click', () => closeUI(null));
            
            input.addEventListener('keyup', (e) => {
                if(e.key === 'Enter') closeUI(input.value);
            });
        });
    }
};

window.alert = function(msg) { return CustomUI.alert(msg); };
