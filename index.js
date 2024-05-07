import { Application, Graphics, GraphicsPath } from './pixi.mjs';

const reel = () => {
  const arcSize = Math.PI / 6;
  const sixth = Math.PI / 6;
  const cutPath = new GraphicsPath()
    .moveTo(0, 0)
    .arc(0, 0, 75, sixth - arcSize/2, sixth + arcSize/2)
    .closePath()
    .moveTo(0, 0)
    .arc(0, 0, 75, 5 * sixth - arcSize/2, 5 * sixth + arcSize/2)
    .closePath()
    .moveTo(0, 0)
    .arc(0, 0, 75, 9 * sixth - arcSize/2, 9 * sixth + arcSize/2)
    .closePath();
  return new Graphics()
    .circle(0, 0, 100)
    .fill('grey')
    .path(cutPath)
    .cut()
    .circle(0, 0, 35)
    .fill('grey');
};

const innerRadius = 35;
const tapeThickness = 0.01;

const tapeRadius = (tapeLength) => {
  return Math.sqrt(innerRadius * innerRadius + tapeThickness * tapeLength / Math.PI);
};

const tape = (g, length) => {
  return g
    .circle(0, 0, tapeRadius(length))
    .fill('black');
};

const app = new Application();

await app.init({ antialias: true, resolution: 2, autoDensity: true, background: 'white', resizeTo: window });

document.body.appendChild(app.canvas);

const tapeGraphics1 = new Graphics();
tapeGraphics1.position.set(150, 150);
app.stage.addChild(tapeGraphics1);

const tapeGraphics2 = new Graphics();
tapeGraphics2.position.set(375, 150);
app.stage.addChild(tapeGraphics2);

const reelOne = reel();
reelOne.position.set(150, 150);
app.stage.addChild(reelOne);
const reelTwo = reel();
reelTwo.position.set(375, 150);
app.stage.addChild(reelTwo);

const totalLength = 2000000;
let currentLength = 0;

app.ticker.add(time => {
  const dt = time.deltaTime;
  const dx = 25 * dt;
  currentLength += dx;
  reelOne.rotation += dx / (2 * Math.PI * tapeRadius(totalLength - currentLength));
  reelTwo.rotation += dx / (2 * Math.PI * tapeRadius(currentLength));
  tape(tapeGraphics1.clear(), totalLength - currentLength);
  tape(tapeGraphics2.clear(), currentLength);
  
});
