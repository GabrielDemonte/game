/**
 * ============================================================================
 * ASTRAMON: ORIGENS - RPG CLÁSSICO DE CAPTURA DE CRIATURAS (16-BIT RETRÔ)
 * Código 100% original, modular e autônomo.
 * ============================================================================
 */

// ============================================================================
// 1. GERENCIADOR DE ÁUDIO (WEB AUDIO API - CHIPTUNE RETRÔ)
// ============================================================================
const AudioManager = {
    ctx: null,
    muted: false,
    currentTrack: null,
    bgmTimer: null,
    stepCounter: 0,

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        const savedMute = localStorage.getItem('astramon_mute');
        if (savedMute !== null) {
            this.muted = savedMute === 'true';
            this.updateMuteIcon();
        }
    },

    toggleMute() {
        this.init();
        this.muted = !this.muted;
        localStorage.setItem('astramon_mute', this.muted);
        this.updateMuteIcon();
        if (this.muted) {
            this.stopBGM();
        } else if (this.currentTrack) {
            this.playBGM(this.currentTrack, true);
        }
        return this.muted;
    },

    updateMuteIcon() {
        const btn = document.getElementById('btnSoundToggle');
        if (btn) btn.textContent = this.muted ? '🔇' : '🔊';
    },

    // Sintetizador de tons individuais
    playTone(freq, type = 'square', duration = 0.1, gainVal = 0.12, decay = true) {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            if (decay) {
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            }
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio context pode estar bloqueado antes de interação do usuário
        }
    },

    // Sintetizador de ruído branco para ataques/explosões
    playNoise(duration = 0.15, gainVal = 0.15) {
        if (this.muted || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            noise.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        } catch (e) {}
    },

    // Efeitos Sonoros Originais (SFX)
    playSFX(name) {
        this.init();
        if (this.muted) return;

        switch (name) {
            case 'select':
                this.playTone(660, 'square', 0.05, 0.08);
                break;
            case 'confirm':
                this.playTone(523.25, 'triangle', 0.08, 0.12);
                setTimeout(() => this.playTone(659.25, 'square', 0.12, 0.1), 70);
                break;
            case 'cancel':
                this.playTone(330, 'square', 0.08, 0.09);
                setTimeout(() => this.playTone(260, 'square', 0.1, 0.09), 60);
                break;
            case 'bump':
                this.playTone(130, 'triangle', 0.08, 0.15);
                break;
            case 'hit':
                this.playNoise(0.12, 0.18);
                this.playTone(180, 'sawtooth', 0.12, 0.12);
                break;
            case 'super_effective':
                this.playNoise(0.2, 0.22);
                this.playTone(440, 'sawtooth', 0.15, 0.15);
                setTimeout(() => this.playTone(660, 'sawtooth', 0.18, 0.15), 100);
                break;
            case 'crit':
                this.playTone(880, 'square', 0.1, 0.12);
                setTimeout(() => this.playNoise(0.18, 0.2), 60);
                break;
            case 'faint':
                this.playTone(392, 'sawtooth', 0.15, 0.12);
                setTimeout(() => this.playTone(311, 'sawtooth', 0.18, 0.12), 120);
                setTimeout(() => this.playTone(220, 'sawtooth', 0.3, 0.15), 260);
                break;
            case 'ball_throw':
                this.playTone(400, 'sine', 0.06, 0.1);
                setTimeout(() => this.playTone(600, 'sine', 0.08, 0.1), 50);
                setTimeout(() => this.playTone(800, 'sine', 0.1, 0.1), 100);
                break;
            case 'ball_wobble':
                this.playTone(493.88, 'triangle', 0.08, 0.12);
                setTimeout(() => this.playTone(523.25, 'triangle', 0.08, 0.12), 80);
                break;
            case 'catch_success':
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
                    setTimeout(() => this.playTone(freq, 'square', 0.15, 0.12), idx * 120);
                });
                break;
            case 'level_up':
                const lvlNotes = [440, 554.37, 659.25, 880, 783.99, 880];
                lvlNotes.forEach((f, idx) => {
                    setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.14), idx * 90);
                });
                break;
            case 'heal':
                const healNotes = [392, 440, 493.88, 587.33, 659.25, 783.99];
                healNotes.forEach((f, idx) => {
                    setTimeout(() => this.playTone(f, 'sine', 0.18, 0.15), idx * 75);
                });
                break;
            case 'text':
                this.playTone(800 + Math.random() * 200, 'sine', 0.03, 0.03);
                break;
        }
    },

    // Música de fundo procedural em chiptune (sem depender de áudios externos protegidos)
    playBGM(trackName, forceRestart = false) {
        this.init();
        if (this.currentTrack === trackName && !forceRestart) return;
        this.currentTrack = trackName;
        this.stopBGM(false);
        if (this.muted) return;

        // Padrões de melodias para cada ambiente
        const tracks = {
            town: {
                tempo: 280,
                scale: [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66],
                bass: [130.81, 130.81, 164.81, 174.61]
            },
            route: {
                tempo: 190,
                scale: [329.63, 392.00, 440.00, 493.88, 587.33, 523.25, 440.00, 392.00, 329.63, 392.00, 493.88, 587.33],
                bass: [164.81, 196.00, 220.00, 196.00]
            },
            forest: {
                tempo: 240,
                scale: [220.00, 261.63, 329.63, 392.00, 329.63, 293.66, 261.63, 220.00, 196.00, 220.00],
                bass: [110.00, 130.81, 110.00, 98.00]
            },
            cave: {
                tempo: 320,
                scale: [164.81, 174.61, 220.00, 207.65, 174.61, 164.81, 138.59, 146.83],
                bass: [82.41, 87.31, 110.00, 73.42]
            },
            battle: {
                tempo: 135,
                scale: [440.00, 440.00, 523.25, 659.25, 587.33, 523.25, 493.88, 440.00, 392.00, 440.00, 523.25, 659.25],
                bass: [110.00, 110.00, 130.81, 146.83, 110.00, 110.00, 164.81, 146.83]
            },
            boss: {
                tempo: 120,
                scale: [220.00, 233.08, 220.00, 261.63, 293.66, 277.18, 261.63, 220.00, 329.63, 311.13, 293.66, 261.63],
                bass: [55.00, 58.27, 55.00, 65.41]
            },
            victory: {
                tempo: 160,
                scale: [523.25, 523.25, 523.25, 523.25, 659.25, 783.99, 1046.50],
                bass: [261.63, 329.63, 392.00, 523.25]
            }
        };

        const config = tracks[trackName] || tracks.town;
        this.stepCounter = 0;

        this.bgmTimer = setInterval(() => {
            if (this.muted) return;
            const noteIndex = this.stepCounter % config.scale.length;
            const bassIndex = Math.floor(this.stepCounter / 2) % config.bass.length;

            // Melodia líder (Onda Quadrada com timbre retrô)
            this.playTone(config.scale[noteIndex], 'square', config.tempo / 1000 * 0.7, 0.035, true);

            // Linha de baixo (Onda Triangular profunda)
            if (this.stepCounter % 2 === 0) {
                this.playTone(config.bass[bassIndex], 'triangle', config.tempo / 1000 * 1.4, 0.06, true);
            }

            // Batida leve em batalhas
            if ((trackName === 'battle' || trackName === 'boss') && this.stepCounter % 2 === 1) {
                this.playNoise(0.04, 0.04);
            }

            this.stepCounter++;
        }, config.tempo);
    },

    stopBGM(clearCurrent = true) {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        if (clearCurrent) this.currentTrack = null;
    }
};

// ============================================================================
// 2. REGISTRO DE DADOS (ELEMENTOS, 22 MONSTROS, 32 GOLPES, ITENS)
// ============================================================================
const DataRegistry = {
    // Tipos Elementais
    Types: {
        FOGO: 'fogo',
        AGUA: 'agua',
        PLANTA: 'planta',
        ELETRICO: 'eletrico',
        PEDRA: 'pedra',
        VENTO: 'vento',
        GELO: 'gelo',
        SOMBRA: 'sombra',
        LUZ: 'luz'
    },

    // Tabela de Efetividade (Multiplicador de dano atacante -> defensor)
    // 2.0: Super Efetivo | 0.5: Pouco Efetivo | 1.0: Normal
    TypeChart: {
        fogo:     { planta: 2.0, gelo: 2.0, agua: 0.5, pedra: 0.5, fogo: 0.5 },
        agua:     { fogo: 2.0, pedra: 2.0, planta: 0.5, agua: 0.5, eletrico: 1.0 },
        planta:   { agua: 2.0, pedra: 2.0, fogo: 0.5, vento: 0.5, planta: 0.5 },
        eletrico: { agua: 2.0, vento: 2.0, pedra: 0.5, planta: 0.5, eletrico: 0.5 },
        pedra:    { fogo: 2.0, vento: 2.0, gelo: 2.0, agua: 0.5, planta: 0.5 },
        vento:    { planta: 2.0, pedra: 0.5, eletrico: 0.5, gelo: 1.0 },
        gelo:     { planta: 2.0, vento: 2.0, fogo: 0.5, agua: 0.5, gelo: 0.5 },
        sombra:   { luz: 2.0, sombra: 0.5 },
        luz:      { sombra: 2.0, luz: 0.5 }
    },

    getTypeMultiplier(attackType, defenderType) {
        if (!attackType || !defenderType) return 1.0;
        const sub = this.TypeChart[attackType];
        if (sub && sub[defenderType] !== undefined) {
            return sub[defenderType];
        }
        return 1.0;
    },

    // 32 Habilidades Originais
    Moves: {
        investida: { id: 'investida', name: 'Investida', type: 'pedra', power: 40, acc: 100, maxPP: 35, desc: 'Ataque corporal com o próprio peso.' },
        brasa: { id: 'brasa', name: 'Brasa', type: 'fogo', power: 40, acc: 100, maxPP: 25, desc: 'Lança pequenas faíscas incandescentes.' },
        chama_viva: { id: 'chama_viva', name: 'Chama Viva', type: 'fogo', power: 65, acc: 95, maxPP: 20, desc: 'Rajada ardente com chamas puras.' },
        meteoro_igneo: { id: 'meteoro_igneo', name: 'Meteoro Ígneo', type: 'fogo', power: 90, acc: 90, maxPP: 10, desc: 'Invoca uma rocha em chamas do céu.' },

        jato_dagua: { id: 'jato_dagua', name: 'Jato d\'Água', type: 'agua', power: 40, acc: 100, maxPP: 25, desc: 'Disparo de alta pressão aquática.' },
        borbulha: { id: 'borbulha', name: 'Borbulha', type: 'agua', power: 65, acc: 95, maxPP: 20, desc: 'Esferas d\'água que colidem com força.' },
        hidro_mare: { id: 'hidro_mare', name: 'Hidromaré', type: 'agua', power: 90, acc: 90, maxPP: 10, desc: 'Uma onda violenta arrasta o inimigo.' },

        chicote_cipó: { id: 'chicote_cipó', name: 'Chicote Cipó', type: 'planta', power: 45, acc: 100, maxPP: 25, desc: 'Golpeia com tentáculos vegetais.' },
        folha_navalha: { id: 'folha_navalha', name: 'Folha Navalha', type: 'planta', power: 65, acc: 95, maxPP: 20, desc: 'Folhas afiadas lançadas como shurikens.' },
        furor_da_mata: { id: 'furor_da_mata', name: 'Furor da Mata', type: 'planta', power: 90, acc: 90, maxPP: 10, desc: 'Energia natural ancestral explode.' },

        faísca: { id: 'faísca', name: 'Faísca', type: 'eletrico', power: 40, acc: 100, maxPP: 30, desc: 'Pequena descarga estática.' },
        eletro_choque: { id: 'eletro_choque', name: 'Eletro-Choque', type: 'eletrico', power: 65, acc: 95, maxPP: 20, desc: 'Corrente contínua de alta voltagem.' },
        relampago: { id: 'relampago', name: 'Relâmpago', type: 'eletrico', power: 90, acc: 85, maxPP: 10, desc: 'Raio fulminante vindo das nuvens.' },

        pedregulho: { id: 'pedregulho', name: 'Pedregulho', type: 'pedra', power: 50, acc: 90, maxPP: 25, desc: 'Lança uma pedra pontiaguda.' },
        desmoronar: { id: 'desmoronar', name: 'Desmoronar', type: 'pedra', power: 75, acc: 90, maxPP: 15, desc: 'Provoca uma avalanche de pedras.' },
        terremoto: { id: 'terremoto', name: 'Terremoto', type: 'pedra', power: 100, acc: 90, maxPP: 5, desc: 'Fissura o solo com tremor violento.' },

        brisa_cortante: { id: 'brisa_cortante', name: 'Brisa Cortante', type: 'vento', power: 45, acc: 100, maxPP: 25, desc: 'Vento cortante de alta velocidade.' },
        tufao: { id: 'tufao', name: 'Tufão', type: 'vento', power: 70, acc: 95, maxPP: 15, desc: 'Redemoinho engole o oponente.' },
        vendaval_celeste: { id: 'vendaval_celeste', name: 'Vendaval', type: 'vento', power: 90, acc: 90, maxPP: 10, desc: 'Corrente tempestuosa devastadora.' },

        estilhaco_gelo: { id: 'estilhaco_gelo', name: 'Estilhaço Frio', type: 'gelo', power: 45, acc: 100, maxPP: 25, desc: 'Projetil afiado de gelo fino.' },
        vento_polar: { id: 'vento_polar', name: 'Vento Polar', type: 'gelo', power: 65, acc: 95, maxPP: 20, desc: 'Rajada congelante subzero.' },
        nevasca_eterna: { id: 'nevasca_eterna', name: 'Nevasca', type: 'gelo', power: 95, acc: 85, maxPP: 10, desc: 'Tempestade de neve esmagadora.' },

        garra_sombria: { id: 'garra_sombria', name: 'Garra Sombria', type: 'sombra', power: 50, acc: 100, maxPP: 25, desc: 'Corte feito com névoa escura sólida.' },
        pulso_noturno: { id: 'pulso_noturno', name: 'Pulso Noturno', type: 'sombra', power: 75, acc: 95, maxPP: 15, desc: 'Onda de escuridão profunda.' },
        abismo_oculto: { id: 'abismo_oculto', name: 'Abismo Oculto', type: 'sombra', power: 95, acc: 90, maxPP: 10, desc: 'Drena a luz e energia do alvo.' },

        centelha_luz: { id: 'centelha_luz', name: 'Centelha Luz', type: 'luz', power: 45, acc: 100, maxPP: 25, desc: 'Feixe límpido de energia luminosa.' },
        raio_aurora: { id: 'raio_aurora', name: 'Raio Aurora', type: 'luz', power: 75, acc: 95, maxPP: 15, desc: 'Arco de luz prismática brilhante.' },
        prisma_solar: { id: 'prisma_solar', name: 'Prisma Solar', type: 'luz', power: 95, acc: 90, maxPP: 10, desc: 'Laser de luz celestial concentrada.' },

        // Golpe Lendário
        cometa_astral: { id: 'cometa_astral', name: 'Cometa Astral', type: 'luz', power: 110, acc: 95, maxPP: 5, desc: 'O poder cósmico primordial do universo.' }
    },

    // 22 Criaturas Originais
    Creatures: {
        1: {
            id: 1, name: 'Pyrolim', type: 'fogo',
            hp: 42, atk: 52, def: 40, spd: 55,
            catchRate: 45, expYield: 62,
            evolveLevel: 16, evolvesTo: 2,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 5, move: 'brasa' },
                { lv: 12, move: 'chama_viva' },
                { lv: 25, move: 'meteoro_igneo' }
            ],
            color: '#ef4444', accent: '#f59e0b', shape: 'lizard'
        },
        2: {
            id: 2, name: 'Ignorox', type: 'fogo',
            hp: 60, atk: 70, def: 58, spd: 72,
            catchRate: 30, expYield: 140,
            evolveLevel: 32, evolvesTo: 3,
            learnset: [
                { lv: 1, move: 'brasa' },
                { lv: 12, move: 'chama_viva' },
                { lv: 22, move: 'pedregulho' },
                { lv: 30, move: 'meteoro_igneo' }
            ],
            color: '#dc2626', accent: '#fbbf24', shape: 'spiky_lizard'
        },
        3: {
            id: 3, name: 'Draconite', type: 'fogo',
            hp: 85, atk: 95, def: 80, spd: 90,
            catchRate: 15, expYield: 220,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'chama_viva' },
                { lv: 32, move: 'desmoronar' },
                { lv: 40, move: 'meteoro_igneo' },
                { lv: 48, move: 'terremoto' }
            ],
            color: '#b91c1c', accent: '#f97316', shape: 'dragon'
        },
        4: {
            id: 4, name: 'Hidrino', type: 'agua',
            hp: 46, atk: 45, def: 55, spd: 44,
            catchRate: 45, expYield: 62,
            evolveLevel: 16, evolvesTo: 5,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 5, move: 'jato_dagua' },
                { lv: 12, move: 'borbulha' },
                { lv: 25, move: 'hidro_mare' }
            ],
            color: '#3b82f6', accent: '#60a5fa', shape: 'turtle'
        },
        5: {
            id: 5, name: 'Quelódia', type: 'agua',
            hp: 64, atk: 62, def: 78, spd: 58,
            catchRate: 30, expYield: 140,
            evolveLevel: 32, evolvesTo: 6,
            learnset: [
                { lv: 1, move: 'jato_dagua' },
                { lv: 12, move: 'borbulha' },
                { lv: 20, move: 'estilhaco_gelo' },
                { lv: 30, move: 'hidro_mare' }
            ],
            color: '#2563eb', accent: '#93c5fd', shape: 'armored_turtle'
        },
        6: {
            id: 6, name: 'Maremoto', type: 'agua',
            hp: 92, atk: 82, def: 100, spd: 74,
            catchRate: 15, expYield: 220,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'borbulha' },
                { lv: 32, move: 'vento_polar' },
                { lv: 40, move: 'hidro_mare' },
                { lv: 48, move: 'nevasca_eterna' }
            ],
            color: '#1d4ed8', accent: '#38bdf8', shape: 'sea_beast'
        },
        7: {
            id: 7, name: 'Brotin', type: 'planta',
            hp: 45, atk: 48, def: 48, spd: 49,
            catchRate: 45, expYield: 62,
            evolveLevel: 16, evolvesTo: 8,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 5, move: 'chicote_cipó' },
                { lv: 12, move: 'folha_navalha' },
                { lv: 25, move: 'furor_da_mata' }
            ],
            color: '#10b981', accent: '#34d399', shape: 'sprout'
        },
        8: {
            id: 8, name: 'Florantis', type: 'planta',
            hp: 62, atk: 75, def: 60, spd: 73,
            catchRate: 30, expYield: 140,
            evolveLevel: 32, evolvesTo: 9,
            learnset: [
                { lv: 1, move: 'chicote_cipó' },
                { lv: 12, move: 'folha_navalha' },
                { lv: 22, move: 'brisa_cortante' },
                { lv: 30, move: 'furor_da_mata' }
            ],
            color: '#059669', accent: '#6ee7b7', shape: 'mantis'
        },
        9: {
            id: 9, name: 'Selvadonte', type: 'planta',
            hp: 90, atk: 92, def: 88, spd: 80,
            catchRate: 15, expYield: 220,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'folha_navalha' },
                { lv: 32, move: 'tufao' },
                { lv: 40, move: 'furor_da_mata' },
                { lv: 48, move: 'terremoto' }
            ],
            color: '#047857', accent: '#a7f3d0', shape: 'forest_stag'
        },
        10: {
            id: 10, name: 'Centelhão', type: 'eletrico',
            hp: 38, atk: 55, def: 35, spd: 72,
            catchRate: 50, expYield: 58,
            evolveLevel: 22, evolvesTo: 11,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 4, move: 'faísca' },
                { lv: 14, move: 'eletro_choque' },
                { lv: 24, move: 'relampago' }
            ],
            color: '#eab308', accent: '#fde047', shape: 'electric_mouse'
        },
        11: {
            id: 11, name: 'Voltíger', type: 'eletrico',
            hp: 75, atk: 90, def: 65, spd: 105,
            catchRate: 20, expYield: 180,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'faísca' },
                { lv: 14, move: 'eletro_choque' },
                { lv: 26, move: 'garra_sombria' },
                { lv: 35, move: 'relampago' }
            ],
            color: '#ca8a04', accent: '#fef08a', shape: 'tiger'
        },
        12: {
            id: 12, name: 'Geodino', type: 'pedra',
            hp: 50, atk: 58, def: 70, spd: 30,
            catchRate: 50, expYield: 60,
            evolveLevel: 25, evolvesTo: 13,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 6, move: 'pedregulho' },
                { lv: 15, move: 'desmoronar' },
                { lv: 26, move: 'terremoto' }
            ],
            color: '#b45309', accent: '#d97706', shape: 'rock_armadillo'
        },
        13: {
            id: 13, name: 'Monolítico', type: 'pedra',
            hp: 85, atk: 88, def: 110, spd: 45,
            catchRate: 20, expYield: 185,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'pedregulho' },
                { lv: 15, move: 'desmoronar' },
                { lv: 28, move: 'chama_viva' },
                { lv: 36, move: 'terremoto' }
            ],
            color: '#78350f', accent: '#b45309', shape: 'golem'
        },
        14: {
            id: 14, name: 'Zefirinho', type: 'vento',
            hp: 40, atk: 45, def: 40, spd: 68,
            catchRate: 50, expYield: 56,
            evolveLevel: 20, evolvesTo: 15,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 5, move: 'brisa_cortante' },
                { lv: 13, move: 'tufao' },
                { lv: 24, move: 'vendaval_celeste' }
            ],
            color: '#06b6d4', accent: '#67e8f9', shape: 'bird'
        },
        15: {
            id: 15, name: 'Tufanás', type: 'vento',
            hp: 72, atk: 85, def: 65, spd: 102,
            catchRate: 20, expYield: 180,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'brisa_cortante' },
                { lv: 13, move: 'tufao' },
                { lv: 25, move: 'centelha_luz' },
                { lv: 34, move: 'vendaval_celeste' }
            ],
            color: '#0891b2', accent: '#a5f3fc', shape: 'hawk'
        },
        16: {
            id: 16, name: 'Nevisco', type: 'gelo',
            hp: 44, atk: 48, def: 46, spd: 60,
            catchRate: 45, expYield: 62,
            evolveLevel: 28, evolvesTo: 17,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 6, move: 'estilhaco_gelo' },
                { lv: 15, move: 'vento_polar' },
                { lv: 28, move: 'nevasca_eterna' }
            ],
            color: '#a5f3fc', accent: '#e0f2fe', shape: 'fox'
        },
        17: {
            id: 17, name: 'Glaciofante', type: 'gelo',
            hp: 95, atk: 85, def: 90, spd: 55,
            catchRate: 20, expYield: 190,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'estilhaco_gelo' },
                { lv: 15, move: 'vento_polar' },
                { lv: 29, move: 'desmoronar' },
                { lv: 38, move: 'nevasca_eterna' }
            ],
            color: '#38bdf8', accent: '#bae6fd', shape: 'mammoth'
        },
        18: {
            id: 18, name: 'Sombrita', type: 'sombra',
            hp: 42, atk: 56, def: 38, spd: 65,
            catchRate: 45, expYield: 64,
            evolveLevel: 26, evolvesTo: 19,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 6, move: 'garra_sombria' },
                { lv: 16, move: 'pulso_noturno' },
                { lv: 27, move: 'abismo_oculto' }
            ],
            color: '#7c3aed', accent: '#a78bfa', shape: 'ghost_cat'
        },
        19: {
            id: 19, name: 'Umbreonix', type: 'sombra',
            hp: 75, atk: 94, def: 70, spd: 96,
            catchRate: 15, expYield: 195,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'garra_sombria' },
                { lv: 16, move: 'pulso_noturno' },
                { lv: 28, move: 'tufao' },
                { lv: 38, move: 'abismo_oculto' }
            ],
            color: '#5b21b6', accent: '#c4b5fd', shape: 'panther'
        },
        20: {
            id: 20, name: 'Luminete', type: 'luz',
            hp: 45, atk: 42, def: 50, spd: 58,
            catchRate: 45, expYield: 64,
            evolveLevel: 26, evolvesTo: 21,
            learnset: [
                { lv: 1, move: 'investida' },
                { lv: 6, move: 'centelha_luz' },
                { lv: 16, move: 'raio_aurora' },
                { lv: 27, move: 'prisma_solar' }
            ],
            color: '#f59e0b', accent: '#fef3c7', shape: 'firefly'
        },
        21: {
            id: 21, name: 'Solarião', type: 'luz',
            hp: 85, atk: 92, def: 78, spd: 88,
            catchRate: 15, expYield: 195,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'centelha_luz' },
                { lv: 16, move: 'raio_aurora' },
                { lv: 28, move: 'chama_viva' },
                { lv: 38, move: 'prisma_solar' }
            ],
            color: '#d97706', accent: '#fde68a', shape: 'lion'
        },
        22: {
            id: 22, name: 'Astraeus', type: 'luz',
            hp: 110, atk: 115, def: 105, spd: 110,
            catchRate: 5, expYield: 280,
            evolveLevel: null,
            learnset: [
                { lv: 1, move: 'raio_aurora' },
                { lv: 1, move: 'pulso_noturno' },
                { lv: 40, move: 'prisma_solar' },
                { lv: 50, move: 'cometa_astral' }
            ],
            color: '#818cf8', accent: '#f43f5e', shape: 'celestial_god'
        }
    },

    // 14 Itens Originais
    Items: {
        cura_simples: { id: 'cura_simples', name: 'CuraSimples', category: 'cura', price: 100, effect: { hp: 30 }, desc: 'Recupera 30 HP de uma criatura.' },
        cura_grande: { id: 'cura_grande', name: 'CuraGrande', category: 'cura', price: 300, effect: { hp: 80 }, desc: 'Recupera 80 HP de uma criatura.' },
        cura_total: { id: 'cura_total', name: 'CuraTotal', category: 'cura', price: 800, effect: { hp: 999 }, desc: 'Recupera todo o HP da criatura.' },
        reviver_pó: { id: 'reviver_pó', name: 'Pó Vital', category: 'cura', price: 500, effect: { revive: 0.5 }, desc: 'Revive uma criatura com 50% de HP.' },

        orbe_captura: { id: 'orbe_captura', name: 'Orbe Captura', category: 'captura', price: 150, rate: 1.0, desc: 'Dispositivo esférico para conter monstros.' },
        super_orbe: { id: 'super_orbe', name: 'Super Orbe', category: 'captura', price: 400, rate: 1.8, desc: 'Orbe aprimorado com maior taxa de sucesso.' },
        ultra_orbe: { id: 'ultra_orbe', name: 'Ultra Orbe', category: 'captura', price: 900, rate: 2.6, desc: 'Orbe de alta tecnologia e grande eficácia.' },
        orbe_astral: { id: 'orbe_astral', name: 'Orbe Astral', category: 'captura', price: 0, rate: 99.0, desc: 'Orbe lendário que nunca falha uma captura.' },

        elixir_pp: { id: 'elixir_pp', name: 'Elixir Astral', category: 'batalha', price: 350, effect: { pp: 10 }, desc: 'Restaura 10 PP de todos os golpes.' },
        ataque_x: { id: 'ataque_x', name: 'Ataque+', category: 'batalha', price: 250, effect: { buffAtk: 1.5 }, desc: 'Aumenta o ataque temporariamente na batalha.' },
        defesa_x: { id: 'defesa_x', name: 'Defesa+', category: 'batalha', price: 250, effect: { buffDef: 1.5 }, desc: 'Aumenta a defesa temporariamente na batalha.' },

        chave_caverna: { id: 'chave_caverna', name: 'Chave Eco', category: 'importante', price: 0, desc: 'Abre o portal para as profundezas da Caverna Eco.' },
        insignia_rocha: { id: 'insignia_rocha', name: 'Insígnia Rocha', category: 'importante', price: 0, desc: 'Prova de que superou o Guardião Bruno.' },
        prisma_astral: { id: 'prisma_astral', name: 'Prisma Cósmico', category: 'importante', price: 0, desc: 'Artefato antigo para invocar Astraeus no Cume Astral.' }
    }
};

// ============================================================================
// 3. FÁBRICA DE CRIATURAS (INSTÂNCIAS DE COMBATE E PROGRESSÃO)
// ============================================================================
class MonsterInstance {
    constructor(speciesId, level = 5) {
        const base = DataRegistry.Creatures[speciesId];
        this.speciesId = speciesId;
        this.name = base.name;
        this.type = base.type;
        this.level = level;
        this.exp = Math.pow(level, 3);
        this.expNext = Math.pow(level + 1, 3);

        // Cálculo de Atributos baseado em nível
        this.maxHp = Math.floor((base.hp * 2 * level) / 100) + level + 10;
        this.currentHp = this.maxHp;
        this.atk = Math.floor((base.atk * 2 * level) / 100) + 5;
        this.def = Math.floor((base.def * 2 * level) / 100) + 5;
        this.spd = Math.floor((base.spd * 2 * level) / 100) + 5;

        // Montar Golpes aprendidos até este nível
        this.moves = [];
        base.learnset.forEach(entry => {
            if (entry.lv <= level) {
                const moveData = DataRegistry.Moves[entry.move];
                if (moveData && !this.moves.some(m => m.id === moveData.id)) {
                    if (this.moves.length >= 4) this.moves.shift();
                    this.moves.push({
                        ...moveData,
                        currentPP: moveData.maxPP
                    });
                }
            }
        });
        if (this.moves.length === 0) {
            this.moves.push({ ...DataRegistry.Moves.investida, currentPP: 35 });
        }
    }

    recalcStats() {
        const base = DataRegistry.Creatures[this.speciesId];
        const oldMaxHp = this.maxHp;
        this.maxHp = Math.floor((base.hp * 2 * this.level) / 100) + this.level + 10;
        this.currentHp = Math.min(this.maxHp, this.currentHp + (this.maxHp - oldMaxHp));
        this.atk = Math.floor((base.atk * 2 * this.level) / 100) + 5;
        this.def = Math.floor((base.def * 2 * this.level) / 100) + 5;
        this.spd = Math.floor((base.spd * 2 * this.level) / 100) + 5;
        this.expNext = Math.pow(this.level + 1, 3);
    }

    gainExp(amount) {
        this.exp += amount;
        const levelUps = [];
        while (this.exp >= this.expNext && this.level < 100) {
            this.level++;
            this.recalcStats();
            levelUps.push(this.level);

            // Verificar novas habilidades
            const base = DataRegistry.Creatures[this.speciesId];
            base.learnset.forEach(entry => {
                if (entry.lv === this.level) {
                    const moveData = DataRegistry.Moves[entry.move];
                    if (moveData && !this.moves.some(m => m.id === moveData.id)) {
                        if (this.moves.length >= 4) this.moves.shift();
                        this.moves.push({ ...moveData, currentPP: moveData.maxPP });
                    }
                }
            });
        }
        return levelUps;
    }

    checkEvolution() {
        const base = DataRegistry.Creatures[this.speciesId];
        if (base.evolveLevel && this.level >= base.evolveLevel && base.evolvesTo) {
            return base.evolvesTo;
        }
        return null;
    }

    evolve(targetSpeciesId) {
        this.speciesId = targetSpeciesId;
        const newBase = DataRegistry.Creatures[targetSpeciesId];
        this.name = newBase.name;
        this.type = newBase.type;
        this.recalcStats();
    }
}

// ============================================================================
// 4. MOTOR DE PIXEL ART PROCEDURAL (TILES, MONSTROS E PERSONAGENS)
// ============================================================================
const PixelArtEngine = {
    // Desenha monstros na tela de batalha com pixel art nítida e efeitos temáticos
    drawMonster(ctx, speciesId, x, y, size = 64, isBack = false, animOffset = 0) {
        const data = DataRegistry.Creatures[speciesId];
        if (!data) return;

        ctx.save();
        ctx.translate(x, y + animOffset);

        const s = size / 32; // Escala proporcional de 32x32 pixels base
        const color = data.color;
        const accent = data.accent;

        // Sombra oval no chão
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(size / 2, size - 4 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Renderização customizada por silhueta
        switch (data.shape) {
            case 'lizard':
            case 'spiky_lizard':
                // Corpo do réptil
                ctx.fillStyle = color;
                ctx.fillRect(8 * s, 12 * s, 16 * s, 14 * s);
                ctx.fillRect(6 * s, 8 * s, 14 * s, 10 * s); // Cabeça
                // Barriga
                ctx.fillStyle = accent;
                ctx.fillRect(10 * s, 14 * s, 10 * s, 10 * s);
                // Cauda com chama
                ctx.fillStyle = color;
                ctx.fillRect(22 * s, 18 * s, 6 * s, 4 * s);
                ctx.fillRect(26 * s, 14 * s, 4 * s, 5 * s);
                // Chama acesa
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(28 * s, 10 * s, 4 * s, 6 * s);
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(29 * s, 12 * s, 2 * s, 3 * s);
                // Olho
                if (!isBack) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(9 * s, 10 * s, 3 * s, 3 * s);
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(10 * s, 11 * s, 2 * s, 2 * s);
                }
                // Patas
                ctx.fillStyle = color;
                ctx.fillRect(8 * s, 24 * s, 4 * s, 5 * s);
                ctx.fillRect(18 * s, 24 * s, 4 * s, 5 * s);
                break;

            case 'dragon':
                // Dragão Draconite
                ctx.fillStyle = color;
                ctx.fillRect(6 * s, 10 * s, 20 * s, 16 * s); // Torso forte
                ctx.fillRect(4 * s, 4 * s, 14 * s, 10 * s); // Cabeça com focinho
                // Asas
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.moveTo(20 * s, 8 * s);
                ctx.lineTo(31 * s, 2 * s);
                ctx.lineTo(26 * s, 16 * s);
                ctx.fill();
                // Chifres
                ctx.fillStyle = '#facc15';
                ctx.fillRect(12 * s, 1 * s, 3 * s, 4 * s);
                ctx.fillRect(16 * s, 2 * s, 3 * s, 4 * s);
                // Olhos de fogo
                if (!isBack) {
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(7 * s, 7 * s, 4 * s, 3 * s);
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(8 * s, 8 * s, 2 * s, 2 * s);
                }
                // Garras
                ctx.fillStyle = '#334155';
                ctx.fillRect(6 * s, 25 * s, 5 * s, 4 * s);
                ctx.fillRect(18 * s, 25 * s, 5 * s, 4 * s);
                break;

            case 'turtle':
            case 'armored_turtle':
            case 'sea_beast':
                // Casco
                ctx.fillStyle = '#0f766e';
                ctx.fillRect(6 * s, 10 * s, 20 * s, 15 * s);
                ctx.fillStyle = '#14b8a6';
                ctx.fillRect(8 * s, 12 * s, 16 * s, 11 * s);
                // Cabeça azul
                ctx.fillStyle = color;
                ctx.fillRect(2 * s, 8 * s, 8 * s, 8 * s);
                if (!isBack) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(4 * s, 10 * s, 3 * s, 3 * s);
                    ctx.fillStyle = '#1e3a8a';
                    ctx.fillRect(5 * s, 11 * s, 2 * s, 2 * s);
                }
                // Patas / Nadadeiras
                ctx.fillStyle = color;
                ctx.fillRect(6 * s, 23 * s, 5 * s, 6 * s);
                ctx.fillRect(18 * s, 23 * s, 5 * s, 6 * s);
                // Cristais de água no casco
                ctx.fillStyle = accent;
                ctx.fillRect(12 * s, 8 * s, 4 * s, 4 * s);
                break;

            case 'sprout':
            case 'mantis':
            case 'forest_stag':
                // Corpo verde planta
                ctx.fillStyle = color;
                ctx.fillRect(8 * s, 12 * s, 16 * s, 14 * s);
                // Folhas na cabeça
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.ellipse(16 * s, 6 * s, 6 * s, 3 * s, -0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(19 * s, 5 * s, 5 * s, 2 * s, 0.4, 0, Math.PI * 2);
                ctx.fill();
                // Olhos doces
                if (!isBack) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(10 * s, 14 * s, 4 * s, 4 * s);
                    ctx.fillRect(18 * s, 14 * s, 4 * s, 4 * s);
                    ctx.fillStyle = '#064e3b';
                    ctx.fillRect(12 * s, 15 * s, 2 * s, 2 * s);
                    ctx.fillRect(18 * s, 15 * s, 2 * s, 2 * s);
                }
                // Patinhas de madeira
                ctx.fillStyle = '#78350f';
                ctx.fillRect(10 * s, 24 * s, 4 * s, 5 * s);
                ctx.fillRect(18 * s, 24 * s, 4 * s, 5 * s);
                break;

            case 'electric_mouse':
            case 'tiger':
                // Amarelo elétrico
                ctx.fillStyle = color;
                ctx.fillRect(8 * s, 10 * s, 16 * s, 14 * s);
                // Orelhas pontudas
                ctx.fillStyle = color;
                ctx.fillRect(7 * s, 3 * s, 4 * s, 8 * s);
                ctx.fillRect(20 * s, 3 * s, 4 * s, 8 * s);
                ctx.fillStyle = '#000';
                ctx.fillRect(7 * s, 3 * s, 4 * s, 3 * s);
                ctx.fillRect(20 * s, 3 * s, 4 * s, 3 * s);
                // Bochechas elétricas
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(7 * s, 16 * s, 3 * s, 3 * s);
                ctx.fillRect(21 * s, 16 * s, 3 * s, 3 * s);
                // Cauda em raio
                ctx.fillStyle = accent;
                ctx.fillRect(23 * s, 12 * s, 6 * s, 3 * s);
                ctx.fillRect(26 * s, 8 * s, 3 * s, 6 * s);
                ctx.fillRect(28 * s, 5 * s, 4 * s, 4 * s);
                break;

            case 'rock_armadillo':
            case 'golem':
                // Corpo rochoso
                ctx.fillStyle = color;
                ctx.fillRect(6 * s, 8 * s, 20 * s, 18 * s);
                ctx.fillStyle = accent;
                ctx.fillRect(9 * s, 11 * s, 6 * s, 6 * s);
                ctx.fillRect(17 * s, 14 * s, 6 * s, 8 * s);
                // Olhos brilhantes de cristal
                if (!isBack) {
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(10 * s, 12 * s, 3 * s, 2 * s);
                    ctx.fillRect(18 * s, 12 * s, 3 * s, 2 * s);
                }
                break;

            case 'bird':
            case 'hawk':
                // Asas de ave
                ctx.fillStyle = color;
                ctx.fillRect(10 * s, 8 * s, 12 * s, 14 * s);
                // Asas abertas
                ctx.fillStyle = accent;
                ctx.fillRect(2 * s, 10 * s, 8 * s, 6 * s);
                ctx.fillRect(22 * s, 10 * s, 8 * s, 6 * s);
                // Bico
                if (!isBack) {
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(14 * s, 12 * s, 4 * s, 4 * s);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(13 * s, 9 * s, 2 * s, 2 * s);
                }
                break;

            case 'ghost_cat':
            case 'panther':
                // Fumaça fantasmagórica roxa
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(16 * s, 16 * s, 11 * s, 0, Math.PI * 2);
                ctx.fill();
                // Orelhinhas pontudas
                ctx.fillRect(8 * s, 5 * s, 4 * s, 6 * s);
                ctx.fillRect(20 * s, 5 * s, 4 * s, 6 * s);
                // Olhos espectrais brilhantes
                if (!isBack) {
                    ctx.fillStyle = '#fde047';
                    ctx.fillRect(11 * s, 14 * s, 4 * s, 3 * s);
                    ctx.fillRect(18 * s, 14 * s, 4 * s, 3 * s);
                }
                break;

            case 'celestial_god':
                // Astraeus: Criatura estelar cósmica
                ctx.fillStyle = '#4338ca';
                ctx.beginPath();
                ctx.arc(16 * s, 16 * s, 13 * s, 0, Math.PI * 2);
                ctx.fill();
                // Auréola cósmica dourada
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.ellipse(16 * s, 16 * s, 15 * s, 6 * s, 0.4, 0, Math.PI * 2);
                ctx.stroke();
                // Núcleo luminoso
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(16 * s, 16 * s, 5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Asas astrais
                ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
                ctx.fillRect(2 * s, 8 * s, 6 * s, 12 * s);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
                ctx.fillRect(24 * s, 8 * s, 6 * s, 12 * s);
                break;

            default:
                // Silhueta genérica estilizada
                ctx.fillStyle = color;
                ctx.fillRect(8 * s, 8 * s, 16 * s, 18 * s);
                ctx.fillStyle = accent;
                ctx.fillRect(11 * s, 11 * s, 10 * s, 10 * s);
                break;
        }

        ctx.restore();
    },

    // Desenha o jogador em 4 direções com quadros de caminhada
    drawPlayer(ctx, screenX, screenY, dir = 0, frame = 0) {
        // dir: 0=Baixo, 1=Cima, 2=Esquerda, 3=Direita
        const bob = (frame % 2 === 1) ? 1 : 0;
        const legOffset = (frame === 1) ? -2 : (frame === 3) ? 2 : 0;

        ctx.save();
        ctx.translate(screenX, screenY - bob);

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(8, 15, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pernas / Calça azul escuro
        ctx.fillStyle = '#1e293b';
        if (dir === 0 || dir === 1) {
            ctx.fillRect(4 + legOffset, 11, 3, 4);
            ctx.fillRect(9 - legOffset, 11, 3, 4);
        } else {
            ctx.fillRect(6, 11, 4, 4);
        }

        // Tênis vermelho
        ctx.fillStyle = '#ef4444';
        if (dir === 0 || dir === 1) {
            ctx.fillRect(4 + legOffset, 14, 3, 2);
            ctx.fillRect(9 - legOffset, 14, 3, 2);
        } else {
            ctx.fillRect(6, 14, 4, 2);
        }

        // Jaqueta / Corpo vermelho rubi
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(4, 6, 8, 6);

        // Mochila verde nas costas
        if (dir === 1) {
            ctx.fillStyle = '#059669';
            ctx.fillRect(5, 7, 6, 4);
        }

        // Cabeça / Rosto tom de pele
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(4, 2, 8, 5);

        // Olhos
        if (dir === 0) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(5, 4, 2, 2);
            ctx.fillRect(9, 4, 2, 2);
        } else if (dir === 2) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(4, 4, 2, 2);
        } else if (dir === 3) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(10, 4, 2, 2);
        }

        // Boné do treinador (vermelho com aba branca)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(3, 0, 10, 3);
        if (dir === 0) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(5, 2, 6, 2);
        } else if (dir === 2) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(2, 2, 4, 2);
        } else if (dir === 3) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(10, 2, 4, 2);
        }

        ctx.restore();
    },

    // Desenha NPCs variados (Professora, Rival, Curandeiro, Treinadores)
    drawNPC(ctx, screenX, screenY, role = 'npc', dir = 0) {
        ctx.save();
        ctx.translate(screenX, screenY);

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(8, 15, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        let coatColor = '#3b82f6';
        let hairColor = '#78350f';

        if (role === 'prof') {
            coatColor = '#f8fafc'; // Jaleco branco
            hairColor = '#a855f7'; // Cabelo lilás da Profª Althea
        } else if (role === 'rival') {
            coatColor = '#10b981'; // Casaco verde do Rival Leo
            hairColor = '#f59e0b'; // Cabelo loiro
        } else if (role === 'healer') {
            coatColor = '#ec4899'; // Enfermeira rosa
            hairColor = '#f472b6';
        } else if (role === 'boss') {
            coatColor = '#7c3aed'; // Capa roxa do Guardião
            hairColor = '#e2e8f0';
        } else if (role === 'merchant') {
            coatColor = '#ca8a04'; // Vendedor
            hairColor = '#1e293b';
        }

        // Roupa
        ctx.fillStyle = coatColor;
        ctx.fillRect(4, 7, 8, 6);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(5, 12, 6, 4);

        // Rosto
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(5, 3, 6, 5);

        // Cabelo
        ctx.fillStyle = hairColor;
        ctx.fillRect(4, 1, 8, 3);
        ctx.fillRect(3, 2, 2, 4);

        // Olhos
        if (dir === 0) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(6, 5, 1, 1);
            ctx.fillRect(9, 5, 1, 1);
        }

        ctx.restore();
    },

    // Renderizador de Tiles do Mundo
    drawTile(ctx, tileType, x, y, tick = 0) {
        switch (tileType) {
            case 0: // Grama lisa clara
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(x + 3, y + 4, 1, 2);
                ctx.fillRect(x + 11, y + 10, 1, 2);
                break;

            case 1: // Grama alta (onde surgem monstros selvagens)
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#15803d';
                ctx.fillRect(x + 2, y + 1, 3, 14);
                ctx.fillRect(x + 7, y + 3, 3, 12);
                ctx.fillRect(x + 12, y + 2, 3, 13);
                // Animação de vento suave
                const sway = Math.sin(tick * 0.05 + x) * 1;
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x + 3 + sway, y + 2, 2, 3);
                ctx.fillRect(x + 8 + sway, y + 4, 2, 3);
                break;

            case 2: // Caminho de terra / pedra
                ctx.fillStyle = '#e2d9b6';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(x + 2, y + 3, 4, 3);
                ctx.fillRect(x + 9, y + 8, 5, 4);
                ctx.fillStyle = '#b7a884';
                ctx.fillRect(x + 1, y + 14, 14, 2);
                break;

            case 3: // Água com reflexo e ondas animadas
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(x, y, 16, 16);
                const wave = Math.sin(tick * 0.08 + x * 0.2) * 2;
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(x + 2, y + 4 + wave, 6, 2);
                ctx.fillRect(x + 8, y + 11 + wave, 6, 2);
                break;

            case 4: // Parede de casa / Edifício
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#94a3b8';
                ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
                ctx.fillStyle = '#64748b';
                ctx.fillRect(x + 2, y + 14, 12, 2);
                break;

            case 5: // Telhado de casa vermelho
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(x + 1, y + 2, 14, 4);
                ctx.fillRect(x + 1, y + 9, 14, 4);
                break;

            case 6: // Árvore (Copa verde)
                ctx.fillStyle = '#14532d';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#166534';
                ctx.beginPath();
                ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(x + 6, y + 5, 4, 4);
                break;

            case 7: // Tronco de árvore
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(x + 5, y, 6, 16);
                ctx.fillStyle = '#451a03';
                ctx.fillRect(x + 6, y + 4, 4, 8);
                break;

            case 8: // Chão de Caverna
                ctx.fillStyle = '#334155';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(x + 3, y + 5, 4, 3);
                ctx.fillRect(x + 10, y + 9, 3, 4);
                break;

            case 9: // Parede de Caverna / Rocha impenetrável
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(x + 2, y + 2, 12, 12);
                ctx.fillStyle = '#475569';
                ctx.fillRect(x + 4, y + 4, 4, 4);
                break;

            case 10: // Areia de praia
                ctx.fillStyle = '#fde047';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#facc15';
                ctx.fillRect(x + 4, y + 6, 2, 2);
                ctx.fillRect(x + 12, y + 11, 2, 2);
                break;

            case 11: // Cristal Cósmico (Cume Astral)
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#818cf8';
                ctx.beginPath();
                ctx.moveTo(x + 8, y + 2);
                ctx.lineTo(x + 14, y + 8);
                ctx.lineTo(x + 8, y + 14);
                ctx.lineTo(x + 2, y + 8);
                ctx.fill();
                ctx.fillStyle = '#f43f5e';
                ctx.fillRect(x + 7, y + 7, 2, 2);
                break;

            case 12: // Flores decorativas
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x + 4, y + 4, 3, 3);
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(x + 10, y + 9, 3, 3);
                ctx.fillStyle = '#fde047';
                ctx.fillRect(x + 5, y + 5, 1, 1);
                ctx.fillRect(x + 11, y + 10, 1, 1);
                break;

            case 13: // Placa informativa
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(x + 7, y + 10, 2, 6);
                ctx.fillStyle = '#d97706';
                ctx.fillRect(x + 3, y + 4, 10, 7);
                ctx.fillStyle = '#fff';
                ctx.fillRect(x + 5, y + 6, 6, 2);
                break;

            case 14: // Porta de edifício
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(x, y, 16, 16);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(x + 2, y + 2, 12, 14);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(x + 4, y + 4, 8, 12);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(x + 10, y + 9, 2, 2);
                break;

            default:
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x, y, 16, 16);
                break;
        }
    }
};

// ============================================================================
// 5. MAPAS E MUNDO CONECTADO (7 REGIÕES ORIGINAIS)
// ============================================================================
const WorldManager = {
    currentMapId: 'vila_raiz',

    Maps: {
        vila_raiz: {
            name: 'Vila Raiz',
            width: 16,
            height: 14,
            bgm: 'town',
            // 0: Grama, 1: Grama Alta, 2: Estrada, 3: Água, 4: Parede, 5: Telhado, 6: Árvore topo, 7: Tronco, 12: Flores, 13: Placa, 14: Porta
            tiles: [
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6],
                [6,5,5,5,6,12,0,2,2,0,5,5,5,6,6,6],
                [6,5,5,5,6,0,0,2,2,0,5,5,5,6,6,6],
                [6,4,14,4,6,0,0,2,2,0,4,14,4,6,6,6],
                [6,0,0,0,0,0,13,2,2,0,0,0,0,0,0,6],
                [6,0,12,12,0,2,2,2,2,2,2,0,12,12,0,6],
                [6,0,0,0,0,2,0,0,0,0,2,0,0,0,0,6],
                [6,5,5,5,5,2,0,3,3,0,2,5,5,5,5,6],
                [6,4,4,14,4,2,3,3,3,3,2,4,4,14,4,6],
                [6,0,0,0,0,2,3,3,3,3,2,0,0,0,0,6],
                [6,12,0,0,1,2,2,2,2,2,2,1,0,0,12,6],
                [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]
            ],
            // Colisões: 1 = sólido, 0 = livre
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [],
            warps: [
                { x: 7, y: 0, targetMap: 'rota_1', targetX: 7, targetY: 22 },
                { x: 8, y: 0, targetMap: 'rota_1', targetX: 8, targetY: 22 },
                { x: 2, y: 4, targetMap: 'casa_prof', targetX: 4, targetY: 6 }
            ],
            npcs: [
                {
                    id: 'prof_althea', role: 'prof', x: 2, y: 5, dir: 0, name: 'Profª Althea',
                    dialogs: [
                        'Olá jovem! Bem-vindo ao mundo dos AstraMon!',
                        'Criaturas místicas que compartilham seus poderes com treinadores.',
                        'Você já escolheu seu companheiro inicial?'
                    ]
                },
                {
                    id: 'rival_leo', role: 'rival', x: 9, y: 5, dir: 2, name: 'Rival Leo',
                    dialogs: [
                        'E aí! Também vim buscar meu AstraMon!',
                        'Vou treinar muito no Bosque Sussurro até ser o campeão!'
                    ]
                },
                {
                    id: 'curandeiro', role: 'healer', x: 11, y: 10, dir: 0, name: 'Enfermeira Lily',
                    dialogs: [
                        'Seus AstraMon parecem cansados? Deixe-me cuidar deles!',
                        'Prontinho! Sua equipe está com a energia restaurada!'
                    ],
                    action: 'heal'
                }
            ],
            signs: [
                { x: 6, y: 5, text: 'Vila Raiz: Onde grandes jornadas e laços eternos florescem.' }
            ]
        },

        rota_1: {
            name: 'Rota 1 - Trilha Verde',
            width: 16,
            height: 24,
            bgm: 'route',
            tiles: [
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6],
                [6,1,1,1,6,6,6,2,2,6,6,6,1,1,1,6],
                [6,1,1,1,1,0,0,2,2,0,0,1,1,1,1,6],
                [6,1,1,1,1,0,0,2,2,0,0,1,1,1,1,6],
                [6,6,0,0,0,0,2,2,2,2,0,0,0,0,6,6],
                [6,6,0,1,1,2,2,0,0,2,2,1,1,0,6,6],
                [6,0,1,1,1,2,0,0,0,0,2,1,1,1,0,6],
                [6,0,1,1,1,2,0,13,0,0,2,1,1,1,0,6],
                [6,0,0,0,0,2,2,2,2,2,2,0,0,0,0,6],
                [6,6,0,1,1,1,0,2,2,0,1,1,1,0,6,6],
                [6,6,1,1,1,1,0,2,2,0,1,1,1,1,6,6],
                [6,0,1,1,1,1,0,2,2,0,1,1,1,1,0,6],
                [6,0,0,0,0,0,0,2,2,0,0,0,0,0,0,6],
                [6,6,1,1,0,2,2,2,2,2,2,0,1,1,6,6],
                [6,6,1,1,0,2,0,0,0,0,2,0,1,1,6,6],
                [6,0,1,1,0,2,0,12,12,0,2,0,1,1,0,6],
                [6,0,0,0,0,2,2,2,2,2,2,0,0,0,0,6],
                [6,6,1,1,1,1,0,2,2,0,1,1,1,1,6,6],
                [6,6,1,1,1,1,0,2,2,0,1,1,1,1,6,6],
                [6,0,0,0,0,0,0,2,2,0,0,0,0,0,0,6],
                [6,12,0,1,1,0,0,2,2,0,0,1,1,0,12,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6]
            ],
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [
                { speciesId: 10, rate: 0.35, minLv: 2, maxLv: 4 }, // Centelhão
                { speciesId: 14, rate: 0.35, minLv: 2, maxLv: 4 }, // Zefirinho
                { speciesId: 7, rate: 0.15, minLv: 3, maxLv: 4 },  // Brotin selvagem
                { speciesId: 12, rate: 0.15, minLv: 3, maxLv: 4 }  // Geodino
            ],
            warps: [
                { x: 7, y: 23, targetMap: 'vila_raiz', targetX: 7, targetY: 1 },
                { x: 8, y: 23, targetMap: 'vila_raiz', targetX: 8, targetY: 1 },
                { x: 7, y: 0, targetMap: 'bosque_sussurro', targetX: 9, targetY: 18 },
                { x: 8, y: 0, targetMap: 'bosque_sussurro', targetX: 10, targetY: 18 }
            ],
            npcs: [
                {
                    id: 'trainer_alan', role: 'npc', x: 10, y: 13, dir: 2, name: 'Treinador Alan',
                    dialogs: ['A grama alta desta rota está cheia de Centelhões e Zefirinhos! Enfraqueça-os antes de usar o Orbe Captura!'],
                    trainerBattle: {
                        name: 'Treinador Alan',
                        team: [14], // Zefirinho lv 4
                        reward: 120,
                        victoryDialog: 'Incrível! Seus reflexos são muito rápidos!'
                    }
                }
            ],
            signs: [
                { x: 7, y: 7, text: 'Rota 1: Caminho Verde para o Bosque Sussurro.' }
            ]
        },

        bosque_sussurro: {
            name: 'Bosque Sussurro',
            width: 20,
            height: 20,
            bgm: 'forest',
            tiles: [
                [6,6,6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,1,1,6,6,1,1,6,2,2,6,1,1,6,6,1,1,6,6],
                [6,1,1,1,1,6,1,1,0,2,2,0,1,1,6,1,1,1,1,6],
                [6,1,1,1,1,0,0,0,0,2,2,0,0,0,0,1,1,1,1,6],
                [6,6,0,0,6,6,1,1,2,2,2,2,1,1,6,6,0,0,6,6],
                [6,6,0,0,6,6,1,1,2,0,0,2,1,1,6,6,0,0,6,6],
                [6,0,0,1,1,6,0,0,2,0,0,2,0,0,6,1,1,0,0,6],
                [6,0,1,1,1,6,0,2,2,0,0,2,2,0,6,1,1,1,0,6],
                [6,6,1,1,0,0,0,2,0,0,0,0,2,0,0,0,1,1,6,6],
                [6,6,6,0,0,2,2,2,0,13,0,0,2,2,2,0,0,6,6,6],
                [6,1,1,0,2,2,0,0,0,0,0,0,0,0,2,2,0,1,1,6],
                [6,1,1,0,2,0,0,1,1,1,1,1,1,0,0,2,0,1,1,6],
                [6,6,0,0,2,0,1,1,1,1,1,1,1,1,0,2,0,0,6,6],
                [6,6,0,0,2,2,2,2,0,0,0,0,2,2,2,2,0,0,6,6],
                [6,1,1,0,0,0,0,2,2,0,0,2,2,0,0,0,0,1,1,6],
                [6,1,1,1,6,6,0,0,2,2,2,2,0,0,6,6,1,1,1,6],
                [6,6,1,1,6,6,1,0,0,2,2,0,0,1,6,6,1,1,6,6],
                [6,6,6,6,6,6,6,0,0,2,2,0,0,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6]
            ],
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [
                { speciesId: 7, rate: 0.35, minLv: 5, maxLv: 8 },  // Brotin
                { speciesId: 14, rate: 0.30, minLv: 5, maxLv: 8 }, // Zefirinho
                { speciesId: 18, rate: 0.20, minLv: 6, maxLv: 8 }, // Sombrita
                { speciesId: 20, rate: 0.15, minLv: 6, maxLv: 8 }  // Luminete
            ],
            warps: [
                { x: 9, y: 19, targetMap: 'rota_1', targetX: 7, targetY: 1 },
                { x: 10, y: 19, targetMap: 'rota_1', targetX: 8, targetY: 1 },
                { x: 9, y: 0, targetMap: 'caverna_eco', targetX: 10, targetY: 16 },
                { x: 10, y: 0, targetMap: 'caverna_eco', targetX: 11, targetY: 16 }
            ],
            npcs: [
                {
                    id: 'rival_leo_bosque', role: 'rival', x: 10, y: 8, dir: 0, name: 'Rival Leo',
                    dialogs: ['Te peguei! Sabia que você viria para o Bosque Sussurro! Vamos testar nossas criaturas agora mesmo!'],
                    trainerBattle: {
                        name: 'Rival Leo',
                        team: [1, 10], // Pyrolim e Centelhão lv 7
                        reward: 200,
                        victoryDialog: 'Caramba, você ficou forte de verdade! Mas na Caverna Eco eu vencerei!'
                    }
                }
            ],
            signs: [
                { x: 9, y: 9, text: 'Aviso: Caverna Eco ao norte. Sombras e ecos habitam as profundezas.' }
            ]
        },

        caverna_eco: {
            name: 'Caverna Eco',
            width: 22,
            height: 18,
            bgm: 'cave',
            tiles: [
                [9,9,9,9,9,9,9,9,9,9,2,2,9,9,9,9,9,9,9,9,9,9],
                [9,9,8,8,8,8,9,9,8,8,2,2,8,8,9,9,8,8,8,8,9,9],
                [9,8,8,9,9,8,8,8,8,2,2,2,2,8,8,8,8,9,9,8,8,9],
                [9,8,9,9,9,9,8,8,2,2,8,8,2,2,8,8,9,9,9,9,8,9],
                [9,8,8,8,8,8,8,2,2,8,8,8,8,2,2,8,8,8,8,8,8,9],
                [9,9,8,8,8,8,2,2,8,11,8,8,11,8,2,2,8,8,8,8,9,9],
                [9,9,9,8,8,2,2,8,8,8,8,8,8,8,8,2,2,8,8,9,9,9],
                [9,8,8,8,2,2,8,8,8,8,13,8,8,8,8,8,2,2,8,8,8,9],
                [9,8,9,9,2,2,8,8,8,8,8,8,8,8,8,8,2,2,9,9,8,9],
                [9,8,9,9,2,2,8,8,8,8,8,8,8,8,8,8,2,2,9,9,8,9],
                [9,8,8,8,8,2,2,8,8,8,8,8,8,8,8,2,2,8,8,8,8,9],
                [9,9,8,8,8,8,2,2,2,2,2,2,2,2,2,2,8,8,8,8,9,9],
                [9,9,9,8,8,8,8,8,8,2,2,2,2,8,8,8,8,8,8,9,9,9],
                [9,8,8,8,9,9,8,8,8,2,2,2,2,8,8,8,9,9,8,8,8,9],
                [9,8,9,9,9,9,9,8,8,2,2,2,2,8,8,9,9,9,9,9,8,9],
                [9,8,8,8,8,8,8,8,8,2,2,2,2,8,8,8,8,8,8,8,8,9],
                [9,9,9,9,9,9,9,9,9,9,2,2,9,9,9,9,9,9,9,9,9,9],
                [9,9,9,9,9,9,9,9,9,9,2,2,9,9,9,9,9,9,9,9,9,9]
            ],
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [
                { speciesId: 12, rate: 0.35, minLv: 8, maxLv: 12 }, // Geodino
                { speciesId: 18, rate: 0.35, minLv: 8, maxLv: 12 }, // Sombrita
                { speciesId: 16, rate: 0.20, minLv: 9, maxLv: 12 }, // Nevisco
                { speciesId: 13, rate: 0.10, minLv: 11, maxLv: 13 } // Monolítico
            ],
            warps: [
                { x: 10, y: 17, targetMap: 'bosque_sussurro', targetX: 9, targetY: 1 },
                { x: 11, y: 17, targetMap: 'bosque_sussurro', targetX: 10, targetY: 1 },
                { x: 10, y: 0, targetMap: 'porto_aurora', targetX: 10, targetY: 14 },
                { x: 11, y: 0, targetMap: 'porto_aurora', targetX: 11, targetY: 14 }
            ],
            npcs: [
                {
                    id: 'boss_bruno', role: 'boss', x: 10, y: 5, dir: 0, name: 'Guardião Bruno',
                    dialogs: ['Sou Bruno, Guardião da Caverna Eco! Prove que você e suas criaturas possuem a firmeza da rocha!'],
                    trainerBattle: {
                        name: 'Guardião Bruno',
                        isBoss: true,
                        team: [12, 13], // Geodino lv 11 e Monolítico lv 14
                        reward: 500,
                        badgeItem: 'insignia_rocha',
                        victoryDialog: 'Impressionante! A força do seu espírito quebrou a dureza de minhas pedras. Tome a Insígnia Rocha!'
                    }
                }
            ],
            signs: [
                { x: 10, y: 7, text: 'Arena da Rocha: Apenas aqueles com a Insígnia passarão para o Porto Aurora.' }
            ]
        },

        porto_aurora: {
            name: 'Porto Aurora',
            width: 20,
            height: 16,
            bgm: 'town',
            tiles: [
                [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
                [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
                [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
                [0,5,5,5,0,0,5,5,5,0,0,5,5,5,0,0,5,5,5,0],
                [0,4,14,4,0,0,4,14,4,0,0,4,14,4,0,0,4,14,4,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
                [0,0,12,12,0,0,0,13,0,0,0,0,12,12,0,0,0,0,0,0],
                [0,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0],
                [6,6,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,6,6,6],
                [6,6,6,0,0,2,0,0,0,0,0,0,2,0,0,0,6,6,6,6],
                [6,6,6,6,0,2,2,2,2,2,2,2,2,0,0,6,6,6,6,6],
                [6,6,6,6,6,0,0,0,2,2,0,0,0,0,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6,6]
            ],
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [],
            warps: [
                { x: 10, y: 15, targetMap: 'caverna_eco', targetX: 10, targetY: 1 },
                { x: 11, y: 15, targetMap: 'caverna_eco', targetX: 11, targetY: 1 },
                { x: 19, y: 2, targetMap: 'praia_celeste', targetX: 1, targetY: 10 }
            ],
            npcs: [
                {
                    id: 'merchant_mart', role: 'merchant', x: 6, y: 5, dir: 0, name: 'Vendedor do Porto',
                    dialogs: ['Bem-vindo ao Mercado do Porto! Tenho Orbes e Curas para suas viagens.'],
                    shop: ['cura_simples', 'cura_grande', 'orbe_captura', 'super_orbe', 'reviver_pó']
                },
                {
                    id: 'curandeiro_porto', role: 'healer', x: 14, y: 5, dir: 0, name: 'Médica Clara',
                    dialogs: ['Descanso é essencial antes de enfrentar a costa marítima. Equipe restaurada!'],
                    action: 'heal'
                }
            ],
            signs: [
                { x: 7, y: 7, text: 'Porto Aurora: A brisa salgada traz novas aventuras ao leste!' }
            ]
        },

        praia_celeste: {
            name: 'Praia Celeste',
            width: 18,
            height: 24,
            bgm: 'route',
            tiles: [
                [6,6,6,6,6,6,6,6,11,11,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,11,2,2,11,6,6,6,6,6,6,6],
                [6,6,10,10,10,10,10,2,2,10,10,10,10,10,6,6,6,6],
                [6,10,10,10,1,1,10,2,2,10,1,1,10,10,10,3,3,3],
                [6,10,1,1,1,1,10,2,2,10,1,1,1,10,10,3,3,3],
                [10,10,1,1,1,1,10,2,2,10,1,1,1,10,3,3,3,3],
                [10,10,10,10,10,10,10,2,2,10,10,10,10,3,3,3,3,3],
                [10,10,1,1,1,10,10,2,2,10,10,1,1,3,3,3,3,3],
                [10,10,1,1,1,10,10,2,2,10,10,1,1,3,3,3,3,3],
                [2,2,2,2,2,2,2,2,2,10,10,10,10,3,3,3,3,3],
                [2,2,2,2,2,2,2,2,2,10,10,10,10,3,3,3,3,3],
                [10,10,10,10,10,10,10,2,2,10,10,10,10,3,3,3,3,3],
                [10,10,1,1,10,10,10,2,2,10,10,1,1,3,3,3,3,3],
                [6,10,1,1,1,10,10,2,2,10,1,1,1,10,3,3,3,3],
                [6,10,10,10,10,10,10,2,2,10,10,10,10,3,3,3,3,3],
                [6,6,10,10,1,1,10,2,2,10,1,1,10,10,3,3,3,3],
                [6,6,6,10,1,1,10,2,2,10,1,1,10,6,3,3,3,3],
                [6,6,6,10,10,10,10,2,2,10,10,10,6,6,3,3,3,3],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6],
                [6,6,6,6,6,6,6,2,2,6,6,6,6,6,6,6,6,6]
            ],
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [
                { speciesId: 4, rate: 0.35, minLv: 14, maxLv: 18 },  // Hidrino
                { speciesId: 10, rate: 0.25, minLv: 15, maxLv: 18 }, // Centelhão
                { speciesId: 16, rate: 0.20, minLv: 15, maxLv: 18 }, // Nevisco
                { speciesId: 5, rate: 0.20, minLv: 16, maxLv: 19 }   // Quelódia
            ],
            warps: [
                { x: 0, y: 10, targetMap: 'porto_aurora', targetX: 18, targetY: 2 },
                { x: 8, y: 1, targetMap: 'cume_astral', targetX: 8, targetY: 16 },
                { x: 9, y: 1, targetMap: 'cume_astral', targetX: 9, targetY: 16 }
            ],
            npcs: [
                {
                    id: 'trainer_maya', role: 'npc', x: 6, y: 7, dir: 3, name: 'Veterana Maya',
                    dialogs: ['O Cume Astral fica logo acima! Somente os melhores treinadores alcançam as estrelas!'],
                    trainerBattle: {
                        name: 'Veterana Maya',
                        team: [5, 11], // Quelódia lv 17 e Voltíger lv 18
                        reward: 450,
                        victoryDialog: 'Você possui uma sintonia espetacular com sua equipe!'
                    }
                }
            ],
            signs: [
                { x: 7, y: 11, text: 'Praia Celeste: As águas refletem o brilho do Cume Astral.' }
            ]
        },

        cume_astral: {
            name: 'Cume Astral',
            width: 18,
            height: 18,
            bgm: 'boss',
            tiles: [
                [11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11],
                [11,8,8,8,8,8,8,11,11,11,8,8,8,8,8,8,8,11],
                [11,8,11,11,8,8,8,8,8,8,8,8,8,8,11,11,8,11],
                [11,8,11,8,8,8,8,8,8,8,8,8,8,8,8,11,8,11],
                [11,8,8,8,8,11,11,8,8,8,11,11,8,8,8,8,8,11],
                [11,8,8,8,11,8,8,8,8,8,8,8,11,8,8,8,8,11],
                [11,8,8,8,11,8,8,8,8,8,8,8,11,8,8,8,8,11],
                [11,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,11],
                [11,8,8,8,8,8,8,2,2,8,8,8,8,8,8,8,8,11],
                [11,8,8,8,8,8,2,2,2,2,8,8,8,8,8,8,8,11],
                [11,8,8,8,8,2,2,2,2,2,2,8,8,8,8,8,8,11],
                [11,8,8,8,2,2,2,2,2,2,2,2,8,8,8,8,8,11],
                [11,8,8,8,8,8,2,2,2,2,8,8,8,8,8,8,8,11],
                [11,8,8,8,8,8,8,2,2,8,8,8,8,8,8,8,8,11],
                [11,11,8,8,8,8,8,2,2,8,8,8,8,8,8,8,11,11],
                [11,11,11,8,8,8,8,2,2,8,8,8,8,8,8,11,11,11],
                [11,11,11,11,11,11,8,2,2,8,11,11,11,11,11,11,11,11],
                [11,11,11,11,11,11,11,2,2,11,11,11,11,11,11,11,11,11]
            ],
            solid: [4, 5, 6, 7, 3, 9, 11, 13],
            encounters: [
                { speciesId: 19, rate: 0.40, minLv: 22, maxLv: 26 }, // Umbreonix
                { speciesId: 21, rate: 0.40, minLv: 22, maxLv: 26 }, // Solarião
                { speciesId: 17, rate: 0.20, minLv: 24, maxLv: 26 }  // Glaciofante
            ],
            warps: [
                { x: 8, y: 17, targetMap: 'praia_celeste', targetX: 8, targetY: 2 },
                { x: 9, y: 17, targetMap: 'praia_celeste', targetX: 9, targetY: 2 }
            ],
            npcs: [
                {
                    id: 'champion_valeria', role: 'boss', x: 8, y: 6, dir: 0, name: 'Campeã Valéria',
                    dialogs: [
                        'Eu guardo o segredo cósmico do Cume Astral há gerações.',
                        'Se você derrotar minha equipe, despertarei o lendário Astraeus para você desafiar!'
                    ],
                    trainerBattle: {
                        name: 'Campeã Valéria',
                        isBoss: true,
                        team: [3, 6, 9], // Draconite, Maremoto e Selvadonte lv 26
                        reward: 1500,
                        badgeItem: 'prisma_astral',
                        victoryDialog: 'Extraordinário! O Prisma Cósmico ressoa com sua bravura! Astraeus aguarda seu chamado!'
                    }
                },
                {
                    id: 'legendary_astraeus', role: 'npc', x: 9, y: 3, dir: 0, name: 'Astraeus (Lendário)',
                    isWildBoss: true,
                    speciesId: 22,
                    level: 30,
                    dialogs: ['*Uma aura cósmica indescritível preenche o ar! Astraeus te observa!*']
                }
            ],
            signs: [
                { x: 7, y: 13, text: 'Cume Astral: Onde as estrelas tocam a terra e os heróis se tornam lendas.' }
            ]
        }
    }
};

// ============================================================================
// 6. ESTADO DO JOGADOR, EQUIPE E INVENTÁRIO
// ============================================================================
const PlayerState = {
    x: 7,
    y: 8,
    dir: 0, // 0: Baixo, 1: Cima, 2: Esquerda, 3: Direita
    moving: false,
    moveProgress: 0,
    walkFrame: 0,
    walkTimer: 0,
    speed: 0.08, // Velocidade de transição entre tiles

    money: 500,
    party: [], // Máximo 6 criaturas
    storageBox: [], // Caixa Astral (PC)
    bag: {
        cura_simples: 3,
        orbe_captura: 5,
        reviver_pó: 1
    },

    // Progresso da história e missões
    story: {
        starterChosen: false,
        defeatedTrainers: {},
        badges: [],
        astraeusCaught: false
    },

    // Adiciona criatura na equipe ou envia para a Caixa Astral
    addMonster(monster) {
        if (this.party.length < 6) {
            this.party.push(monster);
            return 'party';
        } else {
            this.storageBox.push(monster);
            return 'box';
        }
    },

    hasItem(itemId, qty = 1) {
        return (this.bag[itemId] || 0) >= qty;
    },

    addItem(itemId, qty = 1) {
        this.bag[itemId] = (this.bag[itemId] || 0) + qty;
    },

    removeItem(itemId, qty = 1) {
        if (!this.hasItem(itemId, qty)) return false;
        this.bag[itemId] -= qty;
        if (this.bag[itemId] <= 0) {
            delete this.bag[itemId];
        }
        return true;
    }
};

// ============================================================================
// 7. SISTEMA DE SALVAMENTO (LOCALSTORAGE)
// ============================================================================
const SaveSystem = {
    SAVE_KEY: 'astramon_save_data_v1',

    save() {
        const data = {
            currentMap: WorldManager.currentMapId,
            x: PlayerState.x,
            y: PlayerState.y,
            dir: PlayerState.dir,
            money: PlayerState.money,
            party: PlayerState.party,
            storageBox: PlayerState.storageBox,
            bag: PlayerState.bag,
            story: PlayerState.story,
            timestamp: new Date().toLocaleString()
        };
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
        GameUI.showNotification('Progresso Salvo com Sucesso!');
        AudioManager.playSFX('confirm');
    },

    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    load() {
        const raw = localStorage.getItem(this.SAVE_KEY);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            WorldManager.currentMapId = data.currentMap || 'vila_raiz';
            PlayerState.x = data.x;
            PlayerState.y = data.y;
            PlayerState.dir = data.dir;
            PlayerState.money = data.money || 500;
            PlayerState.bag = data.bag || {};
            PlayerState.story = data.story || {};

            // Reconstruir instâncias de monstros da equipe
            PlayerState.party = (data.party || []).map(p => {
                const mon = new MonsterInstance(p.speciesId, p.level);
                mon.name = p.name;
                mon.currentHp = p.currentHp;
                mon.moves = p.moves;
                mon.exp = p.exp;
                mon.expNext = p.expNext;
                return mon;
            });

            // Reconstruir Caixa Astral
            PlayerState.storageBox = (data.storageBox || []).map(p => {
                const mon = new MonsterInstance(p.speciesId, p.level);
                mon.name = p.name;
                mon.currentHp = p.currentHp;
                mon.moves = p.moves;
                return mon;
            });

            return true;
        } catch (e) {
            console.error('Erro ao carregar partida:', e);
            return false;
        }
    }
};

// ============================================================================
// 8. MOTOR DE BATALHA POR TURNOS COMPLETO
// ============================================================================
const BattleEngine = {
    active: false,
    isTrainer: false,
    trainerData: null,
    trainerMonIndex: 0,
    isWildBoss: false,

    playerMon: null,
    enemyMon: null,

    state: 'INTRO', // INTRO, MENU_MAIN, MENU_FIGHT, EXECUTE_TURN, USE_ITEM, CATCHING, VICTORY, DEFEAT
    menuIndex: 0,
    selectedMoveIndex: 0,

    message: '',
    animTimer: 0,
    shakeScreen: 0,
    ballThrowProgress: 0,
    ballWobbles: 0,

    startWildBattle(speciesId, level) {
        this.active = true;
        this.isTrainer = false;
        this.trainerData = null;
        this.isWildBoss = false;

        this.playerMon = PlayerState.party.find(m => m.currentHp > 0) || PlayerState.party[0];
        this.enemyMon = new MonsterInstance(speciesId, level);

        this.state = 'INTRO';
        this.message = `Um ${this.enemyMon.name} selvagem apareceu!`;
        this.menuIndex = 0;
        this.animTimer = 60;

        AudioManager.playBGM('battle');
        GameUI.hideOverlay();
    },

    startTrainerBattle(trainerData) {
        this.active = true;
        this.isTrainer = true;
        this.trainerData = trainerData;
        this.trainerMonIndex = 0;
        this.isWildBoss = false;

        this.playerMon = PlayerState.party.find(m => m.currentHp > 0) || PlayerState.party[0];
        const firstEnemySpecies = trainerData.team[0];
        const trainerLvl = trainerData.isBoss ? 15 : 6;
        this.enemyMon = new MonsterInstance(firstEnemySpecies, trainerLvl);

        this.state = 'INTRO';
        this.message = `${trainerData.name} desafia você para uma batalha!`;
        this.menuIndex = 0;
        this.animTimer = 60;

        AudioManager.playBGM(trainerData.isBoss ? 'boss' : 'battle');
        GameUI.hideOverlay();
    },

    startWildBossBattle(speciesId, level) {
        this.startWildBattle(speciesId, level);
        this.isWildBoss = true;
        this.message = `Astraeus, o Guardião Cósmico, desceu dos céus!`;
        AudioManager.playBGM('boss');
    },

    update() {
        if (!this.active) return;

        if (this.shakeScreen > 0) this.shakeScreen--;

        if (this.state === 'INTRO') {
            this.animTimer--;
            if (this.animTimer <= 0) {
                this.state = 'MENU_MAIN';
                this.message = `O que ${this.playerMon.name} deve fazer?`;
            }
        }
    },

    selectMenu(dir) {
        AudioManager.playSFX('select');
        if (this.state === 'MENU_MAIN') {
            // 0: LUTAR, 1: MOCHILA, 2: EQUIPE, 3: FUGIR
            if (dir === 'left' && (this.menuIndex === 1 || this.menuIndex === 3)) this.menuIndex--;
            else if (dir === 'right' && (this.menuIndex === 0 || this.menuIndex === 2)) this.menuIndex++;
            else if (dir === 'up' && (this.menuIndex === 2 || this.menuIndex === 3)) this.menuIndex -= 2;
            else if (dir === 'down' && (this.menuIndex === 0 || this.menuIndex === 1)) this.menuIndex += 2;
        } else if (this.state === 'MENU_FIGHT') {
            const movesCount = this.playerMon.moves.length;
            if (dir === 'left' && (this.selectedMoveIndex === 1 || this.selectedMoveIndex === 3)) this.selectedMoveIndex--;
            else if (dir === 'right' && (this.selectedMoveIndex === 0 || this.selectedMoveIndex === 2) && this.selectedMoveIndex + 1 < movesCount) this.selectedMoveIndex++;
            else if (dir === 'up' && this.selectedMoveIndex >= 2) this.selectedMoveIndex -= 2;
            else if (dir === 'down' && this.selectedMoveIndex + 2 < movesCount) this.selectedMoveIndex += 2;
        }
    },

    confirmAction() {
        if (this.state === 'MENU_MAIN') {
            AudioManager.playSFX('confirm');
            if (this.menuIndex === 0) {
                // LUTAR
                this.state = 'MENU_FIGHT';
                this.selectedMoveIndex = 0;
            } else if (this.menuIndex === 1) {
                // MOCHILA
                GameUI.openBattleBag();
            } else if (this.menuIndex === 2) {
                // EQUIPE
                GameUI.openBattleTeam();
            } else if (this.menuIndex === 3) {
                // FUGIR
                if (this.isTrainer || this.isWildBoss) {
                    this.message = 'Não é possível fugir de treinadores ou chefes!';
                    AudioManager.playSFX('cancel');
                } else {
                    AudioManager.playSFX('confirm');
                    this.message = 'Você fugiu da batalha em segurança!';
                    setTimeout(() => this.endBattle(), 900);
                }
            }
        } else if (this.state === 'MENU_FIGHT') {
            const move = this.playerMon.moves[this.selectedMoveIndex];
            if (!move || move.currentPP <= 0) {
                AudioManager.playSFX('cancel');
                this.message = 'Sem PP restante para este golpe!';
                return;
            }
            this.executeTurn(move);
        }
    },

    cancelAction() {
        if (this.state === 'MENU_FIGHT') {
            AudioManager.playSFX('cancel');
            this.state = 'MENU_MAIN';
            this.message = `O que ${this.playerMon.name} deve fazer?`;
        }
    },

    executeTurn(playerMove) {
        this.state = 'EXECUTE_TURN';
        playerMove.currentPP--;

        // Escolha de golpe da IA inimiga
        const enemyMoves = this.enemyMon.moves;
        const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)];

        // Ordem por velocidade
        const playerFirst = this.playerMon.spd >= this.enemyMon.spd;

        if (playerFirst) {
            this.performAttack(this.playerMon, this.enemyMon, playerMove, () => {
                if (this.enemyMon.currentHp <= 0) {
                    this.handleEnemyFaint();
                } else {
                    this.performAttack(this.enemyMon, this.playerMon, enemyMove, () => {
                        if (this.playerMon.currentHp <= 0) {
                            this.handlePlayerFaint();
                        } else {
                            this.state = 'MENU_MAIN';
                            this.message = `O que ${this.playerMon.name} deve fazer?`;
                        }
                    });
                }
            });
        } else {
            this.performAttack(this.enemyMon, this.playerMon, enemyMove, () => {
                if (this.playerMon.currentHp <= 0) {
                    this.handlePlayerFaint();
                } else {
                    this.performAttack(this.playerMon, this.enemyMon, playerMove, () => {
                        if (this.enemyMon.currentHp <= 0) {
                            this.handleEnemyFaint();
                        } else {
                            this.state = 'MENU_MAIN';
                            this.message = `O que ${this.playerMon.name} deve fazer?`;
                        }
                    });
                }
            });
        }
    },

    performAttack(attacker, defender, move, callback) {
        this.message = `${attacker.name} usou ${move.name}!`;

        // Verificação de Precisão
        const hitRoll = Math.random() * 100;
        if (hitRoll > move.acc) {
            setTimeout(() => {
                this.message = 'Mas o ataque errou o alvo!';
                AudioManager.playSFX('cancel');
                setTimeout(callback, 800);
            }, 600);
            return;
        }

        // Multiplicador Elemental
        const mult = DataRegistry.getTypeMultiplier(move.type, defender.type);
        // Chance de Crítico
        const isCrit = Math.random() < 0.12;

        // Fórmula de Dano
        const levelFactor = (2 * attacker.level) / 5 + 2;
        let baseDmg = ((levelFactor * move.power * (attacker.atk / defender.def)) / 50 + 2);
        baseDmg *= mult;
        if (isCrit) baseDmg *= 1.5;
        const finalDamage = Math.max(1, Math.floor(baseDmg));

        setTimeout(() => {
            this.shakeScreen = 10;
            if (isCrit) {
                AudioManager.playSFX('crit');
            } else if (mult >= 2.0) {
                AudioManager.playSFX('super_effective');
            } else {
                AudioManager.playSFX('hit');
            }

            defender.currentHp = Math.max(0, defender.currentHp - finalDamage);

            let feedback = '';
            if (mult >= 2.0) feedback = ' É super efetivo!';
            else if (mult <= 0.5) feedback = ' Não foi muito efetivo...';
            if (isCrit) feedback += ' Acerto Crítico!';

            this.message = `${attacker.name} causou ${finalDamage} de dano!${feedback}`;
            setTimeout(callback, 1100);
        }, 600);
    },

    handleEnemyFaint() {
        AudioManager.playSFX('faint');
        this.message = `${this.enemyMon.name} adversário foi derrotado!`;

        // Cálculo de EXP
        const baseExp = DataRegistry.Creatures[this.enemyMon.speciesId].expYield;
        const expGained = Math.floor((baseExp * this.enemyMon.level) / 7);

        setTimeout(() => {
            this.message = `${this.playerMon.name} ganhou ${expGained} pontos de EXP!`;
            const lvlUps = this.playerMon.gainExp(expGained);

            if (lvlUps.length > 0) {
                AudioManager.playSFX('level_up');
                this.message = `${this.playerMon.name} subiu para o nível ${this.playerMon.level}!`;

                // Checar Evolução
                const evoTarget = this.playerMon.checkEvolution();
                if (evoTarget) {
                    setTimeout(() => {
                        this.startEvolutionSequence(this.playerMon, evoTarget);
                    }, 1200);
                    return;
                }
            }

            // Checar se o treinador ainda possui monstros
            if (this.isTrainer && this.trainerMonIndex + 1 < this.trainerData.team.length) {
                this.trainerMonIndex++;
                const nextMonSpecies = this.trainerData.team[this.trainerMonIndex];
                const nextLvl = this.trainerData.isBoss ? 16 : 8;
                this.enemyMon = new MonsterInstance(nextMonSpecies, nextLvl);
                setTimeout(() => {
                    this.message = `${this.trainerData.name} enviou ${this.enemyMon.name}!`;
                    this.state = 'MENU_MAIN';
                }, 1200);
            } else {
                // Vitória Completa
                setTimeout(() => this.handleVictory(), 1200);
            }
        }, 1100);
    },

    handlePlayerFaint() {
        AudioManager.playSFX('faint');
        this.message = `${this.playerMon.name} foi derrotado!`;

        // Checar se há outro monstro vivo
        const nextHealthy = PlayerState.party.find(m => m.currentHp > 0);
        if (nextHealthy) {
            setTimeout(() => {
                this.playerMon = nextHealthy;
                this.message = `Vai, ${this.playerMon.name}!`;
                this.state = 'MENU_MAIN';
            }, 1200);
        } else {
            // Todos derrotados: Blackout
            setTimeout(() => {
                this.message = 'Toda a sua equipe foi derrotada... Você correu para um centro médico!';
                setTimeout(() => {
                    // Restaurar equipe e voltar para vila
                    PlayerState.party.forEach(m => m.currentHp = m.maxHp);
                    WorldManager.currentMapId = 'vila_raiz';
                    PlayerState.x = 7;
                    PlayerState.y = 8;
                    this.endBattle();
                }, 1600);
            }, 1200);
        }
    },

    handleVictory() {
        AudioManager.playBGM('victory');
        this.state = 'VICTORY';

        let rewardMoney = 50;
        if (this.isTrainer) {
            rewardMoney = this.trainerData.reward || 150;
            PlayerState.money += rewardMoney;
            PlayerState.story.defeatedTrainers[this.trainerData.name] = true;

            if (this.trainerData.badgeItem) {
                PlayerState.addItem(this.trainerData.badgeItem, 1);
                this.message = `Você venceu e recebeu R$ ${rewardMoney} e a ${DataRegistry.Items[this.trainerData.badgeItem].name}!`;
            } else {
                this.message = `Você venceu a batalha e ganhou R$ ${rewardMoney}!`;
            }
        } else {
            this.message = `Você venceu o encontro selvagem!`;
        }

        setTimeout(() => this.endBattle(), 2000);
    },

    startEvolutionSequence(monster, targetSpeciesId) {
        const oldName = monster.name;
        monster.evolve(targetSpeciesId);
        AudioManager.playSFX('catch_success');
        this.message = `O que?! ${oldName} está evoluindo... Parabéns! Ele se tornou um ${monster.name}!`;
        setTimeout(() => {
            if (this.state === 'VICTORY') {
                this.endBattle();
            } else {
                this.state = 'MENU_MAIN';
            }
        }, 2200);
    },

    // Sistema de Captura com Animação e Chances
    tryCatchMonster(itemId) {
        if (this.isTrainer) {
            this.message = 'Não é possível capturar monstros de outros treinadores!';
            AudioManager.playSFX('cancel');
            return;
        }

        PlayerState.removeItem(itemId, 1);
        GameUI.hideOverlay();
        this.state = 'CATCHING';
        this.message = `Você lançou o ${DataRegistry.Items[itemId].name}!`;
        AudioManager.playSFX('ball_throw');

        const itemRate = DataRegistry.Items[itemId].rate || 1.0;
        const baseRate = DataRegistry.Creatures[this.enemyMon.speciesId].catchRate;
        const hpFactor = ((3 * this.enemyMon.maxHp - 2 * this.enemyMon.currentHp) / (3 * this.enemyMon.maxHp));
        const finalChance = (baseRate * hpFactor * itemRate) / 255;

        // Animação de 3 balanços
        let wobble = 0;
        const wobbleInterval = setInterval(() => {
            wobble++;
            AudioManager.playSFX('ball_wobble');
            this.message = `O orbe está oscilando... (${wobble})`;

            if (wobble >= 3) {
                clearInterval(wobbleInterval);
                const roll = Math.random();
                if (roll <= finalChance || itemId === 'orbe_astral') {
                    // Capturado com sucesso!
                    AudioManager.playSFX('catch_success');
                    this.message = `Incrível! ${this.enemyMon.name} foi capturado com sucesso!`;
                    const dest = PlayerState.addMonster(this.enemyMon);
                    setTimeout(() => {
                        if (dest === 'box') {
                            this.message = `Sua equipe estava cheia! ${this.enemyMon.name} foi transferido para a Caixa Astral.`;
                        }
                        if (this.isWildBoss) {
                            PlayerState.story.astraeusCaught = true;
                        }
                        setTimeout(() => this.endBattle(), 1400);
                    }, 1200);
                } else {
                    // Escapou
                    AudioManager.playSFX('cancel');
                    this.message = `Ah não! O ${this.enemyMon.name} quebrou o orbe e escapou!`;
                    setTimeout(() => {
                        this.state = 'MENU_MAIN';
                        this.message = `O que ${this.playerMon.name} deve fazer?`;
                    }, 1200);
                }
            }
        }, 750);
    },

    endBattle() {
        this.active = false;
        const currentMap = WorldManager.Maps[WorldManager.currentMapId];
        AudioManager.playBGM(currentMap ? currentMap.bgm : 'town');
    },

    // Renderização visual da tela de batalha 480x320
    draw(ctx) {
        if (!this.active) return;

        // Fundo com degradê temático
        const grad = ctx.createLinearGradient(0, 0, 0, 320);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.6, '#312e81');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 480, 320);

        // Plataformas ovais no campo de batalha
        ctx.fillStyle = '#1e293b';
        // Plataforma do Inimigo (topo à direita)
        ctx.beginPath();
        ctx.ellipse(350, 130, 80, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Plataforma do Jogador (frente à esquerda)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(120, 220, 95, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Monstros
        const breathe = Math.sin(Date.now() * 0.005) * 3;
        // Inimigo
        if (this.enemyMon && this.state !== 'CATCHING') {
            PixelArtEngine.drawMonster(ctx, this.enemyMon.speciesId, 310, 60, 80, false, breathe);
        }
        // Jogador (Costas)
        if (this.playerMon) {
            PixelArtEngine.drawMonster(ctx, this.playerMon.speciesId, 70, 140, 100, true, -breathe);
        }

        // Cartão de Status do Inimigo (Superior Esquerda)
        this.drawStatusCard(ctx, 30, 25, this.enemyMon, false);

        // Cartão de Status do Jogador (Inferior Direita)
        this.drawStatusCard(ctx, 250, 175, this.playerMon, true);

        // Caixa Inferior de Ações e Mensagens
        this.drawBottomBattleBox(ctx);
    },

    drawStatusCard(ctx, x, y, mon, isPlayer = false) {
        if (!mon) return;
        ctx.save();
        ctx.translate(x, y);

        // Fundo do cartão
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(0, 0, 190, 52);
        ctx.strokeStyle = isPlayer ? '#4f46e5' : '#e11d48';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 190, 52);

        // Nome e Nível
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(mon.name, 10, 18);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Nv.${mon.level}`, 130, 18);

        // Barra de HP
        ctx.fillStyle = '#94a3b8';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('HP', 10, 32);

        const hpPercent = Math.max(0, mon.currentHp / mon.maxHp);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(32, 25, 145, 9);

        // Cor da vida (Verde > 50%, Amarelo > 20%, Vermelho < 20%)
        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.2 ? '#eab308' : '#ef4444';
        ctx.fillRect(33, 26, Math.floor(143 * hpPercent), 7);

        // Texto numérico de vida apenas para o jogador
        if (isPlayer) {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillText(`${mon.currentHp}/${mon.maxHp}`, 115, 46);

            // Barra de EXP fina embaixo
            const expPercent = Math.min(1, Math.max(0, mon.exp / mon.expNext));
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(10, 48, 95, 3);
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(10, 48, Math.floor(95 * expPercent), 3);
        }

        ctx.restore();
    },

    drawBottomBattleBox(ctx) {
        ctx.save();
        ctx.translate(10, 240);

        // Fundo da caixa
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(0, 0, 460, 70);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 460, 70);

        if (this.state === 'MENU_MAIN') {
            // Lado Esquerdo: Mensagem
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText(this.message, 15, 38);

            // Lado Direito: Grade 2x2 de Comandos
            const commands = ['LUTAR', 'MOCHILA', 'EQUIPE', 'FUGIR'];
            const coords = [
                { x: 260, y: 26 },
                { x: 360, y: 26 },
                { x: 260, y: 52 },
                { x: 360, y: 52 }
            ];

            commands.forEach((cmd, idx) => {
                const c = coords[idx];
                const isSelected = this.menuIndex === idx;
                if (isSelected) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText('▶ ' + cmd, c.x - 14, c.y);
                } else {
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(cmd, c.x, c.y);
                }
            });
        } else if (this.state === 'MENU_FIGHT') {
            // Lista de Golpes
            const moves = this.playerMon.moves;
            const coords = [
                { x: 20, y: 26 },
                { x: 170, y: 26 },
                { x: 20, y: 52 },
                { x: 170, y: 52 }
            ];

            moves.forEach((m, idx) => {
                const c = coords[idx];
                const isSelected = this.selectedMoveIndex === idx;
                ctx.font = '8px "Press Start 2P", monospace';
                if (isSelected) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText('▶ ' + m.name, c.x - 12, c.y);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(m.name, c.x, c.y);
                }
            });

            // Detalhes do Golpe Selecionado (PP e Tipo)
            const sel = moves[this.selectedMoveIndex];
            if (sel) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = '8px "Press Start 2P", monospace';
                ctx.fillText(`PP: ${sel.currentPP}/${sel.maxPP}`, 330, 28);
                ctx.fillText(`TIPO: ${sel.type.toUpperCase()}`, 330, 48);
            }
        } else {
            // Apenas Mensagem de Narrativa / Turno
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText(this.message, 15, 38);
        }

        ctx.restore();
    }
};

// ============================================================================
// 9. GERENCIADOR DE INTERFACE DO USUÁRIO (TELAS, MENUS, DIÁLOGOS)
// ============================================================================
const GameUI = {
    overlay: document.getElementById('ui-overlay'),
    notif: document.getElementById('notification-box'),

    dialogActive: false,
    dialogQueue: [],
    dialogSpeaker: '',
    dialogText: '',
    dialogCallback: null,

    showNotification(msg) {
        if (!this.notif) return;
        this.notif.textContent = msg;
        this.notif.classList.remove('hidden');
        clearTimeout(this.notifTimer);
        this.notifTimer = setTimeout(() => {
            this.notif.classList.add('hidden');
        }, 2200);
    },

    showDialog(speaker, texts, callback = null) {
        this.dialogActive = true;
        this.dialogSpeaker = speaker;
        this.dialogQueue = Array.isArray(texts) ? [...texts] : [texts];
        this.dialogCallback = callback;
        this.advanceDialog();
    },

    advanceDialog() {
        if (this.dialogQueue.length > 0) {
            this.dialogText = this.dialogQueue.shift();
            AudioManager.playSFX('text');
        } else {
            this.dialogActive = false;
            if (this.dialogCallback) {
                const cb = this.dialogCallback;
                this.dialogCallback = null;
                cb();
            }
        }
    },

    drawDialogBox(ctx) {
        if (!this.dialogActive) return;
        ctx.save();
        ctx.translate(15, 230);

        // Caixa externa
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.fillRect(0, 0, 450, 75);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 450, 75);

        // Nome do Falante
        if (this.dialogSpeaker) {
            ctx.fillStyle = '#4f46e5';
            ctx.fillRect(15, -12, 160, 16);
            ctx.strokeStyle = '#93c5fd';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(15, -12, 160, 16);

            ctx.fillStyle = '#fbbf24';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText(this.dialogSpeaker, 24, 0);
        }

        // Texto principal
        ctx.fillStyle = '#f8fafc';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText(this.dialogText, 18, 30);

        // Indicador de avanço (Seta piscando)
        if (Math.floor(Date.now() / 400) % 2 === 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('▼', 425, 60);
        }

        ctx.restore();
    },

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            this.overlay.innerHTML = '';
        }
    },

    // Menu Principal do Jogo (Pausa [M])
    openMainMenu() {
        if (BattleEngine.active || this.dialogActive) return;
        AudioManager.playSFX('select');

        this.overlay.innerHTML = `
            <div class="retro-window" style="width: 280px;">
                <div class="retro-header">
                    <h2>MENU PRINCIPAL</h2>
                    <span class="retro-close-btn" id="menuClose">✕</span>
                </div>
                <div class="retro-body">
                    <ul class="menu-options-list">
                        <li class="menu-option-btn" id="mOptTeam">🐾 EQUIPE (${PlayerState.party.length}/6)</li>
                        <li class="menu-option-btn" id="mOptBag">🎒 MOCHILA</li>
                        <li class="menu-option-btn" id="mOptBox">📦 CAIXA ASTRAL</li>
                        <li class="menu-option-btn" id="mOptSave">💾 SALVAR JOGO</li>
                        <li class="menu-option-btn" id="mOptSound">🔊 ALTERNAR SOM</li>
                    </ul>
                </div>
            </div>
        `;
        this.overlay.classList.remove('hidden');

        document.getElementById('menuClose').onclick = () => this.hideOverlay();
        document.getElementById('mOptTeam').onclick = () => this.openTeamScreen();
        document.getElementById('mOptBag').onclick = () => this.openBagScreen();
        document.getElementById('mOptBox').onclick = () => this.openStorageScreen();
        document.getElementById('mOptSave').onclick = () => {
            SaveSystem.save();
            this.hideOverlay();
        };
        document.getElementById('mOptSound').onclick = () => {
            const isMuted = AudioManager.toggleMute();
            this.showNotification(isMuted ? 'Som Desativado' : 'Som Ativado');
        };
    },

    // Tela de Equipe de Monstros
    openTeamScreen(onSelectMonster = null) {
        AudioManager.playSFX('select');
        let cardsHtml = '';

        PlayerState.party.forEach((mon, idx) => {
            const hpPct = Math.floor((mon.currentHp / mon.maxHp) * 100);
            cardsHtml += `
                <div class="team-card" data-idx="${idx}">
                    <div class="team-card-info">
                        <div class="team-card-name"><b>${mon.name}</b> <span class="type-badge type-${mon.type}">${mon.type}</span></div>
                        <div class="team-card-lv">Nv.${mon.level} • HP: ${mon.currentHp}/${mon.maxHp}</div>
                        <div class="hp-bar-outer">
                            <div class="hp-bar-inner" style="width: ${hpPct}%; background-color: ${hpPct > 50 ? '#22c55e' : hpPct > 20 ? '#eab308' : '#ef4444'};"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.overlay.innerHTML = `
            <div class="retro-window" style="width: 380px;">
                <div class="retro-header">
                    <h2>SUA EQUIPE ASTRAL</h2>
                    <span class="retro-close-btn" id="teamClose">✕</span>
                </div>
                <div class="retro-body">
                    <div class="team-grid">
                        ${cardsHtml || '<p style="color:#94a3b8">Nenhum monstro na equipe.</p>'}
                    </div>
                </div>
            </div>
        `;
        this.overlay.classList.remove('hidden');

        document.getElementById('teamClose').onclick = () => this.hideOverlay();

        document.querySelectorAll('.team-card').forEach(card => {
            card.onclick = () => {
                const idx = parseInt(card.dataset.idx);
                const selected = PlayerState.party[idx];
                if (onSelectMonster) {
                    onSelectMonster(selected, idx);
                } else {
                    this.showNotification(`${selected.name} está pronto para batalhar!`);
                }
            };
        });
    },

    // Tela de Equipe Durante Batalha (Troca Tática)
    openBattleTeam() {
        this.openTeamScreen((selectedMon) => {
            if (selectedMon.currentHp <= 0) {
                AudioManager.playSFX('cancel');
                this.showNotification(`${selectedMon.name} está sem energia!`);
                return;
            }
            if (selectedMon === BattleEngine.playerMon) {
                this.showNotification(`${selectedMon.name} já está em combate!`);
                return;
            }
            this.hideOverlay();
            BattleEngine.playerMon = selectedMon;
            BattleEngine.message = `Volte! Vai, ${selectedMon.name}!`;
            BattleEngine.state = 'MENU_MAIN';
            AudioManager.playSFX('confirm');
        });
    },

    // Mochila / Inventário com Abas
    openBagScreen(onUseItem = null) {
        AudioManager.playSFX('select');
        let currentTab = 'cura';

        const renderItems = (tab) => {
            let itemsHtml = '';
            for (const [id, qty] of Object.entries(PlayerState.bag)) {
                const itemData = DataRegistry.Items[id];
                if (itemData && itemData.category === tab) {
                    itemsHtml += `
                        <div class="menu-option-btn item-row" data-id="${id}" style="margin-bottom:6px;">
                            <span>${itemData.name} <small style="color:var(--ui-gold);">x${qty}</small></span>
                            <small style="color:#94a3b8; font-size:7px;">${itemData.desc}</small>
                        </div>
                    `;
                }
            }
            return itemsHtml || '<p style="color:#94a3b8; padding:10px;">Nenhum item nesta categoria.</p>';
        };

        const updateContent = () => {
            this.overlay.innerHTML = `
                <div class="retro-window" style="width: 360px;">
                    <div class="retro-header">
                        <h2>MOCHILA ASTRAL</h2>
                        <span class="retro-close-btn" id="bagClose">✕</span>
                    </div>
                    <div class="retro-body">
                        <div class="bag-tabs">
                            <button class="bag-tab-btn ${currentTab === 'cura' ? 'active' : ''}" data-tab="cura">CURA</button>
                            <button class="bag-tab-btn ${currentTab === 'captura' ? 'active' : ''}" data-tab="captura">CAPTURA</button>
                            <button class="bag-tab-btn ${currentTab === 'batalha' ? 'active' : ''}" data-tab="batalha">BATALHA</button>
                            <button class="bag-tab-btn ${currentTab === 'importante' ? 'active' : ''}" data-tab="importante">CHAVES</button>
                        </div>
                        <div id="itemsContainer">
                            ${renderItems(currentTab)}
                        </div>
                    </div>
                </div>
            `;
            this.overlay.classList.remove('hidden');

            document.getElementById('bagClose').onclick = () => this.hideOverlay();

            document.querySelectorAll('.bag-tab-btn').forEach(btn => {
                btn.onclick = () => {
                    currentTab = btn.dataset.tab;
                    updateContent();
                };
            });

            document.querySelectorAll('.item-row').forEach(row => {
                row.onclick = () => {
                    const itemId = row.dataset.id;
                    if (onUseItem) {
                        onUseItem(itemId);
                    } else {
                        this.useItemOutBattle(itemId);
                    }
                };
            });
        };

        updateContent();
    },

    useItemOutBattle(itemId) {
        const item = DataRegistry.Items[itemId];
        if (!item) return;

        if (item.category === 'cura') {
            this.openTeamScreen((selectedMon) => {
                if (item.effect.hp) {
                    if (selectedMon.currentHp >= selectedMon.maxHp) {
                        this.showNotification('O HP já está cheio!');
                        return;
                    }
                    selectedMon.currentHp = Math.min(selectedMon.maxHp, selectedMon.currentHp + item.effect.hp);
                    PlayerState.removeItem(itemId, 1);
                    AudioManager.playSFX('heal');
                    this.showNotification(`${selectedMon.name} recuperou energia!`);
                    this.openTeamScreen();
                } else if (item.effect.revive) {
                    if (selectedMon.currentHp > 0) {
                        this.showNotification('A criatura não está desmaiada!');
                        return;
                    }
                    selectedMon.currentHp = Math.floor(selectedMon.maxHp * item.effect.revive);
                    PlayerState.removeItem(itemId, 1);
                    AudioManager.playSFX('heal');
                    this.showNotification(`${selectedMon.name} foi revivido!`);
                    this.openTeamScreen();
                }
            });
        } else {
            this.showNotification('Este item só pode ser usado em momentos específicos!');
        }
    },

    openBattleBag() {
        this.openBagScreen((itemId) => {
            const item = DataRegistry.Items[itemId];
            if (!item) return;

            if (item.category === 'captura') {
                this.hideOverlay();
                BattleEngine.tryCatchMonster(itemId);
            } else if (item.category === 'cura' && item.effect.hp) {
                this.hideOverlay();
                BattleEngine.playerMon.currentHp = Math.min(BattleEngine.playerMon.maxHp, BattleEngine.playerMon.currentHp + item.effect.hp);
                PlayerState.removeItem(itemId, 1);
                AudioManager.playSFX('heal');
                BattleEngine.message = `Você usou ${item.name} em ${BattleEngine.playerMon.name}!`;
                setTimeout(() => {
                    BattleEngine.state = 'MENU_MAIN';
                }, 1000);
            } else {
                this.showNotification('Item indisponível no calor do combate!');
            }
        });
    },

    // Caixa Astral (PC de Armazenamento de Criaturas)
    openStorageScreen() {
        AudioManager.playSFX('select');
        let boxHtml = '';
        PlayerState.storageBox.forEach((mon, idx) => {
            boxHtml += `
                <div class="menu-option-btn box-mon-item" data-idx="${idx}" style="margin-bottom:4px;">
                    <span>${mon.name} (Nv.${mon.level}) - ${mon.type}</span>
                    <button class="icon-btn withdraw-btn">Sacar</button>
                </div>
            `;
        });

        this.overlay.innerHTML = `
            <div class="retro-window" style="width: 360px;">
                <div class="retro-header">
                    <h2>CAIXA ASTRAL (PC)</h2>
                    <span class="retro-close-btn" id="boxClose">✕</span>
                </div>
                <div class="retro-body">
                    <p style="color:#cbd5e1; margin-bottom:8px;">Monstros Guardados (${PlayerState.storageBox.length}):</p>
                    ${boxHtml || '<p style="color:#94a3b8">Nenhum monstro armazenado.</p>'}
                </div>
            </div>
        `;
        this.overlay.classList.remove('hidden');

        document.getElementById('boxClose').onclick = () => this.hideOverlay();

        document.querySelectorAll('.withdraw-btn').forEach((btn, idx) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if (PlayerState.party.length >= 6) {
                    this.showNotification('Sua equipe já tem 6 membros!');
                    return;
                }
                const mon = PlayerState.storageBox.splice(idx, 1)[0];
                PlayerState.party.push(mon);
                AudioManager.playSFX('confirm');
                this.showNotification(`${mon.name} adicionado à equipe!`);
                this.openStorageScreen();
            };
        });
    },

    // Tela de Escolha do Inicial (Professora Althea)
    openStarterChoice() {
        this.overlay.innerHTML = `
            <div class="retro-window" style="width: 360px;">
                <div class="retro-header">
                    <h2>ESCOLHA SEU COMPANHEIRO</h2>
                </div>
                <div class="retro-body">
                    <p style="margin-bottom:10px; color:#f8fafc;">Qual criatura você deseja como parceira de jornada?</p>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="menu-option-btn" id="btnPickPyro">🔥 PYROLIM (Fogo) - Salamandra flamejante e ágil</button>
                        <button class="menu-option-btn" id="btnPickHidro">💧 HIDRINO (Água) - Tartaruga pura de concha cristalina</button>
                        <button class="menu-option-btn" id="btnPickBrotin">🌿 BROTIN (Planta) - Espírito saltador das florestas antigas</button>
                    </div>
                </div>
            </div>
        `;
        this.overlay.classList.remove('hidden');

        const pick = (speciesId) => {
            const starter = new MonsterInstance(speciesId, 5);
            PlayerState.addMonster(starter);
            PlayerState.story.starterChosen = true;
            this.hideOverlay();
            AudioManager.playSFX('catch_success');
            this.showDialog('Profª Althea', [
                `Excelente escolha! Cuide bem do seu ${starter.name}!`,
                'Agora atravesse a Rota 1 e desvende os mistérios até o Cume Astral!'
            ]);
        };

        document.getElementById('btnPickPyro').onclick = () => pick(1);
        document.getElementById('btnPickHidro').onclick = () => pick(4);
        document.getElementById('btnPickBrotin').onclick = () => pick(7);
    },

    // Tela de Loja de Itens
    openShopScreen(shopItems) {
        AudioManager.playSFX('select');
        let itemsHtml = '';
        shopItems.forEach(itemId => {
            const item = DataRegistry.Items[itemId];
            if (item) {
                itemsHtml += `
                    <div class="menu-option-btn buy-item-row" data-id="${itemId}" style="margin-bottom:6px;">
                        <div>
                            <b>${item.name}</b>
                            <br><small style="color:#94a3b8; font-size:7px;">${item.desc}</small>
                        </div>
                        <span style="color:var(--ui-gold);">R$ ${item.price}</span>
                    </div>
                `;
            }
        });

        this.overlay.innerHTML = `
            <div class="retro-window" style="width: 360px;">
                <div class="retro-header">
                    <h2>MERCADO ASTRAL • SALDO: R$ ${PlayerState.money}</h2>
                    <span class="retro-close-btn" id="shopClose">✕</span>
                </div>
                <div class="retro-body">
                    ${itemsHtml}
                </div>
            </div>
        `;
        this.overlay.classList.remove('hidden');

        document.getElementById('shopClose').onclick = () => this.hideOverlay();

        document.querySelectorAll('.buy-item-row').forEach(row => {
            row.onclick = () => {
                const id = row.dataset.id;
                const item = DataRegistry.Items[id];
                if (PlayerState.money >= item.price) {
                    PlayerState.money -= item.price;
                    PlayerState.addItem(id, 1);
                    AudioManager.playSFX('confirm');
                    this.showNotification(`Comprou ${item.name}!`);
                    this.openShopScreen(shopItems);
                } else {
                    AudioManager.playSFX('cancel');
                    this.showNotification('Saldo insuficiente!');
                }
            };
        });
    }
};

// ============================================================================
// 10. ENTRADA DE DADOS E CONTROLES (TECLADO E BOTÕES VIRTUAIS)
// ============================================================================
const Input = {
    keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        a: false,
        b: false,
        menu: false
    },

    init() {
        // Teclado
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Botões Virtuais na Tela (D-Pad & Ações)
        this.bindTouch('btnUp', 'up');
        this.bindTouch('btnDown', 'down');
        this.bindTouch('btnLeft', 'left');
        this.bindTouch('btnRight', 'right');
        this.bindTouch('btnA', 'a', () => this.triggerA());
        this.bindTouch('btnB', 'b', () => this.triggerB());
        this.bindTouch('btnMenu', 'menu', () => GameUI.openMainMenu());
        this.bindTouch('btnSaveQuick', null, () => SaveSystem.save());

        // Botão de Áudio
        const btnSound = document.getElementById('btnSoundToggle');
        if (btnSound) {
            btnSound.addEventListener('click', () => AudioManager.toggleMute());
        }

        // Botão Fullscreen
        const btnFs = document.getElementById('btnFullscreen');
        if (btnFs) {
            btnFs.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }
    },

    bindTouch(elemId, keyProp, onPress = null) {
        const elem = document.getElementById(elemId);
        if (!elem) return;

        const press = (e) => {
            e.preventDefault();
            AudioManager.init();
            if (keyProp) this.keys[keyProp] = true;
            elem.classList.add('pressed');
            if (onPress) onPress();
        };

        const release = (e) => {
            e.preventDefault();
            if (keyProp) this.keys[keyProp] = false;
            elem.classList.remove('pressed');
        };

        elem.addEventListener('touchstart', press, { passive: false });
        elem.addEventListener('touchend', release, { passive: false });
        elem.addEventListener('mousedown', press);
        elem.addEventListener('mouseup', release);
        elem.addEventListener('mouseleave', release);
    },

    handleKeyDown(e) {
        AudioManager.init();
        const code = e.code;

        if (code === 'ArrowUp' || code === 'KeyW') {
            this.keys.up = true;
            if (BattleEngine.active) BattleEngine.selectMenu('up');
        } else if (code === 'ArrowDown' || code === 'KeyS') {
            this.keys.down = true;
            if (BattleEngine.active) BattleEngine.selectMenu('down');
        } else if (code === 'ArrowLeft' || code === 'KeyA') {
            this.keys.left = true;
            if (BattleEngine.active) BattleEngine.selectMenu('left');
        } else if (code === 'ArrowRight' || code === 'KeyD') {
            this.keys.right = true;
            if (BattleEngine.active) BattleEngine.selectMenu('right');
        } else if (code === 'KeyZ' || code === 'Enter') {
            this.keys.a = true;
            this.triggerA();
        } else if (code === 'KeyX' || code === 'Escape') {
            this.keys.b = true;
            this.triggerB();
        } else if (code === 'KeyM') {
            this.keys.menu = true;
            GameUI.openMainMenu();
        }
    },

    handleKeyUp(e) {
        const code = e.code;
        if (code === 'ArrowUp' || code === 'KeyW') this.keys.up = false;
        else if (code === 'ArrowDown' || code === 'KeyS') this.keys.down = false;
        else if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = false;
        else if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = false;
        else if (code === 'KeyZ' || code === 'Enter') this.keys.a = false;
        else if (code === 'KeyX' || code === 'Escape') this.keys.b = false;
        else if (code === 'KeyM') this.keys.menu = false;
    },

    triggerA() {
        if (GameUI.dialogActive) {
            GameUI.advanceDialog();
            return;
        }
        if (BattleEngine.active) {
            BattleEngine.confirmAction();
            return;
        }
        // Interagir com o que estiver na frente do jogador no mundo
        Game.checkInteraction();
    },

    triggerB() {
        if (BattleEngine.active) {
            BattleEngine.cancelAction();
        } else if (!GameUI.overlay.classList.contains('hidden')) {
            GameUI.hideOverlay();
        }
    }
};

// ============================================================================
// 11. MOTOR PRINCIPAL DO JOGO (GAME LOOP, CÂMERA E RENDERIZAÇÃO)
// ============================================================================
const Game = {
    canvas: null,
    ctx: null,
    tick: 0,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Inicializar subsistemas
        Input.init();

        // Tentar carregar save existente ou iniciar novo jogo
        if (SaveSystem.hasSave()) {
            SaveSystem.load();
            GameUI.showNotification('Jogo Carregado com Sucesso!');
        } else {
            // Novo Jogo Padrão
            PlayerState.money = 500;
        }

        // Iniciar BGM da área
        const currentMap = WorldManager.Maps[WorldManager.currentMapId];
        AudioManager.playBGM(currentMap ? currentMap.bgm : 'town');

        // Loop de Animação 60fps
        requestAnimationFrame((t) => this.loop(t));
    },

    loop(timestamp) {
        this.tick++;

        this.update();
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    },

    update() {
        if (BattleEngine.active) {
            BattleEngine.update();
            return;
        }

        if (GameUI.dialogActive) return;

        // Movimentação do Jogador no Grid
        this.handlePlayerMovement();
    },

    handlePlayerMovement() {
        if (PlayerState.moving) {
            PlayerState.moveProgress += PlayerState.speed;
            PlayerState.walkTimer++;
            if (PlayerState.walkTimer % 8 === 0) {
                PlayerState.walkFrame = (PlayerState.walkFrame + 1) % 4;
            }

            if (PlayerState.moveProgress >= 1.0) {
                PlayerState.moving = false;
                PlayerState.moveProgress = 0;
                PlayerState.walkFrame = 0;

                // Checar Warps / Portais de Transição
                this.checkWarps();

                // Checar Encontro Selvagem na Grama Alta
                this.checkTallGrassEncounter();
            }
            return;
        }

        // Checar entrada do jogador para novo passo
        let dx = 0;
        let dy = 0;

        if (Input.keys.up) { dy = -1; PlayerState.dir = 1; }
        else if (Input.keys.down) { dy = 1; PlayerState.dir = 0; }
        else if (Input.keys.left) { dx = -1; PlayerState.dir = 2; }
        else if (Input.keys.right) { dx = 1; PlayerState.dir = 3; }

        if (dx !== 0 || dy !== 0) {
            const targetX = PlayerState.x + dx;
            const targetY = PlayerState.y + dy;

            if (this.canWalkTo(targetX, targetY)) {
                PlayerState.x = targetX;
                PlayerState.y = targetY;
                PlayerState.moving = true;
                PlayerState.moveProgress = 0;
            } else {
                AudioManager.playSFX('bump');
            }
        }
    },

    canWalkTo(x, y) {
        const map = WorldManager.Maps[WorldManager.currentMapId];
        if (!map) return false;

        // Limites do mapa
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;

        // Colisão com tiles sólidos
        const tile = map.tiles[y][x];
        if (map.solid.includes(tile)) return false;

        // Colisão com NPCs no mapa
        if (map.npcs && map.npcs.some(npc => npc.x === x && npc.y === y)) return false;

        return true;
    },

    checkWarps() {
        const map = WorldManager.Maps[WorldManager.currentMapId];
        if (!map || !map.warps) return;

        const warp = map.warps.find(w => w.x === PlayerState.x && w.y === PlayerState.y);
        if (warp) {
            WorldManager.currentMapId = warp.targetMap;
            PlayerState.x = warp.targetX;
            PlayerState.y = warp.targetY;
            AudioManager.playSFX('confirm');

            const nextMap = WorldManager.Maps[warp.targetMap];
            if (nextMap) {
                AudioManager.playBGM(nextMap.bgm);
                GameUI.showNotification(nextMap.name);
            }
        }
    },

    checkTallGrassEncounter() {
        const map = WorldManager.Maps[WorldManager.currentMapId];
        if (!map || !map.encounters || map.encounters.length === 0) return;

        const tile = map.tiles[PlayerState.y][PlayerState.x];
        if (tile === 1) { // 1 = Grama Alta
            // 15% de chance de encontro a cada passo na grama alta
            if (Math.random() < 0.15) {
                // Se o jogador não tem monstro para lutar, avisar
                if (PlayerState.party.length === 0) {
                    GameUI.showDialog('Aviso', 'Você precisa de uma criatura inicial para andar na grama alta!');
                    return;
                }

                // Escolher monstro pela tabela de encontros
                const totalRate = map.encounters.reduce((acc, e) => acc + e.rate, 0);
                let roll = Math.random() * totalRate;
                let chosen = map.encounters[0];
                for (const enc of map.encounters) {
                    if (roll < enc.rate) {
                        chosen = enc;
                        break;
                    }
                    roll -= enc.rate;
                }

                const lvl = Math.floor(Math.random() * (chosen.maxLv - chosen.minLv + 1)) + chosen.minLv;
                BattleEngine.startWildBattle(chosen.speciesId, lvl);
            }
        }
    },

    checkInteraction() {
        const map = WorldManager.Maps[WorldManager.currentMapId];
        if (!map) return;

        // Coordenada do tile em frente ao jogador
        let fx = PlayerState.x;
        let fy = PlayerState.y;
        if (PlayerState.dir === 0) fy += 1;
        else if (PlayerState.dir === 1) fy -= 1;
        else if (PlayerState.dir === 2) fx -= 1;
        else if (PlayerState.dir === 3) fx += 1;

        // Checar NPC à frente
        if (map.npcs) {
            const npc = map.npcs.find(n => n.x === fx && n.y === fy);
            if (npc) {
                // Virar NPC na direção do jogador
                npc.dir = (PlayerState.dir === 0) ? 1 : (PlayerState.dir === 1) ? 0 : (PlayerState.dir === 2) ? 3 : 2;

                if (npc.isWildBoss) {
                    if (PlayerState.story.astraeusCaught) {
                        GameUI.showDialog(npc.name, 'Astraeus repousa em paz na sua equipe.');
                    } else {
                        BattleEngine.startWildBossBattle(npc.speciesId, npc.level);
                    }
                    return;
                }

                if (npc.shop) {
                    GameUI.showDialog(npc.name, npc.dialogs, () => {
                        GameUI.openShopScreen(npc.shop);
                    });
                    return;
                }

                if (npc.action === 'heal') {
                    GameUI.showDialog(npc.name, npc.dialogs, () => {
                        PlayerState.party.forEach(m => {
                            m.currentHp = m.maxHp;
                            m.moves.forEach(mv => mv.currentPP = mv.maxPP);
                        });
                        AudioManager.playSFX('heal');
                        GameUI.showNotification('Toda a equipe foi curada!');
                    });
                    return;
                }

                if (npc.trainerBattle && !PlayerState.story.defeatedTrainers[npc.trainerBattle.name]) {
                    GameUI.showDialog(npc.name, npc.dialogs, () => {
                        BattleEngine.startTrainerBattle(npc.trainerBattle);
                    });
                    return;
                }

                if (npc.id === 'prof_althea' && !PlayerState.story.starterChosen) {
                    GameUI.showDialog(npc.name, npc.dialogs, () => {
                        GameUI.openStarterChoice();
                    });
                    return;
                }

                GameUI.showDialog(npc.name, npc.dialogs);
                return;
            }
        }

        // Checar Placas à frente
        if (map.signs) {
            const sign = map.signs.find(s => s.x === fx && s.y === fy);
            if (sign) {
                AudioManager.playSFX('select');
                GameUI.showDialog('Placa', sign.text);
                return;
            }
        }
    },

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 480, 320);

        if (BattleEngine.active) {
            BattleEngine.draw(ctx);
            return;
        }

        const map = WorldManager.Maps[WorldManager.currentMapId];
        if (!map) return;

        // Câmera Centralizada no Jogador
        const renderPlayerX = (PlayerState.moving)
            ? (PlayerState.x - (PlayerState.dir === 2 ? -1 : PlayerState.dir === 3 ? 1 : 0) * (1 - PlayerState.moveProgress)) * 16
            : PlayerState.x * 16;
        const renderPlayerY = (PlayerState.moving)
            ? (PlayerState.y - (PlayerState.dir === 1 ? -1 : PlayerState.dir === 0 ? 1 : 0) * (1 - PlayerState.moveProgress)) * 16
            : PlayerState.y * 16;

        const camX = Math.floor(renderPlayerX - 240 + 8);
        const camY = Math.floor(renderPlayerY - 160 + 8);

        ctx.save();
        ctx.translate(-camX, -camY);

        // 1. Desenhar Camada de Tiles
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tileType = map.tiles[y][x];
                PixelArtEngine.drawTile(ctx, tileType, x * 16, y * 16, this.tick);
            }
        }

        // 2. Desenhar NPCs
        if (map.npcs) {
            map.npcs.forEach(npc => {
                PixelArtEngine.drawNPC(ctx, npc.x * 16, npc.y * 16, npc.role, npc.dir);
            });
        }

        // 3. Desenhar Jogador
        PixelArtEngine.drawPlayer(ctx, renderPlayerX, renderPlayerY, PlayerState.dir, PlayerState.walkFrame);

        ctx.restore();

        // 4. Desenhar Caixa de Diálogo
        GameUI.drawDialogBox(ctx);

        // 5. HUD de Localização Superior
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(8, 8, 140, 18);
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, 140, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText(map.name, 14, 20);
    }
};

// ============================================================================
// 12. INICIALIZAÇÃO AUTOMÁTICA
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
