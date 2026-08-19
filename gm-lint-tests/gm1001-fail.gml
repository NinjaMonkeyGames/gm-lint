// TRIGGERS EXPECTED [1]

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
continue; // GM1001 - No loop to continue from.