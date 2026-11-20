/**
 * Backward compatibility facade.
 * Flow engine is now located in ./core/engine.js as per Phase 2 architecture.
 */
export * from './core/engine.js';
export { flowEngineService } from './core/engine.js';
