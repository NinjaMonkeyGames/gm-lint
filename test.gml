for (var i = 0; i < 10; i++) {
    val = method(self, function() {
        continue; // Valid intent if interpreted contextually, but flagged as out-of-loop due to function boundary rules.
    });
}