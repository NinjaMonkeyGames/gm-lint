// Total[1]

// Trigger

draw_set_color(); // GM1005 - Argument must be provided.

// No Trigger

function draw_set_color() { // Custom local helper function
    return;
}
draw_set_color(); // Triggers a false positive because the linter thinks it's the built-in function missing an argument
```[cite: 16]