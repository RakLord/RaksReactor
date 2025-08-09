import { ComponentType, FuelCell, Vent, CoolantCell, ReactorState, ReactorGrid } from './components.js';

/**
 * Main entry point wiring DOM controls to reactor simulation classes.
 * JSDoc annotations document types for scalability.
 */

// Global state
/** @type {ReactorState} */
const state = new ReactorState();
// Create a 6x6 reactor grid
const gridSize = 6;
/** @type {ReactorGrid} */
const grid = new ReactorGrid(gridSize, gridSize, state);

// DOM references
/** @type {HTMLElement} */
const gridElement = document.getElementById('grid');
/** @type {HTMLElement} */
const heatDisplay = document.getElementById('heat-display');
/** @type {HTMLElement} */
const heatCapacityDisplay = document.getElementById('heat-capacity');
/** @type {HTMLElement} */
const powerDisplay = document.getElementById('power-display');
/** @type {HTMLElement} */
const powerCapacityDisplay = document.getElementById('power-capacity');
/** @type {HTMLElement} */
const moneyDisplay = document.getElementById('money-display');
/** @type {HTMLButtonElement} */
const sellButton = document.getElementById('sell-power');
/** @type {HTMLButtonElement} */
const toggleRunButton = document.getElementById('toggle-run');

// Populate grid DOM
/**
 * Populate the grid container with clickable cells.
 */
function createGrid() {
  gridElement.style.setProperty('--grid-size', gridSize);
  gridElement.innerHTML = '';
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cellDiv = document.createElement('div');
      cellDiv.classList.add('grid-cell');
      cellDiv.dataset.x = x;
      cellDiv.dataset.y = y;
      cellDiv.addEventListener('click', onGridClick);
      gridElement.appendChild(cellDiv);
    }
  }
}

// Palette handling
/** @type {string|null} */
let selectedComponent = null;
const paletteButtons = document.querySelectorAll('.component-button');
paletteButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    paletteButtons.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedComponent = btn.dataset.component;
  });
});

/**
 * Handle placing/removing components when the grid is clicked.
 * @param {MouseEvent} e
 */
function onGridClick(e) {
  const x = parseInt(e.currentTarget.dataset.x, 10);
  const y = parseInt(e.currentTarget.dataset.y, 10);
  if (!selectedComponent) return;
  if (selectedComponent === 'delete') {
    grid.removeComponent(x, y);
    updateGridDisplay();
    return;
  }
  // Determine component class based on selectedComponent
  let comp;
  switch (selectedComponent) {
    case 'fuelCell':
      if (state.money < 10) return; // not enough money
      comp = new FuelCell();
      break;
    case 'vent':
      if (state.money < 5) return;
      comp = new Vent();
      break;
    case 'coolant':
      if (state.money < 20) return;
      comp = new CoolantCell();
      break;
    default:
      return;
  }
  const placed = grid.placeComponent(comp, x, y);
  if (placed) {
    state.money -= comp.cost;
    updateGridDisplay();
    updateStats();
  }
}

// Update the DOM representation of the grid
/**
 * Update the DOM representation of the reactor grid.
 */
function updateGridDisplay() {
  const cells = gridElement.querySelectorAll('.grid-cell');
  cells.forEach((cellDiv) => {
    const x = parseInt(cellDiv.dataset.x, 10);
    const y = parseInt(cellDiv.dataset.y, 10);
    const comp = grid.cells[y][x];
    cellDiv.classList.remove(...Object.values(ComponentType));
    if (comp) {
      cellDiv.classList.add(comp.type);
      // Display a simple initial for the component
      switch (comp.type) {
        case ComponentType.FuelCell:
          cellDiv.textContent = 'F';
          break;
        case ComponentType.Vent:
          cellDiv.textContent = 'V';
          break;
        case ComponentType.Coolant:
          cellDiv.textContent = 'C';
          break;
        default:
          cellDiv.textContent = '';
      }
    } else {
      cellDiv.textContent = '';
    }
  });
}

// Update stats display
/**
 * Update displayed heat, power and money stats.
 */
function updateStats() {
  heatDisplay.textContent = Math.floor(state.heat);
  heatCapacityDisplay.textContent = state.heatCapacity;
  powerDisplay.textContent = Math.floor(state.power);
  powerCapacityDisplay.textContent = state.powerCapacity;
  moneyDisplay.textContent = state.money.toFixed(0);
}

// Sell power handler
sellButton.addEventListener('click', () => {
  state.sellPower();
  updateStats();
});

let running = false;
let tickInterval = null;
toggleRunButton.addEventListener('click', () => {
  running = !running;
  toggleRunButton.textContent = running ? 'Pause' : 'Start';
  if (running) {
    tickInterval = setInterval(gameTick, 1000);
  } else {
    clearInterval(tickInterval);
    tickInterval = null;
  }
});

/**
 * Advance the reactor simulation by one tick and update UI.
 */
function gameTick() {
  // Run simulation
  grid.tick();
  // Check for overheat; if heat exceeds capacity, remove all fuel cells and reset heat
  if (state.heat > state.heatCapacity) {
    alert('Reactor Meltdown! All fuel cells destroyed.');
    // Remove all fuel cells but leave other components
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const comp = grid.cells[y][x];
        if (comp instanceof FuelCell) {
          grid.removeComponent(x, y);
        }
      }
    }
    state.heat = 0;
  }
  updateStats();
  updateGridDisplay();
}

// Initial setup
createGrid();
updateStats();
updateGridDisplay();
