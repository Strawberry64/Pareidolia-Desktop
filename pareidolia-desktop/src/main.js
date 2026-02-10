/*
  * Last modified by Aleaxngelo Orozco Gutierrez on 2-10-2026
  * Added Python execution handler and an IPC handler for the train_model.py script
*/

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.



// ============================================
// FOLDER MANAGEMENT FUNCTIONS
// ============================================



/**
 * Detects the user's operating system and returns the Documents folder path.
 * @returns {string} The full path to the user's Documents folder
 */
function getDocumentsPath() {
  const userHome = os.homedir();
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows
    return path.join(userHome, 'Documents');
  } else if (platform === 'darwin') {
    // macOS
    return path.join(userHome, 'Documents');
  } else {
    // Linux and others
    return path.join(userHome, 'Documents');
  }
}

/**
 * Gets the Pareidolia projects folder path based on the current OS.
 * @returns {string} The full path to the PareidoliaApp folder
 */
function getPareidoliaFolderPath() {
  const documentsPath = getDocumentsPath();
  return path.join(documentsPath, 'PareidoliaApp');
}

/**
 * Creates the Pareidolia folder if it doesn't already exist.
 * @returns {Promise<string>} The path to the created or existing Pareidolia folder
 */
async function ensurePareidoliaFolder() {
  const pareidoliaPath = getPareidoliaFolderPath();

  try {
    if (!fs.existsSync(pareidoliaPath)) {
      fs.mkdirSync(pareidoliaPath, { recursive: true });
      console.log(`Created Pareidolia folder at: ${pareidoliaPath}`);
    } else {
      console.log(`Pareidolia folder already exists at: ${pareidoliaPath}`);
    }
    return pareidoliaPath;
  } catch (error) {
    console.error(`Error creating Pareidolia folder: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a project folder inside the Pareidolia folder.
 * @param {string} projectName - The name of the project folder to create
 * @returns {Promise<string>} The full path to the created project folder
 */
async function createProjectFolder(projectName) {
  try {
    const pareidoliaPath = await ensurePareidoliaFolder();
    const projectPath = path.join(pareidoliaPath, projectName);

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      console.log(`Created project folder at: ${projectPath}`);
    } else {
      console.log(`Project folder already exists at: ${projectPath}`);
    }
    return projectPath;
  } catch (error) {
    console.error(`Error creating project folder: ${error.message}`);
    throw error;
  }
}

/**
 * Gets a list of all project folders in the Pareidolia folder.
 * @returns {Promise<Array>} Array of objects with name and path properties
 */
async function getProjectsList() {
  try {
    const pareidoliaPath = getPareidoliaFolderPath();
    
    if (!fs.existsSync(pareidoliaPath)) {
      return [];
    }

    const files = fs.readdirSync(pareidoliaPath);
    const projects = [];

    for (const file of files) {
      const filePath = path.join(pareidoliaPath, file);
      const stats = fs.statSync(filePath);
      
      // Only include directories
      if (stats.isDirectory()) {
        projects.push({
          name: file,
          path: filePath
        });
      }
    }

    return projects;
  } catch (error) {
    console.error(`Error getting projects list: ${error.message}`);
    throw error;
  }
}


// ============================================
// IPC HANDLERS
// ============================================

/**
 * Handle getting the projects list via IPC from renderer process
 */
ipcMain.handle('get-projects-list', async () => {
  return await getProjectsList();
});

/**
 * Handle creating a project folder via IPC from renderer process
 */
ipcMain.handle('create-project-folder', async (event, projectName) => {
  return await createProjectFolder(projectName);
});

/**
 * Handle getting the Pareidolia folder path via IPC from renderer process
 */
ipcMain.handle('get-pareidolia-path', async () => {
  return await ensurePareidoliaFolder();
});


// ============================================
// PYTHON EXECUTION HANDLERS
// ============================================

/**
 * Executes a Python script and returns the output.
 * @param {string} pythonPath - The path to the Python script
 * @param {Array} args - Command line arguments to pass to the script
 * @returns {Promise<Object>} Object with success flag, output/error, and timestamp
 * 
 * 
 * This spesific function will be used in any IPC handler involving a python script.
 * However, it is encouraged to make your own IPC handler and use this function within it instead of a
 * general purpose IPC handler for all Python scripts due to spesific needs on the images and train pages.
 */
function executePythonScript(pythonPath, args = []) {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [pythonPath, ...args]);
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0 && !error) {
        resolve({
          success: true,
          output: output.trim(),
          timestamp: new Date().toISOString()
        });
      } else {
        resolve({
          success: false,
          error: error || `Process exited with code ${code}`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    pythonProcess.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

/**
 * Handle training model execution via IPC from renderer process
 * @param {Object} event - IPC event
 * @param {Object} params - Training parameters
 * @param {string} params.projectPath - Path to the project folder
 * @param {number} params.epochs - Number of training epochs
 */
ipcMain.handle('execute-train', async (event, params) => {
  // the two parameters nessecery, more parameters are created based on the project path.
  const { projectPath, epochs } = params;
  
  // Construct paths for positives, negatives, and model within the project folder
  const positivesPath = path.join(projectPath, 'positives');
  const negativesPath = path.join(projectPath, 'negatives');
  const modelFolder = path.join(projectPath, 'model');
  const modelPath = path.join(modelFolder, 'model.keras');
  
  // Ensure the positives directory exists
  if (!fs.existsSync(positivesPath)) {
    return {
      success: false,
      error: `Positives folder not found at: ${positivesPath}`,
      timestamp: new Date().toISOString()
    };
  }
  
  // Ensure the negatives directory exists
  if (!fs.existsSync(negativesPath)) {
    return {
      success: false,
      error: `Negatives folder not found at: ${negativesPath}`,
      timestamp: new Date().toISOString()
    };
  }
  
  // Ensure the model directory exists
  if (!fs.existsSync(modelFolder)) {
    fs.mkdirSync(modelFolder, { recursive: true });
  }
  
  // Determine the correct path based on dev/production environment
  let pythonScriptPath;
  
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Development: use the root py folder
    pythonScriptPath = path.join(__dirname, '../../py/train_model.py');
  } else {
    // Production: use the bundled py folder
    pythonScriptPath = path.join(process.resourcesPath, 'py/train_model.py');
  }
  
  console.log('Python script path:', pythonScriptPath);
  console.log('Positives path:', positivesPath);
  console.log('Negatives path:', negativesPath);
  console.log('Model path:', modelPath);
  console.log('Epochs:', epochs);
  
  // Pass positives_path, negatives_path, model_path, and epochs as arguments
  return await executePythonScript(pythonScriptPath, [
    positivesPath,
    negativesPath,
    modelPath,
    epochs.toString()
  ]);
});
