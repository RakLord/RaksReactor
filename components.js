/*
 * Core classes for the incremental reactor game.  These classes implement
 * the base component types, the reactor grid and the global reactor state.
 *
 * The design follows the structure described in the accompanying game plan:
 * - ReactorComponent is the abstract base for all components.
 * - FuelCell, Vent and CoolantCell extend ReactorComponent.
 * - ReactorGrid manages placement and simulation of components on a grid.
 * - ReactorState contains global resources (heat, power, money).
 */

// Enumeration of component types for clarity
export const ComponentType = {
  FuelCell: 'fuelCell',
  Vent: 'vent',
  Coolant: 'coolant',
};

// Context passed to each component during tick
export class TickContext {
  constructor(state, grid) {
    this.state = state; // ReactorState
    this.grid = grid;   // ReactorGrid
  }
}

/**
 * Base class for all reactor components.  A component has a type,
 * cost and a position on the grid.  Subclasses implement the tick
 * method to produce heat/power or dissipate heat.
 */
export class ReactorComponent {
  constructor(type, cost) {
    this.type = type;
    this.cost = cost;
    this.x = 0;
    this.y = 0;
  }
  // Set by ReactorGrid when placed
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }
  // Perform per‑tick update; override in subclasses
  tick(ctx) {}
}

/**
 * Fuel cell component.  Produces power and heat.  Pulses depend on
 * neighbouring fuel cells and reflectors (not implemented yet).  Each
 * fuel cell has a lifespan; when it expires the cell stops producing.
 */
export class FuelCell extends ReactorComponent {
  constructor() {
    super(ComponentType.FuelCell, 10);
    this.basePower = 1;
    this.baseHeat = 1;
    this.lifespan = 15 * 60; // ticks (60 seconds) lifespan
    this.age = 0;
  }
  get pulses() {
    // Count neighbouring fuel cells to determine pulses.  Each neighbour adds one pulse.
    let count = 1; // base pulse for itself
    const neighbours = this.gridNeighbours;
    neighbours.forEach((comp) => {
      if (comp instanceof FuelCell) count += 1;
    });
    return count;
  }
  get gridNeighbours() {
    if (!this.gridRef) return [];
    return this.gridRef.getAdjacent(this.x, this.y);
  }
  tick(ctx) {
    // Skip if depleted
    if (this.age >= this.lifespan) return;
    this.age++;
    // Determine pulses
    const p = this.pulses;
    // Power and heat generation follow simplified linear model.  In the full game
    // heat generation should grow quadratically with pulses【1989524904205†L227-L244】.
    const powerGenerated = this.basePower * p;
    const heatGenerated = this.baseHeat * p;
    ctx.state.addPower(powerGenerated);
    ctx.state.addHeat(heatGenerated);
  }
}

/**
 * Vent component.  Removes heat from the system each tick.  In this
 * simplified model the vent always cools the reactor heat pool directly.
 */
export class Vent extends ReactorComponent {
  constructor() {
    super(ComponentType.Vent, 5);
    this.coolingRate = 2; // heat removed per tick
  }
  tick(ctx) {
    ctx.state.removeHeat(this.coolingRate);
  }
}

/**
 * Coolant cell component.  Stores heat up to a capacity; does not
 * dissipate heat.  Heat is distributed to coolant cells via the
 * reactor grid.  In this simplified model we treat coolant cells
 * as passively accepting heat but not cooling themselves, as in
 * Reactor Incremental【703237353381423†L114-L143】.
 */
export class CoolantCell extends ReactorComponent {
  constructor() {
    super(ComponentType.Coolant, 20);
    this.capacity = 200;
    this.storedHeat = 0;
  }
  tick(ctx) {
    // Coolant cells do not perform any active behaviour per tick.
    // Heat is stored via heat distribution (handled by ReactorGrid).
  }
  // Accept heat up to capacity and return any excess heat
  acceptHeat(amount) {
    const space = this.capacity - this.storedHeat;
    const accepted = Math.min(space, amount);
    this.storedHeat += accepted;
    return amount - accepted;
  }
}

/**
 * Reactor global state.  Tracks heat, power and money.  Provides
 * methods to modify these values with clamping.
 */
export class ReactorState {
  constructor() {
    this.heat = 0;
    this.heatCapacity = 1000;
    this.power = 0;
    this.powerCapacity = 100;
    this.money = 50;
  }
  addHeat(amount) {
    this.heat += amount;
    // Overflow remains as heat; melt‑down checks occur in game loop
  }
  removeHeat(amount) {
    this.heat = Math.max(0, this.heat - amount);
  }
  addPower(amount) {
    this.power = Math.min(this.power + amount, this.powerCapacity);
  }
  sellPower() {
    const sold = this.power;
    this.power = 0;
    // Convert power to money at a simple rate: 1 power = $1
    this.money += sold;
    return sold;
  }
}

/**
 * ReactorGrid manages the placement of components and heat distribution.
 */
export class ReactorGrid {
  constructor(width, height, state) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.state = state;
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(null);
      }
      this.cells.push(row);
    }
  }
  // Place a component at (x,y) if empty; return true if successful
  placeComponent(comp, x, y) {
    if (!this.inBounds(x, y)) return false;
    if (this.cells[y][x]) return false;
    this.cells[y][x] = comp;
    comp.setPosition(x, y);
    comp.gridRef = this;
    return true;
  }
  removeComponent(x, y) {
    if (!this.inBounds(x, y)) return;
    const comp = this.cells[y][x];
    if (!comp) return;
    this.cells[y][x] = null;
  }
  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  getAdjacent(x, y) {
    const neighbours = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (this.inBounds(nx, ny)) {
        const comp = this.cells[ny][nx];
        if (comp) neighbours.push(comp);
      }
    });
    return neighbours;
  }
  /**
   * Perform one simulation tick: update each component, then distribute heat
   * from the reactor pool into coolant cells.  Vent cooling is handled in
   * each vent's tick.
   */
  tick() {
    const ctx = new TickContext(this.state, this);
    // First run component ticks
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const comp = this.cells[y][x];
        if (comp) comp.tick(ctx);
      }
    }
    // Then distribute reactor heat to coolant cells equally
    if (this.state.heat > 0) {
      const coolantCells = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const comp = this.cells[y][x];
          if (comp instanceof CoolantCell) coolantCells.push(comp);
        }
      }
      if (coolantCells.length > 0) {
        const amountPer = this.state.heat / coolantCells.length;
        this.state.heat = 0;
        coolantCells.forEach((cell) => {
          const excess = cell.acceptHeat(amountPer);
          this.state.heat += excess;
        });
      }
    }
  }
}