// TRIGGERS EXPECTED [3]

// Trigger

var _items = get_items();
var i = 0;
repeat (array_length(_items))
{
    var _item = _items[i++];
    if (_item == undefined)
        break; // Good!
    // ... Some logic here ...
}
break; // GM1000 - No loop to break from.

// No Trigger

while (true) 
{
    var _debugMsg = "Processing block: }"; // Contains a closing brace inside a string
    break; // Valid break, but will trigger a false positive!
}

// Trigger

while (is_active)
    break; // Valid break inside a brace-less while loop

// --- Later in the same file ---

break; // INVALID! There is no enclosing loop here, but the linter will miss it!

// Trigger

repeat (5)
    while (true)
        i++;

break; // False Negative: This illegal break is not caught.