// Diabolical Test Case: Nested scope traps with control flow and initializers

globalvar bad_global = 10; // GM1002: globalvar with initializer

function tricky_scope_test(
    callback = function() {
        // This break is inside an anonymous function parameter default value, 
        // nested inside a function declaration. 
        // It has NO enclosing loop or switch whatsoever.
        break; // GM1000 violation (must be caught)
    }
) 
