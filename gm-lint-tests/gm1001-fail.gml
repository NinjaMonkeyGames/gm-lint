// Total[1]

var _items = get_items();
var i = 0;
repeat (array_length(_items))
{
    var _item = _items[i++];
    if (_item == undefined)
        continue; // Good!
    // ... Some logic here ...
}
continue; // GM1001 - No loop to continue from.

// No Trigger

for (var i = 0; i < 10; i++) {
    val = method(self, function() {
        continue; // Valid intent if interpreted contextually, but flagged as out-of-loop due to function boundary rules.
    });
}