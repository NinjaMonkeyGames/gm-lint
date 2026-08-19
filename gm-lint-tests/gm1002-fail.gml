// No trigger

globalvar minScore; minScore = (score >= 10) ? 10 : score;

// Trigger

globalvar gameManager = new GameManager(); // GM1002 - globalvar does not support inline initializers.

// No trigger

globalvar highScore /* default = 0, set by save system */;