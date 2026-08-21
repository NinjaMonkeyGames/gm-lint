// Total[1]

// Trigger

enum FRUIT
{
    UNKNOWN = -1, // Good!
    BANANA,
    ORANGE,
    APPLE = "apple" // GM1003 - Enum assignment must be integer assignment.
}

// No Trigger

enum FLAGS {
    NONE = 0,
    READ = 1 << 0,  // BinaryExpression
    WRITE = 1 << 1  // BinaryExpression
}