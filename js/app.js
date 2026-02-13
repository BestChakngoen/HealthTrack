import FirebaseManager from './firebase.js';
import SleepManager from './sleepManager.js';
import BodyManager from './bodyManager.js';
import DietManager from './dietManager.js';

class App {
    constructor() {
        this.dom = {
            loginView: document.getElementById('login-view'),
            appView: document.getElementById('app-view'),
            btnLogin: document.getElementById('btnLogin'),
            btnLogout: document.getElementById('btnLogout'),
            userName: document.getElementById('userName'),
            userAvatar: document.getElementById('userAvatar'),
            loginError: document.getElementById('loginError')
        };
        
        this.init();
    }

    init() {
        console.log("Initializing App...");
        
        // Initialize Firebase Manager
        this.firebaseManager = new FirebaseManager((user) => this.handleAuthChange(user));

        // Bind Auth Buttons
        this.dom.btnLogin.addEventListener('click', () => this.handleLogin());
        this.dom.btnLogout.addEventListener('click', () => this.firebaseManager.logout());
        
        lucide.createIcons();
    }

    handleAuthChange(user) {
        if (user) {
            this.showApp(user);
        } else {
            this.showLogin();
        }
    }

    async handleLogin() {
        try {
            this.dom.loginError.classList.add('hidden');
            this.dom.btnLogin.innerHTML = `<span class="animate-spin mr-2">⏳</span> Signing in...`;
            await this.firebaseManager.loginWithGoogle();
        } catch (error) {
            console.error(error);
            this.dom.loginError.innerText = "Login failed. Please try again.";
            this.dom.loginError.classList.remove('hidden');
            this.dom.btnLogin.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5 bg-white rounded-full p-0.5 mr-2"><span class="font-medium">Sign in with Google</span>`;
        }
    }

    showApp(user) {
        // UI Updates
        this.dom.loginView.classList.add('hidden');
        this.dom.appView.classList.remove('hidden');
        setTimeout(() => this.dom.appView.classList.remove('opacity-0'), 50);

        this.dom.userName.innerText = user.displayName || user.email || 'User';
        if(user.photoURL) this.dom.userAvatar.src = user.photoURL;

        // Initialize Managers with FirebaseManager Instance
        if (!this.dietManager) {
            console.log("Starting Managers...");
            
            this.dietManager = new DietManager(this.firebaseManager);
            
            this.bodyManager = new BodyManager(this.firebaseManager, (newTarget) => {
                this.dietManager.setTarget(newTarget);
            });

            this.sleepManager = new SleepManager(this.firebaseManager);
        }
    }

    showLogin() {
        this.dom.appView.classList.add('hidden', 'opacity-0');
        this.dom.loginView.classList.remove('hidden');
        
        this.dietManager = null;
        this.bodyManager = null;
        this.sleepManager = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});