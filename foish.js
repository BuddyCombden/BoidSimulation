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
const simSpeed = 1*progScale;
//Number of Boid Types
const numTypes = 3;

//Auto adjusts number of boids and their range to better fit scaling.
let numBoids = 1;
const x_margin = window.innerWidth*0.05;//200//Margin from sides of screen
const y_margin = window.innerHeight*0.1//120;//Mergin from top/bottom of screen

//What percentage of the tail should persist | 0->100%
const tailPortion = 10;
const DRAW_TRAIL = true;

//Default Boid Traversal Values
const visualRange = 75//+(numBoids*0.15);
const centeringFactor = 0.0025*simSpeed; // adjust velocity by this %
const minDistance = 20; // The distance to stay away from other boids
const avoidFactor = 0.025*simSpeed; // Adjust velocity by this %
const matchingFactor = 0.025*simSpeed; // Adjust by this % of average velocity
const speedLimit = 5*simSpeed;//Boid topspeed
const turnFactor = 0.5*simSpeed;//Boid turnspeed

const boidColors = ["#282c34d1","#345258d1","#3f353ea1","#6f4472"]
const trailColors = ["#1097D132","#03C1E336","#4f455516","#6f447636"]
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
  numBoids = Math.round((width*height)/(6000*(simScaling/2)));
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
		if(x < boids.length*0.8)boids[x].type = 0;
		else if(x < boids.length*0.97)boids[x].type = 1;
		else if(x < boids.length*0.985)boids[x].type = 2;
		else if(x < boids.length*1.1)boids[x].type = 3;
		else boids[x].type = 4;
	}
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
	boid.dx += moveX * typeAvoidFctr;
	boid.dy += moveY * typeAvoidFctr;
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

window.onload = () => {
  // Make sure the canvas always fills the whole window
  window.addEventListener("resize", sizeCanvas, false);
  sizeCanvas();

  //Creates console logs of the current program states.
  logStates();
  // Randomly distribute the boids to start
  initBoids();

  // Schedule the main animation loop
  window.requestAnimationFrame(animationLoop);
};
