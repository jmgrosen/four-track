import { Application, Graphics, GraphicsPath, Text, Assets, Rectangle, Sprite } from './pixi.mjs';

const PARAMS = {
  reelOnePos: [150, 150],
  reelTwoPos: [450, 150],
  reelInnerRadius: 35,
  reelOuterRadius: 100,
  tapeThickness: 0.1,
  tapeTotalLength: 200000,
  tapeSpeedScale: 100,
  tapeColor: '#0039a6',
  guideOnePos: [250, 275],
  guideTwoPos: [265, 250],
  headPos: [300, 250],
  guideThreePos: [335, 250],
  guideFourPos: [350, 275],
  guideRadius: 5,
  stationLength: 1000
};
const totalLength = PARAMS.tapeTotalLength;
let currentLength = 0;
let tapeSpeed = 0;

const STATIONS = [
  {name: 'Euclid Av', pos: 0},
  {name: 'Shepherd Av', pos: 5000},
  {name: 'Van Siclen Av', pos: 10000},
  {name: 'Liberty Av', pos: 15000},
  {name: 'Broadway Junction', pos: 20000},
  {name: 'Rockaway Av', pos: 25000}
];
let currentStation = 0;

const within = (station) => {
  return station?.pos <= currentLength && currentLength < station?.pos + PARAMS.stationLength;
};
const updateStation = () => {
  // assumes that our dx is small enough that we won't skip stations, i guess?
  const nextStation = STATIONS[currentStation+1];
  const prevStation = STATIONS[currentStation-1];
  if (nextStation?.pos <= currentLength) {
    currentStation++;
  } else if (currentLength < prevStation?.pos + PARAMS.stationLength) {
    currentStation--;
  }
};
const stationDetails = () => {
  const station = STATIONS[currentStation];
  if (within(station)) {
    return {name: station.name, offset: currentLength - station.pos};
  } else {
    return null;
  }
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

const tapeRadius = (tapeLength) => {
  return Math.sqrt(Math.pow(PARAMS.reelInnerRadius, 2) + PARAMS.tapeThickness * tapeLength / Math.PI);
};

const tape = (g, length) => {
  return g
    .circle(0, 0, tapeRadius(length))
    .fill(PARAMS.tapeColor);
};

const tangentPoint = ([circleX, circleY], r, [pointX, pointY], factor) => {
  const x = pointX - circleX;
  const y = pointY - circleY;
  const d = Math.sqrt(x*x + y*y);
  return [
    circleX + (r*r / (d*d)) * x + factor * r / (d*d) * Math.sqrt(d*d - r*r) * (-y),
    circleY + (r*r / (d*d)) * y + factor * r / (d*d) * Math.sqrt(d*d - r*r) * x
  ];
};

const runningTape = (length) => {
  const guideOneTarget = [PARAMS.guideOnePos[0], PARAMS.guideOnePos[1] + PARAMS.guideRadius];
  const tangentOne = tangentPoint(PARAMS.reelOnePos, tapeRadius(length), guideOneTarget, 1);
  const guideTwoTarget = [PARAMS.guideTwoPos[0], PARAMS.guideTwoPos[1] + PARAMS.guideRadius];
  const tangentTwo = tangentPoint(PARAMS.reelTwoPos, tapeRadius(totalLength - length), guideTwoTarget, -1);
  return new GraphicsPath()
    .moveTo(...tangentOne)
    .lineTo(...guideOneTarget)
    .arc(...PARAMS.guideOnePos, PARAMS.guideRadius, Math.PI/2, 0, true)
    .lineTo(PARAMS.guideTwoPos[0] - PARAMS.guideRadius, PARAMS.guideTwoPos[1])
    .arc(...PARAMS.guideTwoPos, PARAMS.guideRadius, Math.PI, 3*Math.PI/2)
    .lineTo(PARAMS.guideThreePos[0], PARAMS.guideThreePos[1] - PARAMS.guideRadius)
    .arc(...PARAMS.guideThreePos, PARAMS.guideRadius, 3*Math.PI/2, 0)
    .lineTo(PARAMS.guideFourPos[0] - PARAMS.guideRadius, PARAMS.guideFourPos[1])
    .arc(...PARAMS.guideFourPos, PARAMS.guideRadius, Math.PI, Math.PI/2, true)
    .lineTo(...tangentTwo);
};

const tapeHeadAndGuides = () => {
  return new Graphics()
    .circle(...PARAMS.guideOnePos, PARAMS.guideRadius)
    .circle(...PARAMS.guideTwoPos, PARAMS.guideRadius)
    .regularPoly(...PARAMS.headPos, PARAMS.guideRadius, 3)
    .circle(...PARAMS.guideThreePos, PARAMS.guideRadius)
    .circle(...PARAMS.guideFourPos, PARAMS.guideRadius)
    .fill('grey');
};

const app = new Application();

await app.init({ antialias: true, resolution: 2, autoDensity: true, background: 'white', resizeTo: window });

document.body.appendChild(app.canvas);

app.stage.addChild(tapeHeadAndGuides());

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

const stationText = new Text({text: ''});
stationText.y = 200;
app.stage.addChild(stationText);

app.ticker.add(time => {
  const dt = time.deltaTime;
  const dx = tapeSpeed * dt;
  currentLength += dx;
  updateStation();
  const stationIn = stationDetails();
  if (stationIn) {
    stationText.text = stationIn.name;
    console.log(stationIn.name);
    stationText.x = stationIn.offset - 200;
  } else {
    stationText.text = "";
  }
  reelOne.rotation -= dx / (2 * Math.PI * tapeRadius(totalLength - currentLength));
  reelTwo.rotation -= dx / (2 * Math.PI * tapeRadius(currentLength));
  tape(tapeGraphics1.clear(), totalLength - currentLength);
  tape(tapeGraphics2.clear(), currentLength);
  runningTapeGraphics.clear().path(runningTape(totalLength - currentLength)).stroke({
    width: 2,
    color: PARAMS.tapeColor,
    join: 'round',
    cap: 'round'
  });
});

const speedInput = document.querySelector("input");
tapeSpeed = speedInput.value * PARAMS.tapeSpeedScale;
speedInput.addEventListener("input", (event) => {
  tapeSpeed = event.target.value * PARAMS.tapeSpeedScale;
});
