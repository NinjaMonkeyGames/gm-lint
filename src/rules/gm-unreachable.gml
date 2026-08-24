/// Demo fixture for rule no-unreachable-code.
/// Run: node bin/index.js src/rules/gm-unreachable.gml

function get_score() {
    return 100;
    show_debug_message("this never runs"); // Flagged: unreachable.
}

function count_down(n) {
    while (n > 0) {
        n -= 1;
        if (n == 5) {
            break;
            show_debug_message("also unreachable"); // Flagged.
        }
    }
    return n;
}
