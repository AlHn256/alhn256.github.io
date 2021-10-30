window.addEventListener('resize', resize, false);

var cellSize = 30;
var xOff = 2*cellSize*Math.sqrt(3)/3;
var yOff = cellSize*Math.sqrt(3)/3;
var heightDivisions = 10;
var noiseScale = .005;
var heightScale = 1.3;
var colorScale = 1;
var speed = .01;
var z = 0;
var colors = [];
var hexes = [];
var gridWidth, gridHeight;

function Point(x, y){
  this.x = x;
  this.y = y;
}

function Hex(p){
  this.center = p;
  this.height = round(pow(noise(p.x*noiseScale, p.y*noiseScale, z), heightScale)*heightDivisions);
}

Hex.prototype.tick = function(){
  var p = this.center;
  this.height = round(pow(noise(p.x*noiseScale, p.y*noiseScale, z), heightScale)*heightDivisions);
}

Hex.prototype.render = function(){
  fill(colors[this.height]);
  ellipse(this.center.x, this.center.y, cellSize)
}

function setup(){
  colorMode(HSB, 100, 100);
  createCanvas();
  resize();
  gridWidth = floor(width/cellSize);
  gridHeight = floor(height/cellSize);
  createColors();
  createHexes();
  background(0);
  
  var gui = new dat.GUI();
  gui.add(this, "noiseScale", .001, .05, .003);
  gui.add(this, "heightScale", 0, 2, .003);
  gui.add(this, "speed", 0, 1, .003);
}

function createHexes(){
  hexes = [];
  for (var i = 0; i <= gridWidth; i++){
    for (var j = 0; j <= gridHeight; j++){
      var x = i*cellSize;
      var y = j*cellSize;
      if (j%2 == 0) x += cellSize/2;
      var p = new Point(x, y);
      var hex = new Hex(p);
      hexes.push(hex);
    }
  }
}

function createColors(){
  for (var i = 0; i < heightDivisions; i++){
    var satbal = pow((i/heightDivisions), colorScale)*100;
    var c = color(120, 100 - satbal, satbal);
    colors.push(c);
  }
}

function draw(){
  if (hexes == undefined) return;
  for (var i = 0; i < hexes.length; i++){
    hexes[i].tick();
    hexes[i].render();
  }
  z += speed;
  // noLoop();
}

function resize(){
  resizeCanvas(window.innerWidth, window.innerHeight);
  background(0);
}