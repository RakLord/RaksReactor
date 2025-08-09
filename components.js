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

/**
 * Enumeration of component types for clarity.
 * @readonly
 * @enum {string}
 */
export const ComponentType = {
  FuelCell: 'fuelCell',
  Vent: 'vent',
  Coolant: 'coolant',
};

/**
 * Context passed to each component during tick containing global state
 * and the owning grid.
 */
export class TickContext {
  /**
   * @param {ReactorState} state Global reactor state
   * @param {ReactorGrid} grid Reactor grid instance
   */
  constructor(state, grid) {
    /** @type {ReactorState} */
    this.state = state;
    /** @type {ReactorGrid} */
    this.grid = grid;
  }
}

/**
 * Base class for all reactor components.  A component has a type,
 * cost and a position on the grid.  Subclasses implement the tick
 * method to produce heat/power or dissipate heat.
 */
export class ReactorComponent {
  /**
   * @param {ComponentType[keyof ComponentType]} type Component identifier
   * @param {number} cost Build cost in dollars
   */
  constructor(type, cost) {
    /** @type {ComponentType[keyof ComponentType]} */
    this.type = type;
    /** @type {number} */
    this.cost = cost;
    /** @type {number} */
    this.x = 0;
    /** @type {number} */
    this.y = 0;
  }
  /**
   * Set the grid position for this component.
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }
  /**
   * Perform per‑tick update; override in subclasses.
   * @param {TickContext} ctx
   */
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
    /** @type {number} */
    this.basePower = 1;
    /** @type {number} */
    this.baseHeat = 1;
    /** @type {number} */
    this.lifespan = 15 * 60; // ticks (60 seconds) lifespan
    /** @type {number} */
    this.age = 0;
  }
  /**
   * Number of pulses determined by neighbouring fuel cells.
   * @type {number}
   */
  get pulses() {
    // Count neighbouring fuel cells to determine pulses.  Each neighbour adds one pulse.
    let count = 1; // base pulse for itself
    const neighbours = this.gridNeighbours;
    neighbours.forEach((comp) => {
      if (comp instanceof FuelCell) count += 1;
    });
    return count;
  }
  /**
   * Adjacent components on the grid.
   * @type {ReactorComponent[]}
   */
  get gridNeighbours() {
    if (!this.gridRef) return [];
    return this.gridRef.getAdjacent(this.x, this.y);
  }
  /**
   * Produce power and heat for one tick.
   * @param {TickContext} ctx
   */
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
    /** @type {number} */
    this.coolingRate = 2; // heat removed per tick
  }
  /**
   * Remove heat from the reactor state.
   * @param {TickContext} ctx
   */
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
    /** @type {number} */
    this.capacity = 200;
    /** @type {number} */
    this.storedHeat = 0;
  }
  /**
   * Coolant cells do not perform any active behaviour per tick.
   * @param {TickContext} ctx
   */
  tick(ctx) {
    // Heat is stored via heat distribution (handled by ReactorGrid).
  }
  /**
   * Accept heat up to capacity and return any excess heat.
   * @param {number} amount
   * @returns {number} Excess heat not stored
   */
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
    /** @type {number} */
    this.heat = 0;
    /** @type {number} */
    this.heatCapacity = 1000;
    /** @type {number} */
    this.power = 0;
    /** @type {number} */
    this.powerCapacity = 100;
    /** @type {number} */
    this.money = 50;
  }
  /**
   * Increase reactor heat.
   * @param {number} amount
   */
  addHeat(amount) {
    this.heat += amount;
    // Overflow remains as heat; melt‑down checks occur in game loop
  }
  /**
   * Remove heat from the reactor.
   * @param {number} amount
   */
  removeHeat(amount) {
    this.heat = Math.max(0, this.heat - amount);
  }
  /**
   * Add power up to capacity.
   * @param {number} amount
   */
  addPower(amount) {
    this.power = Math.min(this.power + amount, this.powerCapacity);
  }
  /**
   * Convert stored power into money.
   * @returns {number} Amount of power sold
   */
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
  /**
   * @param {number} width Grid width in cells
   * @param {number} height Grid height in cells
   * @param {ReactorState} state Owning reactor state
   */
  constructor(width, height, state) {
    /** @type {number} */
    this.width = width;
    /** @type {number} */
    this.height = height;
    /** @type {(ReactorComponent|null)[][]} */
    this.cells = [];
    /** @type {ReactorState} */
    this.state = state;
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(null);
      }
      this.cells.push(row);
    }
  }
  /**
   * Place a component at (x,y) if empty.
   * @param {ReactorComponent} comp
   * @param {number} x
   * @param {number} y
   * @returns {boolean} True if placement succeeded
   */
  placeComponent(comp, x, y) {
    if (!this.inBounds(x, y)) return false;
    if (this.cells[y][x]) return false;
    this.cells[y][x] = comp;
    comp.setPosition(x, y);
    comp.gridRef = this;
    return true;
  }
  /**
   * Remove a component at the specified location.
   * @param {number} x
   * @param {number} y
   */
  removeComponent(x, y) {
    if (!this.inBounds(x, y)) return;
    const comp = this.cells[y][x];
    if (!comp) return;
    this.cells[y][x] = null;
  }
  /**
   * Check if coordinates fall within the grid bounds.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  /**
   * Retrieve adjacent components for a cell.
   * @param {number} x
   * @param {number} y
   * @returns {ReactorComponent[]}
   */
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
