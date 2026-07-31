const fs = require('fs');

// Generate wavy polygon keyframes for diagonal cloth pull
// Pulling from top-right to bottom-left.

// We need points defining a shape. The leading edge will be wavy.
// The shape starts covering everything, then the bottom-left corner is pulled to top-right.

// Start (Full screen):
// Top edge, Right edge, Bottom edge, Left edge (with waves)
const fullScreen = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 
    0% 80%, 0% 60%, 0% 40%, 0% 20%
)`;

// Snatched (Pulled to top right corner):
const snatched = `polygon(
    100% 0%, 100% 0%, 100% 0%, 100% 0%,
    100% 0%, 100% 0%, 100% 0%, 100% 0%
)`;

console.log("Full:", fullScreen);
console.log("Snatched:", snatched);
