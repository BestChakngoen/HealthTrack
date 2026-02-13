import Utils from './utils.js';

export default class SleepManager {
    constructor(firebaseManager) {
        this.fb = firebaseManager;
        this.state = {
            bedTime: '22:00',
            wakeTime: '06:00',
            history: []
        };
        this.targets = {
            min: 7.5,
            max: 9.0,
            bedTime: '21:30',
            wakeTime: '05:30'
        };
        
        this.cacheDOM();
        this.bindEvents();
        this.initData(); 
    }

    initData() {
        this.fb.subscribe('sleep', (data) => {
            if (data) {
                // Merge data
                this.state = { ...this.state, ...data };
                
                // Update Inputs
                if(this.dom.bedTimeInput) this.dom.bedTimeInput.value = this.state.bedTime;
                if(this.dom.wakeTimeInput) this.dom.wakeTimeInput.value = this.state.wakeTime;
                
                this.render();
            } else {
                // First time setup
                this.saveData();
                this.render();
            }
        });
    }

    saveData() {
        this.fb.saveData('sleep', this.state);
    }

    cacheDOM() {
        this.dom = {
            bedTimeInput: document.getElementById('bedTimeInput'),
            wakeTimeInput: document.getElementById('wakeTimeInput'),
            durationText: document.getElementById('sleepDurationText'),
            progressCircle: document.getElementById('sleepProgressCircle'),
            deviations: document.getElementById('sleepDeviations'),
            patternChart: document.getElementById('sleepPatternChart')
        };
    }

    bindEvents() {
        if(this.dom.bedTimeInput) this.dom.bedTimeInput.value = this.state.bedTime;
        if(this.dom.wakeTimeInput) this.dom.wakeTimeInput.value = this.state.wakeTime;

        if(this.dom.bedTimeInput) {
            this.dom.bedTimeInput.addEventListener('change', (e) => {
                this.state.bedTime = e.target.value;
                this.saveData(); 
                this.render();
            });
        }
        if(this.dom.wakeTimeInput) {
            this.dom.wakeTimeInput.addEventListener('change', (e) => {
                this.state.wakeTime = e.target.value;
                this.saveData();
                this.render();
            });
        }
    }

    render() {
        const duration = Utils.calculateDuration(this.state.bedTime, this.state.wakeTime);
        const deviation = ((duration - 8.25) / 8.25) * 100; // Approx target avg

        if(this.dom.durationText) this.dom.durationText.innerText = duration.toFixed(1);
        
        if(this.dom.progressCircle) {
            const circumference = 251.2;
            const offset = circumference - (Math.min(duration/10, 1) * circumference);
            this.dom.progressCircle.style.strokeDashoffset = offset;
            this.dom.progressCircle.setAttribute('stroke', (duration >= this.targets.min && duration <= this.targets.max) ? "#7A8C7A" : "#BC7F75");
        }

        const bedTimeMins = Utils.getMinutes(this.state.bedTime) < 720 ? Utils.getMinutes(this.state.bedTime) + 1440 : Utils.getMinutes(this.state.bedTime);
        const targetBedMins = Utils.getMinutes(this.targets.bedTime);
        const scheduleDev = ((bedTimeMins - targetBedMins) / 60) * 100 / 4; 

        if(this.dom.deviations) {
            this.dom.deviations.innerHTML = `
                ${Utils.createDeviationBarHTML("ระยะเวลานอน", deviation)}
                ${Utils.createDeviationBarHTML("เวลาเข้านอน", scheduleDev)}
            `;
        }

        this.renderGraph(duration);
    }

    renderGraph(currentDuration) {
        if(!this.dom.patternChart) return;

        const history = [...(this.state.history || []), { 
            day: 'วันนี้', 
            bedTime: this.state.bedTime, 
            wakeTime: this.state.wakeTime, 
            duration: currentDuration 
        }];

        const timeToY = (t) => {
            const [h, m] = t.split(':').map(Number);
            let mins = h * 60 + m;
            if (h >= 20) mins -= (20 * 60);
            else mins += (4 * 60);
            return (mins / (14 * 60)) * 100;
        };

        const targetBedY = timeToY(this.targets.bedTime);
        const targetWakeY = timeToY(this.targets.wakeTime);
        
        const barsHTML = history.slice(-7).map((d, i) => {
            const startY = timeToY(d.bedTime);
            const endY = timeToY(d.wakeTime);
            const height = endY - startY;
            const isToday = i === (history.length > 7 ? 6 : history.length - 1);
            return `
                <div class="flex-1 h-full relative group">
                    <div class="absolute w-3 sm:w-4 rounded-full left-1/2 -translate-x-1/2 transition-all hover:w-5 hover:z-10 ${isToday ? 'bg-stone-700' : 'bg-stone-300'}"
                            style="top: ${startY}%; height: ${height}%"
                            title="${d.bedTime} - ${d.wakeTime}"></div>
                    <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] ${isToday ? 'font-bold text-stone-700' : 'text-stone-400'}">
                        ${d.day}
                    </div>
                </div>
            `;
        }).join('');

        this.dom.patternChart.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs uppercase tracking-wider text-stone-400 flex items-center gap-2">
                    <i data-lucide="history" class="w-3 h-3"></i> กราฟเวลาเข้านอน-ตื่นนอน
                </h4>
            </div>
            <div class="relative h-[150px] w-full flex items-end justify-between gap-1 border-l border-b border-stone-200">
                <div class="absolute w-full border-t border-green-300/30 text-[9px] text-green-600 font-num" style="top: ${targetBedY}%"><span class="absolute right-0 -top-3 opacity-50">เข้า ${this.targets.bedTime}</span></div>
                <div class="absolute w-full border-t border-green-300/30 text-[9px] text-green-600 font-num" style="top: ${targetWakeY}%"><span class="absolute right-0 -top-3 opacity-50">ตื่น ${this.targets.wakeTime}</span></div>
                ${barsHTML}
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();
    }
}