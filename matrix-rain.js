// Matrix Rain Animation for Error 1.0 Landing Page
const canvas = document.createElement('canvas');
canvas.id = 'matrixCanvas';
document.body.insertBefore(canvas, document.body.firstChild);

const ctx = canvas.getContext('2d');

let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// Setup the characters
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~'.split('');
const fontSize = 16;
let columns = Math.floor(width / fontSize);

let drops = [];
for (let i = 0; i < columns; i++) {
  drops[i] = Math.random() * -100;
}

window.addEventListener('resize', () => {
    columns = Math.floor(width / fontSize);
    drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }
});

// Animation loop
function draw() {
  // Translucent background to create fading trail
  ctx.fillStyle = 'rgba(15, 16, 21, 0.05)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#00ffcc'; // Use the accent color from the theme
  ctx.font = `${fontSize}px "Fira Code", monospace`;
  ctx.textAlign = 'center';

  for (let i = 0; i < drops.length; i++) {
    // Random character
    const text = chars[Math.floor(Math.random() * chars.length)];
    
    // Add glowing effect occasionally
    if (Math.random() > 0.95) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ffcc';
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00ffcc';
    }

    ctx.fillText(text, i * fontSize, drops[i] * fontSize);

    // Resetting drop to top after it goes off screen or randomly to create stagger
    if (drops[i] * fontSize > height && Math.random() > 0.975) {
      drops[i] = 0;
    }

    drops[i]++;
  }
}

// Start animation
setInterval(draw, 33);
