import SleepManager from './sleepManager.js';
import BodyManager from './bodyManager.js';
import DietManager from './dietManager.js';

class App {
    constructor() {
        this.init();
    }

    init() {
        console.log("Initializing App...");
        
        // Initialize DietManager first
        this.dietManager = new DietManager();

        // Initialize BodyManager and subscribe DietManager to target updates
        this.bodyManager = new BodyManager((newTarget) => {
            this.dietManager.setTarget(newTarget);
        });

        // Initialize SleepManager
        this.sleepManager = new SleepManager();

        // Initial Icon Render
        lucide.createIcons();
        console.log("App Initialized Successfully");
    }
}

// Start the App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});