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

/// LOGIC

/// `Segment` represents a part of a train line. It should have no mutable
/// state, instead only describing whatever relevant properties of the segment.
class Segment {
  get length() {
    throw new Error("subclass must implement length");
  }
}

class Station extends Segment {
  constructor(name) {
    super();
    this.name = name;
  }

  get length() {
    return PARAMS.stationLength;
  }
}

class Straightaway extends Segment {
  constructor(length) {
    super();
    this._length = length;
  }

  get length() {
    return this._length;
  }
}

class TrainLine {
  /// `segments` is array of Segment.
  constructor(segments) {
    this.segments = segments;
    /// morally immutable
    this.totalLength = segments.reduce((acc, seg) => acc + seg.length, 0);
  }

  /// eventually we will want to get all segments within earshot, but for now
  /// we suffice with just the one we're inside.
  segmentWithin(position) {
    if (position < 0 || position > this.totalLength) {
      throw new Error("invalid position=${position}: must be in range [0, totalLength=${this.totalLength}]");
    }
    // O(n) is fine for now
    let lengthSoFar = 0;
    for (const segment of this.segments) {
      // "<=" is important when we reach the end of the line. I am worried
      // about float arithmetic though 😅
      if (position <= lengthSoFar + segment.length) {
        return {
          segment,
          // 0-1
          offset: (position - lengthSoFar) / segment.length,
        };
      }
      lengthSoFar += segment.length;
    }
    throw new Error("got to the end of the line without finding the segment??");
  }
}

const trainLine = new TrainLine([
  new Station("Euclid Av"),
  new Straightaway(5000),
  new Station("Shepherd Av"),
  new Straightaway(5000),
  new Station("Van Siclen Av"),
  new Straightaway(5000),
  new Station("Liberty Av"),
  new Straightaway(5000),
  new Station("Broadway Junction"),
  new Straightaway(5000),
  new Station("Rockaway Av"),
]);

const totalLength = PARAMS.tapeTotalLength;
let currentLength = 0;
let tapeSpeed = 0;

const clamp = (min, max, val) =>
      val < min ? min : val > max ? max : val;

class Train {
  constructor(position, velocity) {
    this.position = position;
    this.velocity = velocity;
  }

  update(dt) {
    // nice
    const rawPos = this.position + this.velocity * dt;
    this.position = clamp(0, trainLine.totalLength, rawPos);
  }
}

/// GRAPHICS

/// [0, 1] -> [0, 1], mapping the offset within the station to how intense
/// the alpha of the station text should be.
const stationOffsetEase = (offset) => {
  return Math.pow(offset < 0.5 ? offset * 2 : (1 - offset) * 2, 0.5);
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
  const tangentTwo = tangentPoint(PARAMS.reelTwoPos, tapeRadius(trainLine.totalLength - length), guideTwoTarget, -1);
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
stationText.y = 330;
app.stage.addChild(stationText);

/// MIX OF LOGIC AND GRAPHICS

const trains = [
  new Train(0, 100),
  new Train(50000, 200),
  new Train(50000, -50),
];
console.log(trains[0].position);

const trainText = new Text({text: ''});
trainText.y = 400;
trainText.x = 25;
app.stage.addChild(trainText);

app.ticker.add(time => {
  const dt = time.deltaTime;
  const dx = tapeSpeed * dt;
  currentLength = clamp(0, trainLine.totalLength, currentLength + dx);
  const {segment, offset: segmentOffset} = trainLine.segmentWithin(currentLength);
  if (segment instanceof Station) {
    stationText.text = segment.name;
    console.log(segment.name);
    stationText.x = 300; // TODO: don't hardcode this
    stationText.anchor.x = 0.5;
    stationText.alpha = stationOffsetEase(segmentOffset);
  } else {
    stationText.text = "";
  }
  reelOne.rotation -= dx / (2 * Math.PI * tapeRadius(trainLine.totalLength - currentLength));
  reelTwo.rotation -= dx / (2 * Math.PI * tapeRadius(currentLength));
  tape(tapeGraphics1.clear(), totalLength - currentLength);
  tape(tapeGraphics2.clear(), currentLength);
  runningTapeGraphics.clear().path(runningTape(totalLength - currentLength)).stroke({
    width: 2,
    color: PARAMS.tapeColor,
    join: 'round',
    cap: 'round'
  });

  trains.forEach(t => t.update(dt));
  trainText.text = trains.map((t, i) => `Train ${i} is at ${t.position}`).join("\n");
});

const speedInput = document.querySelector("input");
tapeSpeed = speedInput.value * PARAMS.tapeSpeedScale;
speedInput.addEventListener("input", (event) => {
  tapeSpeed = event.target.value * PARAMS.tapeSpeedScale;
});
