/// Demo fixture for rule no-unused-local-var.
/// Run: node bin/index.js src/rules/gm-unused-var.gml

function compute_total(items) {
    var sum = 0;
    var discount = 0.1; // Flagged: declared but never used.

    for (var i = 0; i < array_length(items); i++) {
        sum += items[i];
    }

    return sum;
}
