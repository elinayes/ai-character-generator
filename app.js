// ==================== 配置 ====================
const MODULE_CONFIG = [
    { id: 'basic-info', name: '基本信息', required: true },
    { id: 'personality', name: '性格特质' },
    { id: 'likes-dislikes', name: '喜好与厌恶' },
    { id: 'background', name: '过往经历' },
    { id: 'thinking-pattern', name: '思考模式' },
    { id: 'speech-style', name: '语言风格' },
    { id: 'behavior-examples', name: '行为举例' },
    { id: 'relationships', name: '人际关系' },
    { id: 'social-identity', name: '社会身份' },
    { id: 'current-state', name: '当前状态' },
    { id: 'goals-motivation', name: '目标与动机' },
    { id: 'abilities', name: '能力与技能' },
    { id: 'weaknesses', name: '弱点与缺陷' },
    { id: 'secrets', name: '秘密/隐藏面' },
    { id: 'worldview', name: '世界观说明' }
];

const STORAGE_KEYS = {
    API_CONFIG: 'acg_api_config',
    CURRENT_CHARACTER: 'acg_current_character',
    SAVED_CHARACTERS: 'acg_saved_characters',
    CUSTOM_PROMPTS: 'acg_custom_prompts',
    DEFAULT_PROMPTS: 'acg_default_prompts'
};

// ==================== 状态管理 ====================
let state = {
    api: { url: '', key: '', model: '' },
    currentCharacter: {
        type: 'original',
        workName: '',
        characterName: '',
        userRelationship: '',
        injectRelationship: true,
        modules: {}
    },
    prompts: {},
    defaultPrompts: {}
};

// ==================== 工具函数 ====================
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function load(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch {
        return defaultValue;
    }
}

function showToast(message, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(text = '处理中...') {
    $('#loading-text').textContent = text;
    $('#loading').classList.remove('hidden');
}

function hideLoading() {
    $('#loading').classList.add('hidden');
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    // 加载保存的数据
    state.api = load(STORAGE_KEYS.API_CONFIG, state.api);
    state.currentCharacter = load(STORAGE_KEYS.CURRENT_CHARACTER, state.currentCharacter);
    state.prompts = load(STORAGE_KEYS.CUSTOM_PROMPTS, {});
    state.defaultPrompts = load(STORAGE_KEYS.DEFAULT_PROMPTS, {});

    // 加载默认提示词
    await loadDefaultPrompts();

    // 初始化UI
    initNavigation();
    initApiSettings();
    initCharacterType();
    initRelationship();
    initModules();
    initPreviewModal();
    initAiModal();
    initPromptManager();
    initDataManagement();
    initArchive();

    // 填充已有数据
    fillExistingData();
});

// ==================== 导航 ====================
function initNavigation() {
    $$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.page').forEach(p => p.classList.remove('active'));
            $(`#page-${page}`).classList.add('active');
        });
    });
}

// ==================== API 设置 ====================
function initApiSettings() {
    // 填充已保存的配置
    $('#api-url').value = state.api.url || '';
    $('#api-key').value = state.api.key || '';
    
    // 切换密钥显示
    $('#toggle-key').addEventListener('click', () => {
        const input = $('#api-key');
        const btn = $('#toggle-key');
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '隐藏';
        } else {
            input.type = 'password';
            btn.textContent = '显示';
        }
    });

    // 拉取模型
    $('#btn-fetch-models').addEventListener('click', async () => {
        const url = $('#api-url').value.trim();
        const key = $('#api-key').value.trim();
        
        if (!url || !key) {
            showToast('请先填写 API URL 和 Key', 'error');
            return;
        }

        showLoading('拉取模型列表...');
        try {
            const response = await fetch(`${url}/models`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            
            if (!response.ok) throw new Error('请求失败');
            
            const data = await response.json();
            const models = data.data || [];
            const select = $('#api-model');
            select.innerHTML = models.map(m => 
                `<option value="${m.id}">${m.id}</option>`
            ).join('');
            
            if (state.api.model) {
                select.value = state.api.model;
            }
            
            showToast('模型列表已更新', 'success');
        } catch (error) {
            showToast('拉取失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });

    // 保存配置
    $('#btn-save-api').addEventListener('click', () => {
        state.api = {
            url: $('#api-url').value.trim(),
            key: $('#api-key').value.trim(),
            model: $('#api-model').value
        };
        save(STORAGE_KEYS.API_CONFIG, state.api);
        $('#api-status').textContent = '已保存';
        $('#api-status').className = 'status-text success';
        showToast('API 配置已保存', 'success');
    });
}

// ==================== 角色类型 ====================
function initCharacterType() {
    $$('input[name="character-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.currentCharacter.type = e.target.value;
            $('#fanwork-inputs').classList.toggle('hidden', e.target.value !== 'fanwork');
            saveCurrentCharacter();
        });
    });

    // 同人角色一键生成
    $('#btn-generate-fanwork').addEventListener('click', generateFanworkCharacter);
}

// ==================== 用户关系 ====================
function initRelationship() {
    // 预设按钮
    $$('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $('#user-relationship').value = btn.dataset.value;
            state.currentCharacter.userRelationship = btn.dataset.value;
            
            // 陌生人时禁用注入
            const isStranger = btn.dataset.value === '陌生人';
            $('#inject-relationship').checked = !isStranger;
            $('#inject-relationship').disabled = isStranger;
            state.currentCharacter.injectRelationship = !isStranger;
            
            saveCurrentCharacter();
        });
    });

    // 自定义输入
    $('#user-relationship').addEventListener('input', (e) => {
        $$('.preset-btn').forEach(b => b.classList.remove('active'));
        state.currentCharacter.userRelationship = e.target.value;
        saveCurrentCharacter();
    });

    // 注入开关
    $('#inject-relationship').addEventListener('change', (e) => {
        state.currentCharacter.injectRelationship = e.target.checked;
        saveCurrentCharacter();
    });
}

// ==================== 模块编辑 ====================
function initModules() {
    const container = $('#modules-container');
    
    MODULE_CONFIG.forEach(module => {
        const item = document.createElement('div');
        item.className = 'module-item';
        item.dataset.moduleId = module.id;
        
        item.innerHTML = `
            <div class="module-header">
                <div class="module-header-left">
                    <input type="checkbox" class="module-toggle" ${module.required ? 'checked disabled' : 'checked'}>
                    <span class="module-name">${module.name}</span>
                </div>
                <span class="module-expand">▼</span>
            </div>
            <div class="module-content">
                <textarea class="textarea module-textarea" rows="6" 
                    placeholder="输入${module.name}的内容..."
                    data-module-id="${module.id}"></textarea>
                <div class="module-actions">
                    <button class="btn btn-small btn-secondary btn-ai-assist" data-module-id="${module.id}">
                        AI 辅助
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });

    // 展开/收起
    $$('.module-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('module-toggle')) return;
            header.parentElement.classList.toggle('expanded');
        });
    });

    // 模块内容变化
    $$('.module-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const moduleId = e.target.dataset.moduleId;
            state.currentCharacter.modules[moduleId] = e.target.value;
            saveCurrentCharacter();
        });
    });

    // AI 辅助按钮
    $$('.btn-ai-assist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAiModal(btn.dataset.moduleId);
        });
    });

    // 保存角色
    $('#btn-save-character').addEventListener('click', saveCharacterToArchive);

    // 预览
    $('#btn-preview').addEventListener('click', openPreviewModal);
}

// ==================== 同人角色生成 ====================
async function generateFanworkCharacter() {
    const workName = $('#work-name').value.trim();
    const characterName = $('#character-name').value.trim();
    const userRelationship = $('#user-relationship').value.trim() || '陌生人';

    if (!workName || !characterName) {
        showToast('请填写作品名称和角色名称', 'error');
        return;
    }

    if (!state.api.url || !state.api.key || !state.api.model) {
        showToast('请先配置 API', 'error');
        return;
    }

    showLoading('正在生成角色数据...');

    try {
        let prompt = state.prompts['fanwork-generate'] || state.defaultPrompts['fanwork-generate'] || '';
        prompt = prompt
            .replace(/\{\{work_name\}\}/g, workName)
            .replace(/\{\{character_name\}\}/g, characterName)
            .replace(/\{\{user_relationship\}\}/g, userRelationship);

        const response = await callAI(prompt);
        
        // 解析 JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('未找到有效的 JSON 数据');
        
        const data = JSON.parse(jsonMatch[0]);
        
        // 填充到模块
        fillModulesFromData(data);
        
        state.currentCharacter.workName = workName;
        state.currentCharacter.characterName = characterName;
        saveCurrentCharacter();
        
        showToast('角色数据生成成功', 'success');
    } catch (error) {
        console.error('Generate error:', error);
        showToast('生成失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function fillModulesFromData(data) {
    const mapping = {
        'basic-info': () => {
            if (!data.basic_info) return '';
            const info = data.basic_info;
            return `姓名：${info.name || ''}
年龄：${info.age || ''}
生日：${info.birthday || ''}
性别：${info.gender || ''}
体型：${info.body_type || ''}
MBTI：${info.mbti || ''}
外貌：${info.appearance || ''}`;
        },
        'personality': () => data.personality || '',
        'likes-dislikes': () => {
            if (!data.likes_dislikes) return '';
            return `喜欢：${data.likes_dislikes.likes || ''}

讨厌：${data.likes_dislikes.dislikes || ''}`;
        },
        'background': () => data.background || '',
        'thinking-pattern': () => data.thinking_pattern || '',
        'speech-style': () => data.speech_style || '',
        'behavior-examples': () => data.behavior_examples || '',
        'relationships': () => {
            if (!Array.isArray(data.relationships)) return data.relationships || '';
            return data.relationships.map(r => 
                `${r.person}（${r.relation}）：${r.description}`
            ).join('\n\n');
        },
        'social-identity': () => data.social_identity || '',
        'current-state': () => data.current_state || '',
        'goals-motivation': () => {
            if (!data.goals_motivation) return '';
            const g = data.goals_motivation;
            return `短期目标：${g.short_term || ''}

长期目标：${g.long_term || ''}

核心动机：${g.core_motivation || ''}`;
        },
        'abilities': () => data.abilities || '',
        'weaknesses': () => data.weaknesses || '',
        'secrets': () => data.secrets || '',
        'worldview': () => data.worldview || ''
    };

    MODULE_CONFIG.forEach(module => {
        const getter = mapping[module.id];
        if (getter) {
            const content = getter();
            state.currentCharacter.modules[module.id] = content;
            const textarea = $(`.module-textarea[data-module-id="${module.id}"]`);
            if (textarea) textarea.value = content;
        }
    });
}

// ==================== AI 调用 ====================
async function callAI(prompt, options = {}) {
    const response = await fetch(`${state.api.url}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.api.key}`
        },
        body: JSON.stringify({
            model: state.api.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

// ==================== AI 助手弹窗 ====================
let currentAiModuleId = null;

function initAiModal() {
    $('#close-ai-modal').addEventListener('click', () => {
        $('#ai-modal').classList.add('hidden');
    });

    $('#btn-ai-generate').addEventListener('click', generateWithAi);
    
    $('#btn-copy-ai').addEventListener('click', () => {
        navigator.clipboard.writeText($('#ai-output').value);
        showToast('已复制', 'success');
    });

    $('#btn-apply-ai').addEventListener('click', () => {
        const output = $('#ai-output').value;
        if (output && currentAiModuleId) {
            state.currentCharacter.modules[currentAiModuleId] = output;
            const textarea = $(`.module-textarea[data-module-id="${currentAiModuleId}"]`);
            if (textarea) textarea.value = output;
            saveCurrentCharacter();
            $('#ai-modal').classList.add('hidden');
            showToast('已应用到模块', 'success');
        }
    });
}

function openAiModal(moduleId) {
    currentAiModuleId = moduleId;
    const module = MODULE_CONFIG.find(m => m.id === moduleId);
    $('#ai-modal-module').textContent = module?.name || moduleId;
    $('#ai-input').value = '';
    $('#ai-output').value = '';
    $('#ai-modal').classList.remove('hidden');
}

async function generateWithAi() {
    const userInput = $('#ai-input').value.trim();
    
    if (!state.api.url || !state.api.key || !state.api.model) {
        showToast('请先配置 API', 'error');
        return;
    }

    showLoading('AI 生成中...');

    try {
        // 加载模块提示词
        let prompt = state.prompts[`module-${currentAiModuleId}`] || 
                     state.defaultPrompts[`module-${currentAiModuleId}`] || '';
        
        // 替换变量
        const char = state.currentCharacter;
        prompt = prompt
            .replace(/\{\{user_input\}\}/g, userInput)
            .replace(/\{\{user_relationship\}\}/g, char.userRelationship || '')
            .replace(/\{\{#if user_relationship_injection_enabled\}\}([\s\S]*?)\{\{\/if\}\}/g, 
                char.injectRelationship ? '$1' : '')
            .replace(/\{\{basic_info\}\}/g, char.modules['basic-info'] || '')
            .replace(/\{\{personality\}\}/g, char.modules['personality'] || '')
            .replace(/\{\{background\}\}/g, char.modules['background'] || '')
            .replace(/\{\{thinking_pattern\}\}/g, char.modules['thinking-pattern'] || '')
            .replace(/\{\{existing_info\}\}/g, char.modules[currentAiModuleId] || '');

        // 如果没有提示词，使用简单默认
        if (!prompt.trim()) {
            const module = MODULE_CONFIG.find(m => m.id === currentAiModuleId);
            prompt = `请为角色生成${module?.name || '内容'}。用户需求：${userInput}
${char.injectRelationship && char.userRelationship ? `用户与角色的关系：${char.userRelationship}` : ''}
直接输出内容，不要任何开场白或解释。`;
        }

        const result = await callAI(prompt);
        $('#ai-output').value = result;
        showToast('生成完成', 'success');
    } catch (error) {
        showToast('生成失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== 预览与导出 ====================
function initPreviewModal() {
    $('#close-preview').addEventListener('click', () => {
        $('#preview-modal').classList.add('hidden');
    });

    $('#export-format').addEventListener('change', updatePreview);

    $('#btn-copy-export').addEventListener('click', () => {
        navigator.clipboard.writeText($('#export-preview').value);
        showToast('已复制到剪贴板', 'success');
    });

    $('#btn-download-export').addEventListener('click', downloadExport);
}

function openPreviewModal() {
    $('#preview-modal').classList.remove('hidden');
    updatePreview();
}

function updatePreview() {
    const format = $('#export-format').value;
    const char = state.currentCharacter;
    let output = '';

    if (format === 'yaml') {
        output = generateYAML(char);
    } else if (format === 'json') {
        output = JSON.stringify(char, null, 2);
    } else {
        output = generateText(char);
    }

    $('#export-preview').value = output;
}

function generateYAML(char) {
    let yaml = '';
    
    if (char.characterName) yaml += `name: "${char.characterName}"\n`;
    if (char.workName) yaml += `work: "${char.workName}"\n`;
    if (char.userRelationship) yaml += `user_relationship: "${char.userRelationship}"\n`;
    
    yaml += '\n';
    
    MODULE_CONFIG.forEach(module => {
        const content = char.modules[module.id];
        if (content) {
            yaml += `${module.id}: |\n`;
            content.split('\n').forEach(line => {
                yaml += `  ${line}\n`;
            });
            yaml += '\n';
        }
    });

    return yaml;
}

function generateText(char) {
    let text = '';
    let index = 1;

    if (char.characterName) text += `角色名称：${char.characterName}\n`;
    if (char.workName) text += `所属作品：${char.workName}\n`;
    if (char.userRelationship) text += `与用户关系：${char.userRelationship}\n`;
    
    text += '\n';

    MODULE_CONFIG.forEach(module => {
        const content = char.modules[module.id];
        if (content) {
            text += `${toChineseNumber(index)}、${module.name}\n`;
            text += `${content}\n\n`;
            index++;
        }
    });

    return text;
}

function toChineseNumber(num) {
    const numbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                     '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
    return numbers[num] || num.toString();
}

function downloadExport() {
    const format = $('#export-format').value;
    const content = $('#export-preview').value;
    const char = state.currentCharacter;
    const name = char.characterName || '未命名角色';
    
    let filename, type;
    if (format === 'json') {
        filename = `${name}.json`;
        type = 'application/json';
    } else {
        filename = `${name}.txt`;
        type = 'text/plain';
    }

    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('文件已下载', 'success');
}

// ==================== 提示词管理 ====================
async function loadDefaultPrompts() {
    const promptFiles = [
        'fanwork-generate',
        ...MODULE_CONFIG.map(m => `module-${m.id}`),
        'module-custom'
    ];

    for (const name of promptFiles) {
        try {
            const response = await fetch(`prompts/${name}.txt`);
            if (response.ok) {
                const content = await response.text();
                state.defaultPrompts[name] = content;
            }
        } catch (e) {
            console.warn(`无法加载提示词: ${name}`);
        }
    }
    
    save(STORAGE_KEYS.DEFAULT_PROMPTS, state.defaultPrompts);
}

function initPromptManager() {
    const select = $('#prompt-module-select');
    
    // 填充选项
    MODULE_CONFIG.forEach(module => {
        const option = document.createElement('option');
        option.value = `module-${module.id}`;
        option.textContent = module.name;
        select.appendChild(option);
    });

    // 切换模块时加载提示词
    select.addEventListener('change', () => {
        const key = select.value;
        const content = state.prompts[key] || state.defaultPrompts[key] || '';
        $('#prompt-content').value = content;
    });

    // 初始加载
    const initialKey = select.value;
    $('#prompt-content').value = state.prompts[initialKey] || state.defaultPrompts[initialKey] || '';

    // 保存提示词
    $('#btn-save-prompt').addEventListener('click', () => {
        const key = select.value;
        state.prompts[key] = $('#prompt-content').value;
        save(STORAGE_KEYS.CUSTOM_PROMPTS, state.prompts);
        showToast('提示词已保存', 'success');
    });

    // 恢复默认
    $('#btn-reset-prompt').addEventListener('click', () => {
        const key = select.value;
        const defaultContent = state.defaultPrompts[key] || '';
        $('#prompt-content').value = defaultContent;
        delete state.prompts[key];
        save(STORAGE_KEYS.CUSTOM_PROMPTS, state.prompts);
        showToast('已恢复默认提示词', 'success');
    });
}

// ==================== 数据管理 ====================
function initDataManagement() {
    $('#btn-export-data').addEventListener('click', () => {
        const data = {
            api: state.api,
            currentCharacter: state.currentCharacter,
            savedCharacters: load(STORAGE_KEYS.SAVED_CHARACTERS, []),
            customPrompts: state.prompts
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-character-generator-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('数据已导出', 'success');
    });

    $('#btn-import-data').addEventListener('click', () => {
        $('#import-file').click();
    });

    $('#import-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.api) {
                state.api = data.api;
                save(STORAGE_KEYS.API_CONFIG, state.api);
            }
            if (data.currentCharacter) {
                state.currentCharacter = data.currentCharacter;
                save(STORAGE_KEYS.CURRENT_CHARACTER, state.currentCharacter);
            }
            if (data.savedCharacters) {
                save(STORAGE_KEYS.SAVED_CHARACTERS, data.savedCharacters);
            }
            if (data.customPrompts) {
                state.prompts = data.customPrompts;
                save(STORAGE_KEYS.CUSTOM_PROMPTS, state.prompts);
            }

            showToast('数据已导入，刷新页面生效', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            showToast('导入失败: 无效的文件格式', 'error');
        }
        
        e.target.value = '';
    });
}

// ==================== 角色存档 ====================
function saveCharacterToArchive() {
    const char = state.currentCharacter;
    const name = char.modules['basic-info']?.match(/姓名[：:]\s*(.+)/)?.[1] || 
                 char.characterName || 
                 '未命名角色';
    
    const savedCharacters = load(STORAGE_KEYS.SAVED_CHARACTERS, []);
    
    const archiveItem = {
        id: Date.now().toString(),
        name: name,
        type: char.type,
        workName: char.workName,
        createdAt: new Date().toISOString(),
        data: { ...char }
    };
    
    savedCharacters.unshift(archiveItem);
    save(STORAGE_KEYS.SAVED_CHARACTERS, savedCharacters);
    
    showToast(`角色 "${name}" 已保存`, 'success');
    renderArchiveList();
}

function initArchive() {
    renderArchiveList();
}

function renderArchiveList() {
    const list = $('#archive-list');
    const savedCharacters = load(STORAGE_KEYS.SAVED_CHARACTERS, []);

    if (savedCharacters.length === 0) {
        list.innerHTML = '<p class="empty-hint">暂无保存的角色</p>';
        return;
    }

    list.innerHTML = savedCharacters.map(char => `
        <div class="archive-item" data-id="${char.id}">
            <div class="archive-item-info">
                <h4>${char.name}</h4>
                <p>${char.type === 'fanwork' ? `同人 - ${char.workName}` : '原创'} | 
                   ${new Date(char.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="archive-item-actions">
                <button class="btn btn-small" onclick="loadCharacter('${char.id}')">加载</button>
                <button class="btn btn-small" onclick="deleteCharacter('${char.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

window.loadCharacter = function(id) {
    const savedCharacters = load(STORAGE_KEYS.SAVED_CHARACTERS, []);
    const char = savedCharacters.find(c => c.id === id);
    
    if (char) {
        state.currentCharacter = char.data;
        save(STORAGE_KEYS.CURRENT_CHARACTER, state.currentCharacter);
        fillExistingData();
        
        // 切换到编辑页
        $$('.nav-btn').forEach(b => b.classList.remove('active'));
        $('.nav-btn[data-page="editor"]').classList.add('active');
        $$('.page').forEach(p => p.classList.remove('active'));
        $('#page-editor').classList.add('active');
        
        showToast('角色已加载', 'success');
    }
};

window.deleteCharacter = function(id) {
    if (!confirm('确定要删除这个角色吗？')) return;
    
    let savedCharacters = load(STORAGE_KEYS.SAVED_CHARACTERS, []);
    savedCharacters = savedCharacters.filter(c => c.id !== id);
    save(STORAGE_KEYS.SAVED_CHARACTERS, savedCharacters);
    
    renderArchiveList();
    showToast('角色已删除', 'success');
};

// ==================== 数据持久化 ====================
function saveCurrentCharacter() {
    save(STORAGE_KEYS.CURRENT_CHARACTER, state.currentCharacter);
}

function fillExistingData() {
    const char = state.currentCharacter;
    
    // 角色类型
    const typeRadio = $(`input[name="character-type"][value="${char.type}"]`);
    if (typeRadio) typeRadio.checked = true;
    $('#fanwork-inputs').classList.toggle('hidden', char.type !== 'fanwork');
    
    // 同人信息
    $('#work-name').value = char.workName || '';
    $('#character-name').value = char.characterName || '';
    
    // 用户关系
    $('#user-relationship').value = char.userRelationship || '';
    $('#inject-relationship').checked = char.injectRelationship !== false;
    
    // 高亮预设按钮
    $$('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === char.userRelationship);
    });
    
    // 模块内容
    MODULE_CONFIG.forEach(module => {
        const textarea = $(`.module-textarea[data-module-id="${module.id}"]`);
        if (textarea && char.modules[module.id]) {
            textarea.value = char.modules[module.id];
        }
    });
}
