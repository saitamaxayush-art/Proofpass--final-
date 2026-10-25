/**
 * Recommendations Package Entry Point
 */

export * from './config.js'
export * from './normalize.js'
export * from './projectIdeas.js'
export * from './engine.js'
import catalog from './catalog.json' with { type: 'json' }
export { catalog }
