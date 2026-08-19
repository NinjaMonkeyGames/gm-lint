// TRIGGERS EXPECTED [3]

// Trigger

var _items = get_items();
var i = 0;
repeat (array_length(_items))
{
    var _item = _items[i++];
    if (_item == undefined)
        continue; // Good!
    // ... Some logic here ...
}
continue; // GM1000 - No loop to continue from.

// No Trigger

while (true) 
{
    var _debugMsg = "Processing block: }"; // Contains a closing brace inside a string
    continue; // Valid continue, but will trigger a false positive!
}

// Trigger

while (is_active)
    continue; // Valid continue inside a brace-less while loop

// --- Later in the same file ---

continue; // INVALID! There is no enclosing loop here, but the linter will miss it!

// Trigger

repeat (5)
    while (true)
        i++;

continue; // False Negative: This illegal continue is not caught.

// gm-lint bug proof: Multi-line block comment false positive

