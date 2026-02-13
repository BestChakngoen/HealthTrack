export default class Utils {
    static calculateDuration(start, end) {
        if (!start || !end) return 0;
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        let startDate = new Date(0, 0, 0, startH, startM);
        let endDate = new Date(0, 0, 0, endH, endM);
        if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
        return (endDate - startDate) / (1000 * 60 * 60);
    }

    static calculateBMR(w, h, a, g) {
        const s = g === 'male' ? 5 : -161;
        return (10 * w) + (6.25 * h) - (5 * a) + s;
    }

    static calculateBMI(w, h) {
        if (!w || !h) return 0;
        const hm = h / 100;
        return w / (hm * hm);
    }

    static getMinutes(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    static createDeviationBarHTML(label, value) {
        const isPositive = value >= 0;
        const displayVal = isNaN(value) ? 0 : value;
        const width = Math.min(Math.abs(displayVal) * 2, 50);
        const colorClass = displayVal === 0 ? 'text-stone-500' : isPositive ? 'text-green-600' : 'text-red-400';
        const barColor = isPositive ? 'bg-green-600' : 'bg-red-400';
        const barStyle = isPositive ? `ml-auto mr-[50%]` : `mr-auto ml-[50%]`;

        return `
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-1 text-stone-500">
                    <span>${label}</span>
                    <span class="font-num font-medium ${colorClass}">
                        ${displayVal > 0 ? '+' : ''}${displayVal.toFixed(1)}%
                    </span>
                </div>
                <div class="relative h-2 bg-stone-100 rounded-full overflow-hidden flex items-center justify-center">
                    <div class="absolute w-[1px] h-full bg-stone-300 z-10"></div>
                    <div class="h-full rounded-full ${barColor} ${barStyle}" style="width: ${width}%"></div>
                </div>
            </div>
        `;
    }
}