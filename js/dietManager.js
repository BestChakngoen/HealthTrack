export default class DietManager {
    constructor(firebaseManager) {
        this.fb = firebaseManager;
        this.state = {
            currentFoodType: 'meal',
            targetCalories: 2000,
            foodLog: [],
            history: []
        };
        
        this.cacheDOM();
        this.bindEvents();
        this.initData();
    }

    initData() {
        this.fb.subscribe('diet', (data) => {
            if (data) {
                // Keep UI state (currentFoodType) local, sync data
                this.state.foodLog = data.foodLog || [];
                this.state.history = data.history || [];
                if(data.targetCalories) this.state.targetCalories = data.targetCalories;
                this.render();
            } else {
                this.saveData();
                this.render();
            }
        });
    }

    saveData() {
        this.fb.saveData('diet', {
            targetCalories: this.state.targetCalories,
            foodLog: this.state.foodLog,
            history: this.state.history
        });
    }

    cacheDOM() {
        this.dom = {
            foodName: document.getElementById('foodName'),
            foodCal: document.getElementById('foodCal'),
            btnAdd: document.getElementById('btnAddFood'),
            btnTypes: {
                meal: document.getElementById('btn-meal'),
                drink: document.getElementById('btn-drink'),
                snack: document.getElementById('btn-snack')
            },
            foodCount: document.getElementById('foodCount'),
            listContainer: document.getElementById('foodListContainer'),
            totalCalText: document.getElementById('totalCalToday'),
            calDeviationText: document.getElementById('calDeviationText'),
            mainProgress: document.getElementById('mainCalProgress'),
            bars: {
                meal: document.getElementById('mealBar'),
                drink: document.getElementById('drinkBar'),
                snack: document.getElementById('snackBar')
            },
            chartContainer: document.getElementById('weeklyChartContainer')
        };
    }

    bindEvents() {
        if(this.dom.btnTypes.meal) {
            Object.keys(this.dom.btnTypes).forEach(type => {
                this.dom.btnTypes[type].addEventListener('click', () => this.setFoodType(type));
            });
        }
        if(this.dom.btnAdd) this.dom.btnAdd.addEventListener('click', () => this.addFood());
        if(this.dom.listContainer) {
            this.dom.listContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action="delete"]');
                if(btn) {
                    this.removeFood(Number(btn.dataset.id));
                }
            });
        }
    }

    setTarget(calories) {
        if (this.state.targetCalories !== calories) {
            this.state.targetCalories = calories;
            this.saveData();
            this.renderProgress(); 
        }
    }

    setFoodType(type) {
        this.state.currentFoodType = type;
        Object.keys(this.dom.btnTypes).forEach(t => {
            const btn = this.dom.btnTypes[t];
            if (t === type) {
                btn.className = "flex-1 py-1 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1 bg-stone-800 text-white shadow-sm";
                if(btn.firstElementChild) btn.firstElementChild.classList.remove('text-stone-400');
            } else {
                btn.className = "flex-1 py-1 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1 text-stone-400 hover:bg-stone-100";
            }
        });
    }

    addFood() {
        const name = this.dom.foodName.value;
        const cal = this.dom.foodCal.value;
        if (!name || !cal) return;

        const newItem = {
            id: Date.now(),
            name: name,
            calories: parseInt(cal),
            category: this.state.currentFoodType
        };
        this.state.foodLog.push(newItem);
        this.dom.foodName.value = '';
        this.dom.foodCal.value = '';
        
        this.saveData();
        this.render();
    }

    removeFood(id) {
        this.state.foodLog = this.state.foodLog.filter(x => x.id !== id);
        this.saveData();
        this.render();
    }

    render() {
        this.renderList();
        this.renderProgress();
    }

    renderList() {
        if(!this.dom.foodCount) return;
        this.dom.foodCount.innerText = `${this.state.foodLog.length} รายการ`;

        if (this.state.foodLog.length === 0) {
             this.dom.listContainer.innerHTML = `
                <div class="h-32 flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-100 rounded-xl">
                    <i data-lucide="cookie" class="mb-2 opacity-50 w-6 h-6"></i>
                    <span class="text-xs">ยังไม่มีรายการอาหาร</span>
                </div>`;
        } else {
            this.dom.listContainer.innerHTML = this.state.foodLog.map(item => {
                let icon, colorClass;
                if(item.category === 'meal') { icon='utensils'; colorClass='bg-green-50 text-green-600'; }
                else if(item.category === 'drink') { icon='coffee'; colorClass='bg-blue-50 text-blue-500'; }
                else { icon='cookie'; colorClass='bg-yellow-50 text-yellow-500'; }

                return `
                    <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-100 group hover:border-stone-300 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg ${colorClass}">
                                <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
                            </div>
                            <div>
                                <div class="text-sm font-medium text-stone-700">${item.name}</div>
                                <div class="text-[10px] text-stone-400">
                                    ${item.category === 'meal' ? 'มื้อหลัก' : item.category === 'drink' ? 'เครื่องดื่ม' : 'ของว่าง'}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-num font-medium text-stone-700">${item.calories}</span>
                            <button data-action="delete" data-id="${item.id}" class="text-stone-300 hover:text-red-400 p-1">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    renderProgress() {
        if(!this.dom.totalCalText) return;

        const mealCals = this.state.foodLog.filter(f => f.category === 'meal').reduce((a, b) => a + b.calories, 0);
        const drinkCals = this.state.foodLog.filter(f => f.category === 'drink').reduce((a, b) => a + b.calories, 0);
        const snackCals = this.state.foodLog.filter(f => f.category === 'snack').reduce((a, b) => a + b.calories, 0);
        const total = mealCals + drinkCals + snackCals;
        const target = this.state.targetCalories;

        // Update text
        this.dom.totalCalText.innerText = total;
        const deviation = target > 0 ? ((total - target) / target) * 100 : 0;
        this.dom.calDeviationText.innerText = `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`;
        this.dom.calDeviationText.className = `text-lg font-num font-medium ${deviation > 10 ? 'text-red-400' : deviation > 0 ? 'text-yellow-400' : 'text-green-300'}`;

        // Update bars
        const mainPct = target > 0 ? Math.min((total / target) * 100, 100) : 0;
        this.dom.mainProgress.style.width = `${mainPct}%`;
        this.dom.mainProgress.className = `h-full rounded-full transition-width ${deviation > 10 ? 'bg-red-400' : 'bg-yellow-500'}`;

        if (total > 0) {
            this.dom.bars.meal.style.width = `${(mealCals / total) * 100}%`;
            this.dom.bars.drink.style.width = `${(drinkCals / total) * 100}%`;
            this.dom.bars.snack.style.width = `${(snackCals / total) * 100}%`;
        } else {
            Object.values(this.dom.bars).forEach(bar => bar.style.width = '0%');
        }

        this.renderWeeklyChart(total, mealCals, drinkCals, snackCals);
    }

    renderWeeklyChart(todayTotal, m, d, s) {
        const history = [...(this.state.history || []), { day: 'วันนี้', total: todayTotal, meal: m, drink: d, snack: s }];
        const maxVal = Math.max(...history.map(x => x.total), this.state.targetCalories * 1.1) || 2000;

        const barsHTML = history.slice(-7).map((d, i) => {
            const isToday = i === (history.length > 7 ? 6 : history.length - 1);
            const total = d.total || 1;
            return `
                <div class="flex-1 flex flex-col items-center gap-1 z-10 group relative h-full justify-end">
                    <div class="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-800 text-white text-[9px] p-1.5 rounded pointer-events-none whitespace-nowrap z-20 font-num">
                        ${d.total} kcal
                    </div>
                    <div class="w-full max-w-[16px] sm:max-w-[20px] bg-stone-200 rounded-t-sm overflow-hidden flex flex-col-reverse relative transition-height duration-500" style="height: ${(d.total / maxVal) * 100}%">
                            <div class="bg-green-500 w-full" style="height: ${(d.meal/total)*100}%"></div>
                            <div class="bg-blue-400 w-full" style="height: ${(d.drink/total)*100}%"></div>
                            <div class="bg-yellow-400 w-full" style="height: ${(d.snack/total)*100}%"></div>
                    </div>
                    <span class="text-[9px] ${isToday ? 'font-bold text-stone-700' : 'text-stone-400'}">${d.day}</span>
                </div>
            `;
        }).join('');

        this.dom.chartContainer.innerHTML = `
                <div class="p-4 bg-stone-50 rounded-2xl border border-stone-100 w-full">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xs uppercase tracking-wider text-stone-400 flex items-center gap-2">
                        <i data-lucide="bar-chart-3" class="w-3 h-3"></i> สรุปแคลอรี่ 7 วันล่าสุด
                    </h4>
                </div>
                <div class="flex items-end justify-between h-32 gap-2 pb-2 border-b border-stone-200/50 relative">
                    <div class="absolute w-full border-t border-dashed border-stone-300 z-0 opacity-50" style="bottom: ${(this.state.targetCalories/maxVal)*100}%"></div>
                    ${barsHTML}
                </div>
                <div class="flex justify-center gap-3 text-[9px] text-stone-400 mt-2">
                    <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>มื้อหลัก</div>
                    <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>ดื่ม</div>
                    <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>ของว่าง</div>
                </div>
            </div>
        `;
    }
}