
// Total[1]

// Trigger

// Arithmetic operation on the left
a + b = 10;

// Function return value combined with an operation
get_hp() * 2 = 100;

// No Trigger

var _foo = 1234;
_foo = 4321; // Good!

function get_random_item()
{
    return
    {
        name: "Sword"
    };
}

get_random_item() = "Shield"; // GM1007 - Left-hand side of an assignment must be a variable 