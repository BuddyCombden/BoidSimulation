/*
Original base code acquired from Ben Eater @ https://github.com/beneater/boids
*/

// Size of canvas. These get updated to fill the whole browser.
let width = 150;
let height = 150;

//Program Amplifier
const progScale = 1;
//Simulation Size Factor
const simScaling = 1*progScale;
//Simulation Speed Factor
let simSpeed = 1*progScale;
//Foish Count Multiplier
let foishCountMultiplier = 1.0;
//Number of Boid Types
const numTypes = 6;
const SHARK_TYPE = 5;

//Auto adjusts number of boids and their range to better fit scaling.
let numBoids = 1;
const x_margin = window.innerWidth*0.05;//200//Margin from sides of screen
const y_margin = window.innerHeight*0.1//120;//Mergin from top/bottom of screen

//What percentage of the tail should persist | 0->100%
const tailPortion = 10;
const DRAW_TRAIL = true;

//Default Boid Traversal Values
const visualRange = 75//+(numBoids*0.15);
const centeringFactor = 0.0025; // adjust velocity by this %
const minDistance = 20; // The distance to stay away from other boids
const avoidFactor = 0.025; // Adjust velocity by this %
const matchingFactor = 0.025; // Adjust by this % of average velocity
const speedLimit = 5;//Boid topspeed
const turnFactor = 0.5;//Boid turnspeed

const boidColors = ["#282c34d1","#345258d1","#3f353ea1","#6f4472","#2F4A20D1","#1B2B5CBB"]
const trailColors = ["#1097D132","#03C1E336","#4f455516","#6f447636","#68845233","#27408B33"]
const SHARK_MAX_STAGE = 3;
const SHARK_GROWTH_THRESHOLDS = [4, 9];
const SHARK_HEAD_OFFSETS = [16, 20, 24];
const SHARK_HEAD_RADII = [6, 7, 8];
const SHARK_TARGET_PULL = 0.18;
const SHARK_BODY_COLORS = ["#4C708F","#3A5A7A","#2A4663"];
const SHARK_BELLY_COLORS = ["#C8D7E2","#BCCAD7","#AEBBCD"];
const SHARK_FIN_COLORS = ["#2F4F6D","#27445F","#1E3547"];
const rainbow = {
	r: 0,
	g: 0,
	b: 100,
	max: 100};

//Type Division (Inverse Logarithm)
//(numTypes-1-Math.floor((Math.log(boids.length+1)/Math.log(numBoids))/(1-(Math.log(numTypes)/Math.log(6))))),
//Sky Radial
//background: radial-gradient(ellipse at 50% 100%,#e66465 5%, #89CAFF 95%);

var boids = [];

function logStates(){
	console.log("Simulation Factors:\nScale: "+simScaling+"\nSpeed: "+simSpeed);
	console.log("Boid Factors:\numNorm: "+numBoids+"\nnormSight: "+visualRange);
	console.log("Trail Factors:\nActive: "+DRAW_TRAIL+"\nProportion: "+tailPortion+"%");
}

function initBoids() {
  numBoids = Math.round((width*height)/(6000*(simScaling/2)) * foishCountMultiplier);
  console.log("NumBoids: "+numBoids);
  for (var i = 0; i < numBoids; i += 1) {
		//console.log(numTypes-1-Math.floor((Math.log(boids.length+1)/Math.log(numBoids))/(1-(Math.log(numTypes)/Math.log(6)))));
    boids[boids.length] = {
      x: Math.random() * width,
      y: Math.random() * height,
      dx: Math.random() * 10 - 5,
      dy: Math.random() * 10 - 5,
      history: [],
	    type: 0,
			variant: Math.floor(Math.random()*4)
    };
  }
	for(var x = 0; x < boids.length; x+=1){
		if(x < boids.length*0.75)boids[x].type = 0;
		else if(x < boids.length*0.95)boids[x].type = 1;
		else if(x < boids.length*0.98)boids[x].type = 2;
		else if(x < boids.length*0.99)boids[x].type = 3;
		else boids[x].type = 4;
	}
	const shark = createShark();
	if (shark) {
		boids.push(shark);
	}
}

function createShark(initialStage = 1) {
	const shark = {
		x: Math.random() * width,
		y: Math.random() * height,
		dx: Math.random() * 4 - 2,
		dy: Math.random() * 4 - 2,
		history: [],
		type: SHARK_TYPE,
		variant: 0,
		sizeStage: initialStage,
		fishEaten: 0,
		target: null
	};
	return shark;
}

function distance(boid1, boid2) {
  return Math.sqrt(
    (boid1.x - boid2.x) * (boid1.x - boid2.x) +
      (boid1.y - boid2.y) * (boid1.y - boid2.y),
  );
}

// TODO: This is naive and inefficient.
function nClosestBoids(boid, n) {
  // Make a copy
  const sorted = boids.slice();
  // Sort the copy by distance from `boid`
  sorted.sort((a, b) => distance(boid, a) - distance(boid, b));
  // Return the `n` closest
  return sorted.slice(1, n + 1);
}

// Called initially and whenever the window resizes to update the canvas
// size and width/height variables.
function sizeCanvas() {
  const canvas = document.getElementById("boids");
  width = window.innerWidth*simScaling;
  height = window.innerHeight*simScaling;
  console.log("Width: "+width);
  console.log("Height: "+height);
  canvas.width = width;
  canvas.height = height;
}

function shiftRainbow(color){
	//console.log("rgb("+color.r+","+color.g+","+color.b+",255) "+color.state);
	if(color.r == color.max){
		if(color.g == color.max){color.r -= 1;}
		else if(color.b > 0){color.b -=1;}
		else{color.g += 1;}}
	if(color.g == color.max){
		if(color.b == color.max){color.g -= 1;}
		else if(color.r > 0){color.r -=1;}
		else{color.b += 1;}}
	if(color.b == color.max){
		if(color.r == color.max){color.b -= 1;}
		else if(color.g > 0){color.g -=1;}
		else{color.r += 1;}}
}

function boidBehaviour(boid){
	let centerX = 0, centerY = 0,
			moveX = 0, moveY = 0,
			avgDX = 0, avgDY = 0,
			numNeighbors = 0, boidDist = 0,
			typeDiff = 0, sameType = false;
	let typeCntrFctr = centeringFactor,
			typeMinDist = minDistance,
			typeAvoidFctr = avoidFactor,
			typeMtchFctr = matchingFactor,
			typeSpdLim = speedLimit,
			typeTurnFctr = turnFactor,
			typeVisRnge = visualRange;
	if(boid.type == 0){}//Small schooling fish.
	else if(boid.type == 1){//Medium rainbow fish.
		typeSpdLim = typeSpdLim*0.8;
		//typeMtchFctr = typeMtchFctr*1.5;
		//typeAvoidFctr = typeAvoidFctr*0.7;
		//typeVisRnge = typeVisRnge*0.8;
	}
	else if(boid.type == 2){//Fugu
		typeVisRnge = typeVisRnge*0.75;
		typeSpdLim = typeSpdLim *0.6;
		typeMtchFctr = typeMtchFctr*0.6;
	}
	else if(boid.type == 3){//Dolphins
		typeMinDist = typeMinDist*2;
		typeVisRnge = typeVisRnge*2;//2 implements notable pod formation
		typeAvoidFctr = typeAvoidFctr*0.25;
		typeSpdLim = typeSpdLim*1.4;
	}
	else if(boid.type == 4){//Turtles
		typeVisRnge = typeVisRnge*0.5;
		typeSpdLim = typeSpdLim*0.3;
		typeMtchFctr = typeMtchFctr*0.3;
		typeAvoidFctr = typeAvoidFctr*1;
		typeTurnFctr = typeTurnFctr*0.7;
	}
	else if(boid.type == SHARK_TYPE){//Sharks
		const stage = boid.sizeStage || 1;
		const stageScale = 1 + (stage - 1) * 0.25;
		typeVisRnge = typeVisRnge*1.3;
		typeSpdLim = typeSpdLim*(1.4 + (stage - 1) * 0.2);
		typeTurnFctr = typeTurnFctr*1.1;
		typeAvoidFctr = typeAvoidFctr*0.9;
		typeMinDist = typeMinDist*1.1*stageScale;
		typeMtchFctr = typeMtchFctr*0.05;
	}

	typeSpdLim = typeSpdLim*simSpeed;
	typeTurnFctr = typeTurnFctr*simSpeed;
	typeMtchFctr = typeMtchFctr*simSpeed;
	typeAvoidFctr = typeAvoidFctr*simSpeed;

	for (let otherBoid of boids) {
		boidDist = distance(boid,otherBoid);
		sameType = (boid.type == otherBoid.type);
		typeDiff = otherBoid.type - boid.type;
		if(boidDist < typeVisRnge){
	if(sameType){
				centerX += otherBoid.x;
				centerY += otherBoid.y;
				avgDX += otherBoid.dx;
				avgDY += otherBoid.dy;
				numNeighbors += 1;
		}}
		if (otherBoid !== boid) {
			if(boid.type == SHARK_TYPE && otherBoid.type != SHARK_TYPE){
				let sharkMinDist = typeMinDist;
				let sharkSepStrength = 0;
				if(otherBoid.type == 2 || otherBoid.type == 3){
					sharkMinDist = typeMinDist*1.5;
					sharkSepStrength = 2.4;
				}
				else if(otherBoid.type == 4){
					sharkMinDist = typeMinDist*1.1;
					sharkSepStrength = 1.1;
				}
				else{
					sharkMinDist = typeMinDist*0.4;
					sharkSepStrength = 0.2;
				}
				if(boidDist < sharkMinDist && sharkSepStrength > 0){
					moveX += (boid.x - otherBoid.x)*sharkSepStrength;
					moveY += (boid.y - otherBoid.y)*sharkSepStrength;
				}
				continue;
			}
			if(boid.type == 3 && otherBoid.type == SHARK_TYPE){
				continue;
			}
			if((boid.type == 0 || boid.type == 1) && otherBoid.type == SHARK_TYPE){
				const panicRange = typeMinDist*1.8;
				if(boidDist < panicRange){
					const panicStrength = 2.0;
					moveX += (boid.x - otherBoid.x)*panicStrength;
					moveY += (boid.y - otherBoid.y)*panicStrength;
				}
			}
			if(boidDist < typeMinDist){
				if(typeDiff > 0){
					moveX += (boid.x - otherBoid.x)*(typeDiff*typeDiff*0.5+0.35);
					moveY += (boid.y - otherBoid.y)*(typeDiff*typeDiff*0.5+0.35);
				}
				if(sameType){
					moveX += boid.x - otherBoid.x;
					moveY += boid.y - otherBoid.y;
				}

		}}
	}
	if (numNeighbors) {
		centerX = centerX / numNeighbors;
		centerY = centerY / numNeighbors;
		avgDX = avgDX / numNeighbors;
		avgDY = avgDY / numNeighbors;

		boid.dx += ((avgDX - boid.dx) * typeMtchFctr) + ((centerX - boid.x) * typeCntrFctr);
		boid.dy += ((avgDY - boid.dy) * typeMtchFctr) + ((centerY - boid.y) * typeCntrFctr);
	}
	boid.dx += moveX * typeAvoidFctr * simSpeed;
	boid.dy += moveY * typeAvoidFctr * simSpeed;
	if(boid.type == SHARK_TYPE && boid.target){
		const targetDX = boid.target.x - boid.x;
		const targetDY = boid.target.y - boid.y;
		const targetDist = Math.sqrt(targetDX * targetDX + targetDY * targetDY);
		if(targetDist > 5){
			const pullStrength = SHARK_TARGET_PULL * simSpeed * (1 + ((boid.sizeStage || 1) - 1) * 0.15);
			boid.dx += (targetDX / targetDist) * pullStrength;
			boid.dy += (targetDY / targetDist) * pullStrength;
		}
		else{
			boid.target = null;
		}
	}
	//Speed Limiting
	const speed = Math.sqrt(boid.dx * boid.dx + boid.dy * boid.dy);
	if (speed > typeSpdLim/((boid.type+2)/2)) {
		boid.dx = (boid.dx / speed) * typeSpdLim;
		boid.dy = (boid.dy / speed) * typeSpdLim;
	}
	//Bound Constraints
	if (boid.x < x_margin) {
		boid.dx += typeTurnFctr;
	}
	if (boid.x > width - x_margin) {
		boid.dx -= typeTurnFctr;
	}
	if (boid.y < y_margin) {
		boid.dy += typeTurnFctr;
	}
	if (boid.y > height - y_margin) {
		boid.dy -= typeTurnFctr;
	}
}

function drawBoid(ctx, boid) {
  const angle = Math.atan2(boid.dy, boid.dx);
	if (DRAW_TRAIL) {
		ctx.lineWidth = boid.type+2;
    ctx.strokeStyle = trailColors[boid.type];
    ctx.beginPath();
    ctx.moveTo(boid.history[0][0], boid.history[0][1]);
    for (const point of boid.history) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();
  }
	ctx.lineWidth = 3;
	ctx.translate(boid.x, boid.y);
	ctx.rotate(angle);
	ctx.translate(-boid.x, -boid.y);
	ctx.beginPath();
	ctx.moveTo(boid.x, boid.y);
	ctx.fillStyle = boidColors[boid.type];
  if(boid.type == 0){
		if(boid.variant == 0){
			ctx.fillStyle = "#68DEE2D1"
			ctx.lineTo(boid.x - 16, boid.y);
			ctx.lineTo(boid.x, boid.y + 4);
			ctx.lineTo(boid.x + 6, boid.y);
			ctx.lineTo(boid.x, boid.y - 4);
			ctx.lineTo(boid.x - 16, boid.y);
	  }
		if(boid.variant == 1){
			ctx.fillStyle = "#01C6D6CA"
			ctx.lineTo(boid.x - 14, boid.y);
			ctx.lineTo(boid.x, boid.y + 4);
			ctx.lineTo(boid.x + 5, boid.y);
			ctx.lineTo(boid.x, boid.y - 4);
			ctx.lineTo(boid.x - 14, boid.y);
		}
		if(boid.variant == 2){
			ctx.fillStyle = "#0192B4CA"
			ctx.lineTo(boid.x - 14, boid.y);
			ctx.lineTo(boid.x, boid.y + 4);
			ctx.lineTo(boid.x + 5, boid.y);
			ctx.lineTo(boid.x, boid.y - 4);
			ctx.lineTo(boid.x - 14, boid.y);
		}
		if(boid.variant == 3){
			ctx.fillStyle = "#02608CCA"
			ctx.lineTo(boid.x - 12, boid.y);
			ctx.lineTo(boid.x, boid.y + 4);
			ctx.lineTo(boid.x + 4, boid.y);
			ctx.lineTo(boid.x, boid.y - 4);
			ctx.lineTo(boid.x - 12, boid.y);
		}
  }
  else if(boid.type == 1){
		if(boid.variant == 0){//Blue Med Fish
			ctx.fillStyle = "#1360D2A1"
			ctx.lineTo(boid.x + 10, boid.y);
			ctx.lineTo(boid.x, boid.y+4);
			ctx.lineTo(boid.x - 10, boid.y+6);
			ctx.lineTo(boid.x - 8, boid.y+1);
			ctx.lineTo(boid.x - 15, boid.y+3);
			ctx.lineTo(boid.x - 12, boid.y);
			ctx.lineTo(boid.x - 15, boid.y-3);
			ctx.lineTo(boid.x - 8, boid.y-1);
			ctx.lineTo(boid.x - 10, boid.y-6);
			ctx.lineTo(boid.x, boid.y-4);
			ctx.lineTo(boid.x + 10, boid.y);
		}
		else if(boid.variant == 1){//Yellow Med Fish
			ctx.fillStyle = "#EFDC0EB1"
			ctx.lineTo(boid.x + 7, boid.y);
			ctx.lineTo(boid.x + 4, boid.y+2);
			ctx.lineTo(boid.x - 1, boid.y+5);
			ctx.lineTo(boid.x - 8, boid.y+3);
			ctx.lineTo(boid.x - 13, boid.y+1);
			ctx.lineTo(boid.x - 20, boid.y+2);
			ctx.lineTo(boid.x - 16, boid.y);
			ctx.lineTo(boid.x - 20, boid.y-2);
			ctx.lineTo(boid.x - 13, boid.y-1);
			ctx.lineTo(boid.x - 8, boid.y-3);
			ctx.lineTo(boid.x - 1, boid.y-5);
			ctx.lineTo(boid.x + 4, boid.y-2);
			ctx.lineTo(boid.x + 7, boid.y);
		}
		else if(boid.variant == 2){
			ctx.fillStyle = "#E25526CA"//Orange Med Fish
			ctx.lineTo(boid.x + 10, boid.y);
			ctx.lineTo(boid.x, boid.y+4);
			ctx.lineTo(boid.x - 8, boid.y+5);
			ctx.lineTo(boid.x - 6, boid.y+1);
			ctx.lineTo(boid.x - 15, boid.y+3);
			ctx.lineTo(boid.x - 12, boid.y);
			ctx.lineTo(boid.x - 15, boid.y-3);
			ctx.lineTo(boid.x - 6, boid.y-1);
			ctx.lineTo(boid.x - 8, boid.y-5);
			ctx.lineTo(boid.x, boid.y-4);
			ctx.lineTo(boid.x + 10, boid.y);
		}
		else if(boid.variant == 3){
			ctx.fillStyle = "#DB2B49C1"//Red Med Fish
			ctx.lineTo(boid.x + 12, boid.y);
			ctx.lineTo(boid.x + 7, boid.y+4);
			ctx.lineTo(boid.x, boid.y+3);
			ctx.lineTo(boid.x - 5, boid.y+1);
			ctx.lineTo(boid.x - 10, boid.y+2);
			ctx.lineTo(boid.x - 8, boid.y);
			ctx.lineTo(boid.x - 10, boid.y-2);
			ctx.lineTo(boid.x - 5, boid.y-1);
			ctx.lineTo(boid.x, boid.y-3);
			ctx.lineTo(boid.x + 7, boid.y-4);
			ctx.lineTo(boid.x + 12, boid.y);
		}
  }
  else if(boid.type == 2){
		if(boid.variant < 4){//Fugu
			ctx.fillStyle = "#7C6217b1"
			ctx.lineTo(boid.x+8, boid.y);//Q1
			ctx.lineTo(boid.x+9, boid.y+1);//Spike
	    ctx.lineTo(boid.x+7, boid.y+3);
	    ctx.lineTo(boid.x+8, boid.y+4);//Spike
	    ctx.lineTo(boid.x+6, boid.y+5);
	    ctx.lineTo(boid.x+5, boid.y+6);
	    ctx.lineTo(boid.x+4, boid.y+8);//Spike
	    ctx.lineTo(boid.x+3, boid.y+7);
	    ctx.lineTo(boid.x+1, boid.y+9);//Spike
	    ctx.lineTo(boid.x, boid.y+8);//Q2
			ctx.lineTo(boid.x-1, boid.y+9);//Spike
	    ctx.lineTo(boid.x-3, boid.y+7);
			ctx.lineTo(boid.x-4, boid.y+8);//Spike
	    ctx.lineTo(boid.x-5, boid.y+6);
	    ctx.lineTo(boid.x-6, boid.y+5);
			ctx.lineTo(boid.x-8, boid.y+4);//Spike
	    ctx.lineTo(boid.x-7, boid.y+4);
	    ctx.lineTo(boid.x-9, boid.y+3);//Tail
	    ctx.lineTo(boid.x-10, boid.y+2);
	    ctx.lineTo(boid.x-14, boid.y+3);
	    ctx.lineTo(boid.x-11, boid.y);
	    ctx.lineTo(boid.x-14, boid.y-3);
	    ctx.lineTo(boid.x-10, boid.y-2);
	    ctx.lineTo(boid.x-9, boid.y-3);//Q3
	    ctx.lineTo(boid.x-7, boid.y-4);
			ctx.lineTo(boid.x-8, boid.y-4);//Spike
	    ctx.lineTo(boid.x-6, boid.y-5);
	    ctx.lineTo(boid.x-5, boid.y-6);
			ctx.lineTo(boid.x-4, boid.y-8);//Spike
	    ctx.lineTo(boid.x-3, boid.y-7);
			ctx.lineTo(boid.x-4, boid.y-9);//Spike
	    ctx.lineTo(boid.x, boid.y-8);//Q4
			ctx.lineTo(boid.x+1, boid.y-9);//Spike
	    ctx.lineTo(boid.x+3, boid.y-7);
			ctx.lineTo(boid.x+4, boid.y-8);//Spike
	    ctx.lineTo(boid.x+5, boid.y-6);
	    ctx.lineTo(boid.x+6, boid.y-5);
			ctx.lineTo(boid.x+9, boid.y-4);//Spike
	    ctx.lineTo(boid.x+7, boid.y-3);
			ctx.lineTo(boid.x+9, boid.y-1);//Spike
	    ctx.lineTo(boid.x+8, boid.y);
		}
		else if(boid.variant < 4){

		}
  }
  else if(boid.type == 3){
		if(boid.variant < 2){//Adult Dolphin
			ctx.fillStyle = "#5F676EAa";
			ctx.lineTo(boid.x, boid.y-8);//Left Fin
			ctx.lineTo(boid.x-2, boid.y-10);
			ctx.lineTo(boid.x-4, boid.y-11);
			ctx.lineTo(boid.x+2, boid.y-12);
			ctx.lineTo(boid.x+4, boid.y-10);
			ctx.lineTo(boid.x+5, boid.y-8);
			ctx.lineTo(boid.x, boid.y-8);
			ctx.lineTo(boid.x, boid.y+8);//Right Fin
			ctx.lineTo(boid.x-2, boid.y+10);
			ctx.lineTo(boid.x-4, boid.y+11);
			ctx.lineTo(boid.x+2, boid.y+12);
			ctx.lineTo(boid.x+4, boid.y+10);
			ctx.lineTo(boid.x+5, boid.y+8);
			ctx.lineTo(boid.x, boid.y+8);
			ctx.lineTo(boid.x, boid.y);//Dorsal Fin
			ctx.lineTo(boid.x-10, boid.y+2);
			ctx.lineTo(boid.x-15, boid.y);
			ctx.lineTo(boid.x-10, boid.y-2);
			ctx.lineTo(boid.x, boid.y);
			ctx.lineTo(boid.x-26, boid.y);//Tail Fin
			ctx.lineTo(boid.x-30, boid.y+5);
			ctx.lineTo(boid.x-32, boid.y+8);
			ctx.lineTo(boid.x-36, boid.y+10);
			ctx.lineTo(boid.x-35, boid.y+9);
			ctx.lineTo(boid.x-34, boid.y+3);
			ctx.lineTo(boid.x-33, boid.y);
			ctx.lineTo(boid.x-34, boid.y-3);
			ctx.lineTo(boid.x-35, boid.y-9);
			ctx.lineTo(boid.x-36, boid.y-10);
			ctx.lineTo(boid.x-32, boid.y-8);
			ctx.lineTo(boid.x-30, boid.y-5);
			ctx.lineTo(boid.x-26, boid.y);
			ctx.fill()
			ctx.lineTo(boid.x, boid.y);//Full Body
			ctx.lineTo(boid.x-1, boid.y-8);
			ctx.lineTo(boid.x+5, boid.y-8);
			ctx.lineTo(boid.x+9, boid.y-7);//Head
			ctx.lineTo(boid.x+13, boid.y-6);
			ctx.lineTo(boid.x+17, boid.y-2);
			ctx.lineTo(boid.x+22, boid.y-1);
			ctx.lineTo(boid.x+23, boid.y);
			ctx.lineTo(boid.x+22, boid.y+1);
			ctx.lineTo(boid.x+17, boid.y+2);
			ctx.lineTo(boid.x+13, boid.y+6);
			ctx.lineTo(boid.x+9, boid.y+7);
			ctx.lineTo(boid.x+5, boid.y+8);
			ctx.lineTo(boid.x-1, boid.y+8);
			ctx.lineTo(boid.x-10, boid.y+7);//Right-Back Body
			ctx.lineTo(boid.x-20, boid.y+4);
			ctx.lineTo(boid.x-29, boid.y+1);
			ctx.lineTo(boid.x-29, boid.y-1);//Left-Back Body
			ctx.lineTo(boid.x-20, boid.y-4);
			ctx.lineTo(boid.x-10, boid.y-7);
			ctx.lineTo(boid.x, boid.y-8);
		}
		else if(boid.variant > 1){//Baby Dolphin
			ctx.fillStyle = "#646D75Ba";
			ctx.lineTo(boid.x, boid.y-7);//Left Fin
			ctx.lineTo(boid.x-1, boid.y-9);
			ctx.lineTo(boid.x-3, boid.y-10);
			ctx.lineTo(boid.x+2, boid.y-10);
			ctx.lineTo(boid.x+4, boid.y-8);
			ctx.lineTo(boid.x+5, boid.y-7);
			ctx.lineTo(boid.x, boid.y-7);
			ctx.lineTo(boid.x, boid.y+7);//Right Fin
			ctx.lineTo(boid.x-1, boid.y+9);
			ctx.lineTo(boid.x-3, boid.y+10);
			ctx.lineTo(boid.x+2, boid.y+10);
			ctx.lineTo(boid.x+4, boid.y+8);
			ctx.lineTo(boid.x+5, boid.y+7);
			ctx.lineTo(boid.x, boid.y+7);
			ctx.lineTo(boid.x, boid.y);//Dorsal Fin
			ctx.lineTo(boid.x-7, boid.y+2);
			ctx.lineTo(boid.x-10, boid.y);
			ctx.lineTo(boid.x-7, boid.y-2);
			ctx.lineTo(boid.x, boid.y);
			ctx.lineTo(boid.x-21, boid.y);//Tail Fin
			ctx.lineTo(boid.x-25, boid.y+4);
			ctx.lineTo(boid.x-27, boid.y+6);
			ctx.lineTo(boid.x-31, boid.y+8);
			ctx.lineTo(boid.x-30, boid.y+7);
			ctx.lineTo(boid.x-29, boid.y+2);
			ctx.lineTo(boid.x-28, boid.y);
			ctx.lineTo(boid.x-29, boid.y-2);
			ctx.lineTo(boid.x-30, boid.y-7);
			ctx.lineTo(boid.x-31, boid.y-8);
			ctx.lineTo(boid.x-27, boid.y-6);
			ctx.lineTo(boid.x-25, boid.y-4);
			ctx.lineTo(boid.x-21, boid.y);
			ctx.fill()
			ctx.lineTo(boid.x, boid.y);//Left Body
			ctx.lineTo(boid.x-1, boid.y-7);
			ctx.lineTo(boid.x+5, boid.y-7);
			ctx.lineTo(boid.x+7, boid.y-6);//Head
			ctx.lineTo(boid.x+10, boid.y-5);
			ctx.lineTo(boid.x+14, boid.y-2);
			ctx.lineTo(boid.x+19, boid.y-1);
			ctx.lineTo(boid.x+20, boid.y);//Nose
			ctx.lineTo(boid.x+19, boid.y+1);
			ctx.lineTo(boid.x+14, boid.y+2);
			ctx.lineTo(boid.x+10, boid.y+5);
			ctx.lineTo(boid.x+7, boid.y+6);
			ctx.lineTo(boid.x+5, boid.y+7);//RightBody
			ctx.lineTo(boid.x-1, boid.y+7);
			ctx.lineTo(boid.x-5, boid.y+6);
			ctx.lineTo(boid.x-15, boid.y+3);
			ctx.lineTo(boid.x-24, boid.y+1);
			ctx.lineTo(boid.x-24, boid.y-1);//Left-Back Body
			ctx.lineTo(boid.x-15, boid.y-3);
			ctx.lineTo(boid.x-5, boid.y-6);
			ctx.lineTo(boid.x-1, boid.y-7);
		}
  }
  else if(boid.type == 4){
		if(boid.variant < 2){//Sea Turtle
			ctx.fillStyle = "#2F4A20D1"; // Green sea turtle
			// Turtle shell (oval shape)
			ctx.lineTo(boid.x + 10, boid.y);
			ctx.lineTo(boid.x + 7, boid.y + 5);
			ctx.lineTo(boid.x + 2, boid.y + 6);
			ctx.lineTo(boid.x - 3, boid.y + 6);
			ctx.lineTo(boid.x - 8, boid.y + 5);
			ctx.lineTo(boid.x - 11, boid.y + 2);
			ctx.lineTo(boid.x - 12, boid.y);
			ctx.lineTo(boid.x - 11, boid.y - 2);
			ctx.lineTo(boid.x - 8, boid.y - 5);
			ctx.lineTo(boid.x - 3, boid.y - 6);
			ctx.lineTo(boid.x + 2, boid.y - 6);
			ctx.lineTo(boid.x + 7, boid.y - 5);
			ctx.lineTo(boid.x + 10, boid.y);
			ctx.fill();
			// Head
			ctx.fillStyle = "#466E2FD1";
			ctx.beginPath();
			ctx.moveTo(boid.x + 8, boid.y);
			ctx.lineTo(boid.x + 11, boid.y + 2);
			ctx.lineTo(boid.x + 14, boid.y);
			ctx.lineTo(boid.x + 11, boid.y - 2);
			ctx.lineTo(boid.x + 8, boid.y);
			ctx.fill();
			// Flippers
			// Front left flipper
			ctx.beginPath();
			ctx.moveTo(boid.x + 5, boid.y + 4);
			ctx.lineTo(boid.x + 8, boid.y + 5);
			ctx.lineTo(boid.x + 10, boid.y + 8);
			ctx.lineTo(boid.x + 5, boid.y + 6);
			ctx.lineTo(boid.x + 5, boid.y + 4);
			ctx.fill();
			// Front right flipper
			ctx.beginPath();
			ctx.moveTo(boid.x + 5, boid.y - 4);
			ctx.lineTo(boid.x + 8, boid.y - 5);
			ctx.lineTo(boid.x + 10, boid.y - 8);
			ctx.lineTo(boid.x + 5, boid.y - 6);
			ctx.lineTo(boid.x + 5, boid.y - 4);
			ctx.fill();
			// Back left flipper
			ctx.beginPath();
			ctx.moveTo(boid.x - 8, boid.y + 4);
			ctx.lineTo(boid.x - 10, boid.y + 2);
			ctx.lineTo(boid.x - 11, boid.y + 8);
			ctx.lineTo(boid.x - 8, boid.y + 6);
			ctx.lineTo(boid.x - 8, boid.y + 4);
			ctx.fill();
			// Back right flipper
			ctx.beginPath();
			ctx.moveTo(boid.x - 8, boid.y - 4);
			ctx.lineTo(boid.x - 10, boid.y - 2);
			ctx.lineTo(boid.x - 11, boid.y - 8);
			ctx.lineTo(boid.x - 8, boid.y - 6);
			ctx.lineTo(boid.x - 8, boid.y - 4);
			ctx.fill();
		}
		else if(boid.variant >= 2){//Loggerhead Turtle
			ctx.fillStyle = "#5F4A20D1"; // Brown loggerhead
			// Turtle shell (oval shape)
			ctx.lineTo(boid.x + 10, boid.y);
			ctx.lineTo(boid.x + 7, boid.y + 5);
			ctx.lineTo(boid.x + 2, boid.y + 6);
			ctx.lineTo(boid.x - 3, boid.y + 6);
			ctx.lineTo(boid.x - 8, boid.y + 5);
			ctx.lineTo(boid.x - 11, boid.y + 2);
			ctx.lineTo(boid.x - 12, boid.y);
			ctx.lineTo(boid.x - 11, boid.y - 2);
			ctx.lineTo(boid.x - 8, boid.y - 5);
			ctx.lineTo(boid.x - 3, boid.y - 6);
			ctx.lineTo(boid.x + 2, boid.y - 6);
			ctx.lineTo(boid.x + 7, boid.y - 5);
			ctx.lineTo(boid.x + 10, boid.y);
			ctx.fill();
			// Head
			ctx.fillStyle = "#8B4513d1";
			ctx.beginPath();
			ctx.moveTo(boid.x + 8, boid.y);
			ctx.lineTo(boid.x + 11, boid.y + 2);
			ctx.lineTo(boid.x + 14, boid.y);
			ctx.lineTo(boid.x + 11, boid.y - 2);
			ctx.lineTo(boid.x + 8, boid.y);
			ctx.fill();
			// Flippers
			// Front left flipper
			ctx.beginPath();
			ctx.moveTo(boid.x + 5, boid.y + 4);
			ctx.lineTo(boid.x + 8, boid.y + 5);
			ctx.lineTo(boid.x + 10, boid.y + 8);
			ctx.lineTo(boid.x + 5, boid.y + 6);
			ctx.lineTo(boid.x + 5, boid.y + 4);
			ctx.fill();
			// Front right flipper
			ctx.beginPath();
			ctx.moveTo(boid.x + 5, boid.y - 4);
			ctx.lineTo(boid.x + 8, boid.y - 5);
			ctx.lineTo(boid.x + 10, boid.y - 8);
			ctx.lineTo(boid.x + 5, boid.y - 6);
			ctx.lineTo(boid.x + 5, boid.y - 4);
			ctx.fill();
			// Back left flipper
			ctx.beginPath();
			ctx.moveTo(boid.x - 8, boid.y + 4);
			ctx.lineTo(boid.x - 10, boid.y + 2);
			ctx.lineTo(boid.x - 11, boid.y + 8);
			ctx.lineTo(boid.x - 8, boid.y + 6);
			ctx.lineTo(boid.x - 8, boid.y + 4);
			ctx.fill();
			// Back right flipper
			ctx.beginPath();
			ctx.moveTo(boid.x - 8, boid.y - 4);
			ctx.lineTo(boid.x - 10, boid.y - 2);
			ctx.lineTo(boid.x - 11, boid.y - 8);
			ctx.lineTo(boid.x - 8, boid.y - 6);
			ctx.lineTo(boid.x - 8, boid.y - 4);
			ctx.fill();
		}
  }
  else if(boid.type == SHARK_TYPE){
		const stage = Math.min(Math.max(boid.sizeStage || 1, 1), SHARK_MAX_STAGE);
		const scaleFactors = [0.85, 1.0, 1.25];
		const scale = scaleFactors[stage - 1];
		const sized = (value) => value * scale;
		const bodyColor = SHARK_BODY_COLORS[stage - 1];
		const bellyColor = SHARK_BELLY_COLORS[stage - 1];
		const finColor = SHARK_FIN_COLORS[stage - 1];
		// Body
		ctx.beginPath();
		ctx.fillStyle = bodyColor;
		ctx.moveTo(boid.x + sized(22), boid.y);
		ctx.lineTo(boid.x + sized(14), boid.y + sized(4));
		ctx.lineTo(boid.x + sized(4), boid.y + sized(7));
		ctx.lineTo(boid.x - sized(4), boid.y + sized(6));
		ctx.lineTo(boid.x - sized(12), boid.y + sized(3));
		ctx.lineTo(boid.x - sized(18), boid.y + sized(8));
		ctx.lineTo(boid.x - sized(22), boid.y + sized(2));
		ctx.lineTo(boid.x - sized(30), boid.y);
		ctx.lineTo(boid.x - sized(22), boid.y - sized(2));
		ctx.lineTo(boid.x - sized(18), boid.y - sized(8));
		ctx.lineTo(boid.x - sized(12), boid.y - sized(3));
		ctx.lineTo(boid.x - sized(4), boid.y - sized(6));
		ctx.lineTo(boid.x + sized(4), boid.y - sized(7));
		ctx.lineTo(boid.x + sized(14), boid.y - sized(4));
		ctx.lineTo(boid.x + sized(22), boid.y);
		ctx.fill();
		// Belly highlight
		ctx.beginPath();
		ctx.fillStyle = bellyColor;
		ctx.moveTo(boid.x + sized(10), boid.y + sized(1));
		ctx.lineTo(boid.x + sized(2), boid.y + sized(4));
		ctx.lineTo(boid.x - sized(6), boid.y + sized(4));
		ctx.lineTo(boid.x - sized(14), boid.y + sized(2));
		ctx.lineTo(boid.x - sized(18), boid.y);
		ctx.lineTo(boid.x - sized(6), boid.y - sized(1));
		ctx.lineTo(boid.x + sized(2), boid.y - sized(2));
		ctx.lineTo(boid.x + sized(10), boid.y + sized(1));
		ctx.fill();
		// Dorsal fin
		ctx.beginPath();
		ctx.fillStyle = finColor;
		ctx.moveTo(boid.x - sized(2), boid.y - sized(1));
		ctx.lineTo(boid.x - sized(8), boid.y - sized(13));
		ctx.lineTo(boid.x + sized(4), boid.y - sized(3));
		ctx.fill();
		// Tail fin
		ctx.beginPath();
		ctx.moveTo(boid.x - sized(30), boid.y);
		ctx.lineTo(boid.x - sized(36), boid.y + sized(10));
		ctx.lineTo(boid.x - sized(28), boid.y + sized(4));
		ctx.lineTo(boid.x - sized(36), boid.y - sized(10));
		ctx.lineTo(boid.x - sized(30), boid.y);
		ctx.fill();
		// Pectoral fins
		ctx.beginPath();
		ctx.moveTo(boid.x - sized(4), boid.y + sized(2));
		ctx.lineTo(boid.x + sized(4), boid.y + sized(8));
		ctx.lineTo(boid.x, boid.y + sized(11));
		ctx.lineTo(boid.x - sized(4), boid.y + sized(4));
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(boid.x - sized(2), boid.y - sized(1));
		ctx.lineTo(boid.x + sized(4), boid.y - sized(7));
		ctx.lineTo(boid.x, boid.y - sized(10));
		ctx.lineTo(boid.x - sized(4), boid.y - sized(4));
		ctx.fill();
		// Eye
		ctx.fillStyle = "#0E1824";
		ctx.beginPath();
		ctx.arc(boid.x + sized(12), boid.y - sized(2), Math.max(1.2, sized(1.4)), 0, Math.PI * 2);
		ctx.fill();
  }
  else{
		ctx.fillStyle = "#aaaadaca"
		//ctx.fillStyle = "rgb("+rainbow.r+","+rainbow.g+","+rainbow.b+",255)";
		//console.log("rgb("+bgTest[0]+","+bgTest[1]+","+bgTest[2]+")");
		ctx.lineTo(boid.x + 14, boid.y);
		ctx.lineTo(boid.x - 20, boid.y + 10);
		ctx.lineTo(boid.x - 20, boid.y - 10);
		ctx.lineTo(boid.x+10, boid.y);
  }
  ctx.fill();
  ctx.setTransform(1/simScaling, 0, 0, 1/simScaling, 0, 0);
}

function handleSharkFeeding(){
	const sharks = boids.filter(b => b.type === SHARK_TYPE);
	if(!sharks.length){
		return;
	}
	const fishToRemove = new Set();
	for(const shark of sharks){
		const stageIndex = Math.min(Math.max((shark.sizeStage || 1) - 1, 0), SHARK_MAX_STAGE - 1);
		const headOffset = SHARK_HEAD_OFFSETS[stageIndex];
		const headRadius = SHARK_HEAD_RADII[stageIndex];
		const speed = Math.sqrt(shark.dx * shark.dx + shark.dy * shark.dy);
		if(speed < 0.01){
			continue;
		}
		const dirX = shark.dx / speed;
		const dirY = shark.dy / speed;
		const headX = shark.x + dirX * headOffset;
		const headY = shark.y + dirY * headOffset;
		for(const candidate of boids){
			if(candidate === shark || candidate.type !== 0 || fishToRemove.has(candidate)){
				continue;
			}
			const distToHead = Math.hypot(candidate.x - headX, candidate.y - headY);
			if(distToHead <= headRadius){
				fishToRemove.add(candidate);
				shark.fishEaten = (shark.fishEaten || 0) + 1;
				checkSharkGrowth(shark);
			}
		}
	}
	if(fishToRemove.size){
		boids = boids.filter(b => !fishToRemove.has(b));
	}
}

function checkSharkGrowth(shark){
	if(!shark.sizeStage){
		shark.sizeStage = 1;
	}
	if(shark.sizeStage >= SHARK_MAX_STAGE){
		return;
	}
	const thresholdIndex = shark.sizeStage - 1;
	const nextThreshold = SHARK_GROWTH_THRESHOLDS[thresholdIndex];
	if(shark.fishEaten >= nextThreshold){
		shark.sizeStage += 1;
		console.log("Shark grew to stage " + shark.sizeStage);
	}
}

// Main animation loop
function animationLoop() {
  // Update each boid
  for (let boid of boids) {
	// Update the velocities according to each rule
	/*flyTowardsCenter(boid);
	avoidOthers(boid);
	matchVelocity(boid);
	limitSpeed(boid);
	keepWithinBounds(boid);*/
	boidBehaviour(boid);

	// Update the position based on the current velocity
	boid.x += boid.dx;
	boid.y += boid.dy;
	if(DRAW_TRAIL){
		boid.history.push([boid.x, boid.y])
		boid.history = boid.history.slice(-tailPortion);
	}
  }

  handleSharkFeeding();

  // Clear the canvas and redraw all the boids in their current positions
  const ctx = document.getElementById("boids").getContext("2d");
  ctx.clearRect(0, 0, width, height);
	shiftRainbow(rainbow);
  for (let boid of boids) {
	drawBoid(ctx, boid);
  }

  // Schedule the next frame
  window.requestAnimationFrame(animationLoop);
}

// Control panel functions
function updateSpeed(value) {
  simSpeed = value / 100;
  document.getElementById('speedValue').textContent = value + '%';
}

function updateCount(value) {
  foishCountMultiplier = parseFloat(value);
  document.getElementById('countValue').textContent = value + 'x';
  // Reinitialize boids with new count
  boids = [];
  initBoids();
}

function setupControls() {
  const speedSlider = document.getElementById('speedSlider');
  const countSlider = document.getElementById('countSlider');
  const gearButton = document.getElementById('gearButton');
  const controlPanel = document.getElementById('controlPanel');
  
  speedSlider.addEventListener('input', (e) => {
    updateSpeed(e.target.value);
  });
  
  countSlider.addEventListener('input', (e) => {
    updateCount(e.target.value);
  });
  
  gearButton.addEventListener('click', () => {
    controlPanel.classList.toggle('show');
  });
  
  // Close panel when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!controlPanel.contains(e.target) && !gearButton.contains(e.target)) {
        controlPanel.classList.remove('show');
      }
    }
  });
}

window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  // Setup control panel
  setupControls();

  const canvas = document.getElementById("boids");
  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const targetX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const targetY = (event.clientY - rect.top) * (canvas.height / rect.height);
    for (const boid of boids) {
      if (boid.type === SHARK_TYPE) {
        boid.target = { x: targetX, y: targetY };
      }
    }
  });

  //Creates console logs of the current program states.
  logStates();
  // Randomly distribute the boids to start
  initBoids();

  // Schedule the main animation loop
  window.requestAnimationFrame(animationLoop);
};
