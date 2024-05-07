import { Application, Graphics, GraphicsPath } from './pixi.mjs';

const reel = () => {
  const arcSize = Math.PI / 4;
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
    .fill('black')
    .path(cutPath)
    .cut()
    .circle(0, 0, 35)
    .fill('black');
};

const app = new Application();

await app.init({ antialias: true, resolution: 2, autoDensity: true, background: 'white', resizeTo: window });

document.body.appendChild(app.canvas);

const reelOne = reel();
reelOne.position.set(150, 150);
app.stage.addChild(reelOne);
const reelTwo = reel();
reelTwo.position.set(375, 150);
app.stage.addChild(reelTwo);

app.ticker.add(time => {
  const dt = time.deltaTime;
  const dtheta = dt * 0.01;
  reelOne.rotation += dtheta;
  reelTwo.rotation += dtheta;
});
