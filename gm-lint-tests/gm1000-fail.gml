// Total[1]

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

for (var i = 0; i < 10; i++) {
    val = method(self, function() {
        break; // Valid intent if interpreted contextually, but flagged as out-of-loop due to function boundary rules.
    });
}

// No Trigger

switch (val) {
    case 1:
        break; // Invalid! GameMaker throws a compiler error.
}