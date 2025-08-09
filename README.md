# Incremental Reactor (Prototype)

This is a small prototype for an incremental reactor game.  It implements a
grid‑based fission reactor where the player can place fuel cells, vents and
coolant cells.  The game runs entirely in the browser using vanilla
JavaScript and CSS.

## Running the prototype

Open `index.html` in your web browser.  The game is self‑contained and does
not require a web server.  You should see:

* A statistics panel showing current heat, power and money.
* A palette of components to select (Fuel Cell, Vent, Coolant, Delete).
* A 6×6 reactor grid where you can place components.
* Buttons to sell stored power and to start/stop the simulation.

## Gameplay

* **Fuel Cell** – produces power and heat each tick.  Fuel cells have a
  limited lifespan (about 1 minute).  Adjacent fuel cells boost each other’s
  output.  Each fuel cell costs $10.
* **Vent** – removes a small amount of heat from the reactor each tick.
  Costs $5.
* **Coolant** – stores heat but does not dissipate it.  Useful for preventing
  a melt‑down when heat spikes.  Costs $20.
* **Delete** – removes the component from the selected grid cell.

**Start** the simulation and watch heat and power accumulate.  **Sell Power**
converts all stored power into money.  When heat exceeds the reactor’s
capacity, a melt‑down occurs and all fuel cells are removed.

This prototype implements only a small subset of the planned features.  It
serves as a foundation for further development with Codex, such as adding
upgrades, additional component types, adjacency heat mechanics, prestige
systems and the fusion reactor.