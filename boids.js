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
let numBoids = simScaling*200;
const visualRange = 75//+(numBoids*0.15);
const x_margin = 200//window.innerWidth*0.15;//Margin from sides of screen
const y_margin = 120//window.innerHeight*0.2;//Mergin from top/bottom of screen

//What percentage of the tail should persist | 0->100%
const tailPortion = 50;
const DRAW_TRAIL = false;

//Normal Boid Traversal
const centeringFactor = 0.005*simSpeed; // adjust velocity by this %
const minDistance = 20; // The distance to stay away from other boids
const avoidFactor = 0.05*simSpeed; // Adjust velocity by this %
const matchingFactor = 0.05*simSpeed; // Adjust by this % of average velocity
const speedLimit = 15*simSpeed;//Boid topspeed
const turnFactor = 1*simSpeed;//Boid turnspeed

const boidColors = ["#282c34d1","#345258d1","#3f3b72d1","#6f4472","#416e72","#33723e"]
const trailColors = ["#282c3436","#34525836","#3f3b7236","#6f447236","#416e7236","#33723e36"]
const rainbow = {
	r: 0,
	g: 0,
	b: 200,
	max: 200};

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
	  type: (numTypes-1-Math.floor((Math.log(boids.length+1)/Math.log(numBoids))/(1-(Math.log(numTypes)/Math.log(6))))),
    };
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
	let centerX = 0;
	let centerY = 0;
	let moveX = 0;
	let moveY = 0;
	let avgDX = 0;
	let avgDY = 0;
	let numNeighbors = 0;
	for (let otherBoid of boids) {
		let boidDist = distance(boid,otherBoid);
		if(boidDist < visualRange){
	if(boid.type == otherBoid.type){
				centerX += otherBoid.x;
				centerY += otherBoid.y;
				avgDX += otherBoid.dx;
				avgDY += otherBoid.dy;
				numNeighbors += 1;
		}}
		if (otherBoid !== boid) {
			if(boidDist < minDistance){
				if(boid.type < otherBoid.type){
					moveX += (boid.x - otherBoid.x)*(otherBoid.type-boid.type+0.3);
					moveY += (boid.y - otherBoid.y)*(otherBoid.type-boid.type+0.3);
				}
				if(boid.type == otherBoid.type){
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

		boid.dx += ((avgDX - boid.dx) * matchingFactor) + ((centerX - boid.x) * centeringFactor);
		boid.dy += ((avgDY - boid.dy) * matchingFactor) + ((centerY - boid.y) * centeringFactor);
	}
	boid.dx += moveX * avoidFactor;
	boid.dy += moveY * avoidFactor;
	//Speed Limiting
	const speed = Math.sqrt(boid.dx * boid.dx + boid.dy * boid.dy);
	if (speed > speedLimit) {
		boid.dx = (boid.dx / speed) * speedLimit;
		boid.dy = (boid.dy / speed) * speedLimit;
	}
	//Bound Constraints
	if (boid.x < x_margin) {
		boid.dx += turnFactor;
	}
	if (boid.x > width - x_margin) {
		boid.dx -= turnFactor
	}
	if (boid.y < y_margin) {
		boid.dy += turnFactor;
	}
	if (boid.y > height - y_margin) {
		boid.dy -= turnFactor;
	}
}

function drawBoid(ctx, boid) {
  const angle = Math.atan2(boid.dy, boid.dx);
	  ctx.translate(boid.x, boid.y);
	  ctx.rotate(angle);
	  ctx.translate(-boid.x, -boid.y);
	  ctx.beginPath();
	  ctx.moveTo(boid.x, boid.y);
	  ctx.fillStyle = boidColors[boid.type];
  if(boid.type == 0){
		ctx.lineTo(boid.x - 12, boid.y + 4);
		ctx.lineTo(boid.x-16, boid.y);
		ctx.lineTo(boid.x - 12, boid.y - 4);
  }
  else if(boid.type == 1){
		ctx.lineTo(boid.x - 18, boid.y+6);
		ctx.lineTo(boid.x - 14, boid.y);
		ctx.lineTo(boid.x - 18, boid.y-6);
  }
  else if(boid.type == 2){
  }
  else if(boid.type == 3){
  }
  else if(boid.type == 4){
  }
  else{
		ctx.fillStyle = "#1b3c3cc3"
		//ctx.fillStyle = "rgb("+rainbow.r+","+rainbow.g+","+rainbow.b+",255)";
		//console.log("rgb("+bgTest[0]+","+bgTest[1]+","+bgTest[2]+")");
    ctx.lineTo(boid.x - 15, boid.y + 5);
		ctx.lineTo(boid.x - 15, boid.y - 5);
		ctx.lineTo(boid.x, boid.y);
  }
  ctx.fill();
  ctx.setTransform(1/simScaling, 0, 0, 1/simScaling, 0, 0);

  if (DRAW_TRAIL) {
    ctx.strokeStyle = trailColors[boid.type];
    ctx.beginPath();
    ctx.moveTo(boid.history[0][0], boid.history[0][1]);
    for (const point of boid.history) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();
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
