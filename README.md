# Incremental Reactor (Prototype)

This is a small prototype for an incremental reactor game.  It implements a
  grid‑based fission reactor where the player can place uranium fuel cells,
  water and coolant cells.  The game runs entirely in the browser using vanilla
  JavaScript and CSS.

## Running the prototype

Open `index.html` in your web browser.  The game is self‑contained and does
not require a web server.  You should see:

  * A statistics panel showing current heat, power and money.
  * A palette of components to select (U‑238 Cell, U‑235 Cell, Water, Coolant, Delete).
* A 6×6 reactor grid where you can place components.
* Buttons to sell stored power and to start/stop the simulation.

## Gameplay

 * **U‑238 Cell** – produces power and heat each tick.  Fuel cells have a
   limited lifespan (about 1 minute).  Adjacent fuel cells boost each other’s
   output.  Costs $10.
 * **U‑235 Cell** – a more efficient fuel cell variant that produces twice the
   power and heat.  Costs $15.
 * **Water Cell** – absorbs a small amount of heat from adjacent fuel cells each
   tick.  Costs $5.
 * **Coolant** – stores heat but does not dissipate it.  Useful for preventing
   a melt‑down when heat spikes.  Costs $20.
 * **Delete** – removes the component from the selected grid cell.

The simulation begins running immediately.  Use **Pause** to stop it and
resume later.  **Sell Power**
  converts all stored power into money.  Heat and power are capped at their
  respective capacities.  When heat reaches capacity, a melt‑down occurs and all
  fuel cells are removed.  If power reaches capacity, the reactor overloads and
all components are destroyed.

This prototype implements only a small subset of the planned features.  It
serves as a foundation for further development with Codex, such as adding
upgrades, additional component types, adjacency heat mechanics, prestige
systems and the fusion reactor.