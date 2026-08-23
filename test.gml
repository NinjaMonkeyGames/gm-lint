// File 1:
enum PlayerState { IDLE, RUN }

// If a separate file or local block re-uses an enum name in a completely 
// isolated scope where GameMaker allows it or handles it via struct scoping:
function init_enemy() {
    enum PlayerState { ATTACK } // Valid in certain scoping contexts
}