const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100" preserveAspectRatio="none">
  <path d="M 0,0 L 100,0 L 100,100 L 0,100 Z" fill="black" />
  <path d="M 100,0 Q 90,20 100,40 T 100,80 Q 90,100 100,100 L 120,100 L 120,0 Z" fill="black" />
</svg>
`;
console.log(Buffer.from(svg.trim()).toString('base64'));
