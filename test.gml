for (var i = 0; i < 10; i++) {
    var x = (condition) ? (continue) : 0; // Syntax/Parsing edge case
}// ============================================================
// GM1000 (break) edge case fixtures
// Each case is labeled with its EXPECTED result, verified
// against the GameMaker manual + Feather message docs.
// ============================================================


// --- Case 1: break directly in a loop -------------------------
// EXPECTED: no error (baseline sanity check)
function case1() {
    for (var i = 0; i < 10; i++) {
        break;
    }
}


// --- Case 2: break with no enclosing target at all -------------
// EXPECTED: GM1000 error
function case2() {
    break;
}


// --- Case 3: break inside a `with`, no enclosing loop -----------
// EXPECTED: no error - `with` is itself a valid break target
function case3() {
    with (obj_enemy) {
        break;
    }
}


// --- Case 4: break inside `with` nested inside `for` -------------
// EXPECTED: no error - break targets the NEAREST enclosing
// construct (the `with`), not the outer `for`. This matches a
// real GameMaker forum bug report where users are surprised the
// break only exits the with, not the loop. Not a linter bug -
// it's syntactically valid either way.
function case4() {
    for (var i = 0; i < 10; i++) {
        with (obj_enemy) {
            break; // only exits the with, NOT the for loop
        }
    }
}


// --- Case 5: break directly inside a switch ----------------------
// EXPECTED: no error - switch is a valid break target (this is
// its normal, everyday use).
function case5() {
    switch (1) {
        case 1:
            break;
    }
}


// --- Case 6: break in an IIFE, no enclosing loop anywhere ---------
// EXPECTED: GM1000 error - a function boundary doesn't grant
// permission, it just means there's nothing valid to find. No
// loop exists anywhere in this snippet.
function case6() {
    var v = (function() {
        break;
    })();
}


// --- Case 7: break in a function NESTED INSIDE a real loop --------
// EXPECTED: GM1000 error - break can never cross a function
// boundary to reach an outer loop, even though a `for` loop
// genuinely encloses the function textually. This is the key
// regression case: an earlier version of gm1000.js ignored
// function boundaries entirely and would have missed this.
function case7() {
    for (var i = 0; i < 10; i++) {
        var f = function() {
            break;
        };
    }
}


// --- Case 8: break in an IIFE used as a constructor field ----------
// EXPECTED: GM1000 error per documented Feather rules, even
// though real GameMaker's Feather editor pass has a known false
// negative here (doesn't analyze into this specific shape). The
// underlying compiler rule still applies: no loop, no target.
function MyAsset() constructor {
    my_value = (function() {
        break;
    })();
}


// --- Case 9: break targets the NEAREST of two nested switches ------
// EXPECTED: no error - resolves to the inner switch.
function case9() {
    switch (1) {
        case 1:
            switch (2) {
                case 2:
                    break; // exits inner switch only
            }
            break;
    }
}


// --- Case 10: break in repeat / do-until ----------------------------
// EXPECTED: no error for both.
function case10() {
    repeat (5) {
        break;
    }
    do {
        break;
    } until (true);
}


// --- Case 11: break in switch nested inside with nested inside for --
// EXPECTED: no error - resolves to the nearest enclosing switch,
// same "nearest wins" rule as Case 4/9, just one layer deeper.
function case11() {
    for (var i = 0; i < 10; i++) {
        with (obj_enemy) {
            switch (i) {
                case 0:
                    break; // exits the switch only
            }
        }
    }
}