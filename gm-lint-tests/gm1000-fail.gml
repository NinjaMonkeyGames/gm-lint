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