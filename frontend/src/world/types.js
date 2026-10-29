/**
 * JSDoc Typedefs for Gridwise 3D Simulation
 * @module world/types
 */

/**
 * @typedef {'solar' | 'wind' | 'utility' | 'hub' | 'residential' | 'commercial' | 'industrial' | 'ev' | 'water' | 'hvac' | 'hospital'} NodeId
 */

/**
 * @typedef {'source' | 'hub' | 'load'} NodeKind
 */

/**
 * @typedef {'P' | 'E' | 'S' | 'O'} DataBadge
 * P = predicted (household forecast)
 * E = estimated (engineering curves from weather)
 * S = simulated (Pune city loads/tariffs before optimization)
 * O = optimized (LP output)
 */

/**
 * @typedef {Object} RunRow
 * @property {string} timestamp
 * @property {number} index
 * @property {number} temperature_c
 * @property {number} irradiance_wm2
 * @property {number} wind_ms
 * @property {number} solar_mw
 * @property {number} wind_mw
 * @property {number} renewable_mw
 * @property {number} supply_capacity_mw
 * @property {number} tariff_inr_kwh
 * @property {number} demand_before
 * @property {number} demand_after
 * @property {number} renewable_used_before
 * @property {number} renewable_used_after
 * @property {number} grid_import_before
 * @property {number} grid_import_after
 * @property {number} unmet_before
 * @property {number} unmet_after
 * @property {number} surplus_before
 * @property {number} surplus_after
 * @property {Object.<string, number>} loads_before
 * @property {Object.<string, number>} loads_after
 * @property {Object.<string, number>} delivered_before
 * @property {Object.<string, number>} delivered_after
 * @property {number} anomaly_score
 * @property {number} injected_extra_mw
 * @property {number} [baseline_kw]
 * @property {number} [lstm_kw]
 * @property {number} [transformer_kw]
 */

/**
 * @typedef {Object} DerivedFlows
 * @property {number} solar
 * @property {number} wind
 * @property {number} utility
 * @property {Object.<string, number>} load
 * @property {number} curtailedSolar
 * @property {number} curtailedWind
 * @property {Object.<string, number>} served
 * @property {Object.<string, number>} heat
 * @property {number} gridUse
 */

/**
 * @typedef {Object} SiteLayout
 * @property {NodeId} id
 * @property {string} name
 * @property {NodeKind} kind
 * @property {number} svgX
 * @property {number} svgY
 * @property {number} x
 * @property {number} z
 * @property {number[][]} footprint
 * @property {number} orientation
 * @property {Object.<string, any>} parts
 */

export {};
