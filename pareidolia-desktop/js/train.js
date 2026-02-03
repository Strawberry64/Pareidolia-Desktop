// Get project name, page value, and project path from sessionStorage
const projectName = sessionStorage.getItem('projectName') || 'Project';
const pageValue = sessionStorage.getItem('pageValue') || 'Page';
const projectPath = sessionStorage.getItem('projectPath') || 'No path';

// Display in navbar
document.getElementById('navbar-name').textContent = projectName;
document.getElementById('navbar-path').textContent = projectPath;

// Slider elements
const epochSlider = document.getElementById('epoch-slider');
const epochValue = document.getElementById('epoch-value');

// Update epoch value display when slider changes
epochSlider.addEventListener('input', () => {
    epochValue.textContent = epochSlider.value;
});

// Training button and popup elements
const startTrainingBtn = document.getElementById('start-training-btn');
const resultPopup = document.getElementById('result-popup');
const overlay = document.getElementById('overlay');
const closePopupBtn = document.getElementById('close-popup-btn');
const resultValueEl = document.getElementById('result-value');
const resultMessageEl = document.getElementById('result-message');

// Function to call Python API
async function callPythonAPI(command) {
    try {
        // Check if we're in Electron environment with Python bridge
        if (window.electronAPI && window.electronAPI.callPython) {
            const result = await window.electronAPI.callPython(command);
            return result;
        } else {
            // Fallback for browser testing only
            console.warn('Electron API not available - running in browser mode');
            const randomValue = Math.floor(Math.random() * 10) + 1;
            return {
                success: true,
                value: randomValue,
                message: `(Browser fallback) Random value: ${randomValue}`
            };
        }
    } catch (error) {
        console.error('Error calling Python:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Start Training button click handler
startTrainingBtn.addEventListener('click', async () => {
    const epochs = epochSlider.value;
    console.log(`Starting training with ${epochs} epochs...`);
    
    // Call Python API with 'random' command
    const result = await callPythonAPI('random');
    
    // Display result in popup
    if (result.success) {
        console.log('Python call succeeded! Random value:', result.value);
        resultValueEl.textContent = result.value;
        resultMessageEl.textContent = result.message;
    } else {
        console.error('Python call failed:', result.error);
        resultValueEl.textContent = '!';
        resultMessageEl.textContent = `Error: ${result.error}`;
    }
    
    // Show popup
    resultPopup.classList.add('show');
    overlay.classList.add('show');
});

// Close popup handlers
closePopupBtn.addEventListener('click', () => {
    resultPopup.classList.remove('show');
    overlay.classList.remove('show');
});

overlay.addEventListener('click', () => {
    resultPopup.classList.remove('show');
    overlay.classList.remove('show');
});

// Close popup with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        resultPopup.classList.remove('show');
        overlay.classList.remove('show');
    }
});
