import { Application, Graphics, GraphicsPath } from './pixi.mjs';

const PARAMS = {
  reelOnePos: [150, 150],
  reelTwoPos: [375, 150],
  reelInnerRadius: 35,
  reelOuterRadius: 100,
  tapeThickness: 0.01,
  tapeTotalLength: 2000000,
  tapeSpeed: 25,
  guideOnePos: [250, 275]
};

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
    .circle(0, 0, PARAMS.reelOuterRadius)
    .fill('grey')
    .path(cutPath)
    .cut()
    .circle(0, 0, PARAMS.reelInnerRadius)
    .fill('grey');
};

const innerRadius = 35;
const tapeThickness = 0.01;

const tapeRadius = (tapeLength) => {
  return Math.sqrt(Math.pow(PARAMS.reelInnerRadius, 2) + tapeThickness * tapeLength / Math.PI);
};

const tape = (g, length) => {
  return g
    .circle(0, 0, tapeRadius(length))
    .fill('black');
};

const tangentPoint = ([circleX, circleY], r, [pointX, pointY]) => {
  const x = pointX - circleX;
  const y = pointY - circleY;
  const d = Math.sqrt(x*x + y*y);
  return [
    circleX + (r*r / (d*d)) * x + r / (d*d) * Math.sqrt(d*d - r*r) * (-y),
    circleY + (r*r / (d*d)) * y + r / (d*d) * Math.sqrt(d*d - r*r) * x
  ];
};

const runningTape = (length) => {
  const [x, y] = tangentPoint(PARAMS.reelOnePos, tapeRadius(length), PARAMS.guideOnePos);
  return new GraphicsPath()
    .moveTo(x, y)
    .lineTo(...PARAMS.guideOnePos);
};

const app = new Application();

await app.init({ antialias: true, resolution: 2, autoDensity: true, background: 'white', resizeTo: window });

document.body.appendChild(app.canvas);

const runningTapeGraphics = new Graphics();
app.stage.addChild(runningTapeGraphics);

const tapeGraphics1 = new Graphics();
tapeGraphics1.position.set(...PARAMS.reelOnePos);
app.stage.addChild(tapeGraphics1);

const tapeGraphics2 = new Graphics();
tapeGraphics2.position.set(...PARAMS.reelTwoPos);
app.stage.addChild(tapeGraphics2);

const reelOne = reel();
reelOne.position.set(...PARAMS.reelOnePos);
app.stage.addChild(reelOne);
const reelTwo = reel();
reelTwo.position.set(...PARAMS.reelTwoPos);
app.stage.addChild(reelTwo);

const totalLength = PARAMS.tapeTotalLength;
let currentLength = 0;

app.ticker.add(time => {
  const dt = time.deltaTime;
  const dx = PARAMS.tapeSpeed * dt;
  currentLength += dx;
  reelOne.rotation += dx / (2 * Math.PI * tapeRadius(totalLength - currentLength));
  reelTwo.rotation += dx / (2 * Math.PI * tapeRadius(currentLength));
  tape(tapeGraphics1.clear(), totalLength - currentLength);
  tape(tapeGraphics2.clear(), currentLength);
  runningTapeGraphics.clear().path(runningTape(totalLength - currentLength)).stroke({width: 2, color: 'black'});
});
