import Utils from './utils.js';

export default class BodyManager {
    constructor(firebaseManager, onTargetChange) {
        this.fb = firebaseManager;
        this.state = {
            weight: 65,
            height: 170,
            age: 28,
            gender: 'male',
            activityLevel: 1.2,
            targetWeight: 60,
            weightHistory: [] 
        };
        this.onTargetChange = onTargetChange;
        
        this.cacheDOM();
        this.bindEvents();
        this.initData();
    }

    initData() {
        this.fb.subscribe('body', (data) => {
            if (data) {
                this.state = { ...this.state, ...data };
                this.updateInputs();
                this.render();
            } else {
                this.saveData();
                this.render();
            }
        });
    }

    saveData() {
        this.fb.saveData('body', this.state);
    }

    updateInputs() {
        if(this.dom.weight) this.dom.weight.value = this.state.weight;
        if(this.dom.height) this.dom.height.value = this.state.height;
        if(this.dom.age) this.dom.age.value = this.state.age;
        if(this.dom.gender) this.dom.gender.value = this.state.gender;
        if(this.dom.activityLevel) this.dom.activityLevel.value = this.state.activityLevel;
        if(this.dom.targetWeight) this.dom.targetWeight.value = this.state.targetWeight;
    }

    cacheDOM() {
        this.dom = {
            weight: document.getElementById('weightInput'),
            btnRecordWeight: document.getElementById('btnRecordWeight'),
            height: document.getElementById('heightInput'),
            age: document.getElementById('ageInput'),
            gender: document.getElementById('genderInput'),
            activityLevel: document.getElementById('activityLevelInput'),
            targetWeight: document.getElementById('targetWeightInput'),
            weightChartContainer: document.getElementById('weightChartContainer'),
            bmiValue: document.getElementById('bmiValue'),
            bmiLabel: document.getElementById('bmiLabel'),
            bmrValue: document.getElementById('bmrValue'),
            targetCalValue: document.getElementById('targetCalValue'),
            targetIndicator: document.getElementById('targetIndicator')
        };
    }

    bindEvents() {
        if(this.dom.weight) this.dom.weight.value = this.state.weight;
        
        const updateState = (key, val) => {
            this.state[key] = key === 'gender' ? val : Number(val);
            this.saveData();
            this.render();
        };

        if(this.dom.weight) this.dom.weight.addEventListener('change', (e) => updateState('weight', e.target.value));
        if(this.dom.height) this.dom.height.addEventListener('change', (e) => updateState('height', e.target.value));
        if(this.dom.age) this.dom.age.addEventListener('change', (e) => updateState('age', e.target.value));
        if(this.dom.gender) this.dom.gender.addEventListener('change', (e) => updateState('gender', e.target.value));
        if(this.dom.activityLevel) this.dom.activityLevel.addEventListener('change', (e) => updateState('activityLevel', e.target.value));
        if(this.dom.targetWeight) this.dom.targetWeight.addEventListener('change', (e) => updateState('targetWeight', e.target.value));

        if(this.dom.btnRecordWeight) {
            this.dom.btnRecordWeight.addEventListener('click', () => {
                this.recordWeight();
            });
        }
    }

    recordWeight() {
        const currentWeight = Number(this.dom.weight.value);
        if(!currentWeight) return;

        const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        this.state.weightHistory = this.state.weightHistory || [];
        this.state.weightHistory = this.state.weightHistory.filter(h => h.day !== 'วันนี้' && h.day !== today);
        this.state.weightHistory.push({ day: today, weight: currentWeight });
        
        this.state.weight = currentWeight;
        this.saveData();
        this.render(); 
        
        this.dom.btnRecordWeight.classList.add('text-green-600');
        setTimeout(() => this.dom.btnRecordWeight.classList.remove('text-green-600'), 1000);
    }

    render() {
        const bmi = Utils.calculateBMI(this.state.weight, this.state.height);
        let bmiInfo = { label: 'อ้วน', color: 'text-red-500' };
        if (bmi < 18.5) bmiInfo = { label: 'ผอม', color: 'text-red-400' };
        else if (bmi < 23) bmiInfo = { label: 'ปกติ', color: 'text-green-600' };
        else if (bmi < 25) bmiInfo = { label: 'ท้วม', color: 'text-yellow-600' };

        if(this.dom.bmiValue) this.dom.bmiValue.innerText = bmi.toFixed(1);
        if(this.dom.bmiLabel) {
            this.dom.bmiLabel.innerText = bmiInfo.label;
            this.dom.bmiLabel.className = `text-[9px] ${bmiInfo.color}`;
        }

        const bmr = Utils.calculateBMR(this.state.weight, this.state.height, this.state.age, this.state.gender);
        const tdee = bmr * this.state.activityLevel;

        let targetCal = tdee;
        let statusText = "รักษาน้ำหนัก";
        let statusColor = "text-stone-500 bg-stone-200";

        if (this.state.targetWeight < this.state.weight) {
            targetCal = tdee - 500;
            statusText = "ลดน้ำหนัก";
            statusColor = "text-green-600 bg-green-100";
        } else if (this.state.targetWeight > this.state.weight) {
            targetCal = tdee + 500;
            statusText = "เพิ่มน้ำหนัก";
            statusColor = "text-yellow-600 bg-yellow-100";
        }

        if (targetCal < 1200 && this.state.targetWeight < this.state.weight) targetCal = 1200;

        if(this.dom.bmrValue) this.dom.bmrValue.innerText = Math.round(bmr);
        if(this.dom.targetCalValue) this.dom.targetCalValue.innerText = Math.round(targetCal);

        if(this.dom.targetIndicator) {
             this.dom.targetIndicator.innerText = statusText;
             this.dom.targetIndicator.className = `absolute top-4 right-4 text-[9px] px-2 py-0.5 rounded-full font-medium ${statusColor}`;
             this.dom.targetIndicator.classList.remove('hidden');
        }

        this.renderWeightChart();

        if(this.onTargetChange) this.onTargetChange(Math.round(targetCal));
    }

    renderWeightChart() {
        if (!this.dom.weightChartContainer) return;

        const data = [...(this.state.weightHistory || []), { day: 'วันนี้', weight: this.state.weight }];
        
        const weights = data.map(d => d.weight);
        const minW = Math.min(...weights, this.state.targetWeight) - 1;
        const maxW = Math.max(...weights, this.state.targetWeight) + 1;
        const range = maxW - minW || 1;

        const points = data.map((d, i) => {
            const x = (i / (data.length > 1 ? data.length - 1 : 1)) * 100;
            const y = 100 - ((d.weight - minW) / range) * 100; 
            return `${x},${y}`;
        }).join(' ');

        const targetY = 100 - ((this.state.targetWeight - minW) / range) * 100;

        const dots = data.map((d, i) => {
            const x = (i / (data.length > 1 ? data.length - 1 : 1)) * 100;
            const y = 100 - ((d.weight - minW) / range) * 100;
            const isToday = i === data.length - 1;
            return `
                <div class="absolute w-2 h-2 rounded-full border border-white ${isToday ? 'bg-stone-800 w-3 h-3' : 'bg-stone-400'} group hover:scale-150 transition-transform"
                     style="left: ${x}%; top: ${y}%; transform: translate(-50%, -50%);"
                     title="${d.day}: ${d.weight}kg">
                </div>
                <div class="absolute text-[8px] text-stone-400 ${isToday ? 'font-bold text-stone-700' : ''}" 
                     style="left: ${x}%; bottom: -15px; transform: translateX(-50%);">
                    ${d.day}
                </div>
            `;
        }).join('');

        this.dom.weightChartContainer.innerHTML = `
            <div class="flex justify-between items-center mb-2 px-1">
                <h4 class="text-xs font-medium text-stone-500 flex items-center gap-2">
                    <i data-lucide="trending-up" class="w-3 h-3"></i> แนวโน้มน้ำหนัก
                </h4>
            </div>
            <div class="relative h-[80px] w-full mt-2 mb-4">
                <div class="absolute w-full border-t border-dashed border-green-400/50 z-0" style="top: ${Math.min(Math.max(targetY, 0), 100)}%;">
                    <span class="absolute right-0 -top-3 text-[8px] text-green-600 bg-stone-50/80 px-1">เป้า ${this.state.targetWeight}</span>
                </div>
                
                <svg class="absolute inset-0 w-full h-full z-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline points="${points}" fill="none" stroke="#a8a29e" stroke-width="2" vector-effect="non-scaling-stroke" />
                </svg>

                ${dots}
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();
    }
}