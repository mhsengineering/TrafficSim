/*
 * traffic.js
 */

//
// All code is executed in an auto-executing anonymous function
// Debugging functions are exposed through window.traffic
//
window.traffic = (function () {

    ///////////////
    // Constants //
    ///////////////
    var CANVAS_HEIGHT = 500;
    var CANVAS_WIDTH  = 500;
    var PHYSICS_CPS = 30;

    /////////////
    // Globals //
    /////////////
    var builder;

    //////////////////////
    // Helper Functions //
    //////////////////////
    function getCurrentTime() {
        return (new Date()).getTime();
    }
    function getRandomArrayItem(arr) {
        if (arr.length < 1) {
            return null;
        } else if (arr.length == 1) {
            return arr[0];
        }
        var i = Math.floor(Math.random()*arr.length);
        return arr[i];
    }

    /////////////
    // Classes //
    /////////////
    function TrafficBuilder(canvas) {
        //
        // Puts all the classes together (should be created after pageload)
        //
        this.canvas = canvas;
        this.town = new Town();
        this.sim = new TrafficSim(this.town);
        this.drawer = new TrafficSimDrawer(this.sim,this.canvas);
        this.timer = new CanvasTimer(this.sim.getFrame(),this.drawer.getFrame());
    }
    TrafficBuilder.prototype.start = function () {
        this.timer.go();
    }
    TrafficBuilder.prototype.stop = function () {
        this.timer.stop();
    }
    TrafficBuilder.prototype.getSetup = function () {
        var that = this;
        return {
            town: this.town,
            sim: this.sim,
            start: function () {
                that.start();
            },
            stop: function () {
                that.stop();
            },
        };
    }

    function Town() {
        //
        // Provides road for cars to drive on, connected in various ways
        //
        this.roads = [];
    }
    Town.prototype.step = function () {
        // TODO: For every road, do something
    }
    Town.prototype.addStraightRoad = function (startx,starty,endx,endy,speed) {
        // Basic properties
        var road = {
            startx: startx,
            starty: starty,
            endx: endx,
            endy: endy,
            distance: Math.sqrt(Math.pow(startx-endx,2),Math.pow(starty-endy,2)),
            connectsFrom: [],
            connectsTo: [],
            speedlimit: speed,
            active: true,
            id: this.roads.length, // Index in this.roads
        };
        // Derived properties
        road.vector = [endx-startx,endy-starty];
        road.unit = [road.vector[0]/road.distance,road.vector[1]/road.distance];
        // Add to array
        this.roads.push(road);
    }
    Town.prototype.connectRoads = function (from, to) {
        // Connects 2 roads such that from goes onto to
        this.roads[from].connectsTo.push(to)
        this.roads[to].connectsFrom.push(from);
    }
    Town.prototype.getRoad = function (id) {
        // Returns information for a single road
        return this.roads[id];
    }
    Town.prototype.getRandomRoad = function () {
        return this.getRoad(
                Math.floor(Math.random()*this.roads.length)
                );
    }
    Town.prototype.getRoads = function () {
        // Returns an array of roads representing all the
        // information needed to draw them
        return this.roads.map(function (road) {
            return {
                x1: road.startx,
                y1: road.starty,
                x2: road.endx,
                y2: road.endy,
                active: road.active,
            };
        });
    }

    function TrafficSim(town) {
        //
        // Simulates traffic in a town
        //
        this.town = town;
        this.cars = [];
    }
    TrafficSim.prototype.addCar = function (length,road,position,intel) {
        var car = {
            length: length,
            roadid: road,
            roadpos: position,
            speed: 0,
        };
        // Derived properties
        car.intel = this.buildIntelCaller(intel,car);

        this.cars.push(car);
    }
    TrafficSim.prototype.getRandomPos = function (length) {
        // Choose a random position free of cars
        var road = this.town.getRandomRoad();
        var pos = road.distance*Math.random();
        for (car of this.cars) {
            if (car.roadid == road.id) {
                if (Math.abs(car.roadpos-pos)<=length) {
                    return this.getRandomPos(length);
                }
            }
        }
        return {road: road.id, pos: pos};
    }
    TrafficSim.prototype.buildIntelCaller = function (intel,car) {
        var helper = {
            sim: this,
            town: this.town,
            car: car,
        };
        helper.getRoad = function () {
            return this.town.getRoad(car.roadid);
        }
        helper.roadEndRoadDistance = function () {
            return helper.getRoad().distance-car.roadpos;
        }
        helper.forward = function (dis) {
            car.roadpos += dis;
        }
        helper.nextRandomRoad = function () {
            car.roadpos = 0;
            car.roadid = getRandomArrayItem(helper.getRoad().connectsTo);
            console.log("car.roadid",car.roadid);
        }

        var store = {};
        return function () {
            intel.call(null,car,store,helper);
        }
    }
    TrafficSim.prototype.stepCars = function () {
        for (car of this.cars) {
            car.intel();
        }
    }
    TrafficSim.prototype.getTrafficSim = function () {
        // Returns a collection of objects that represent all the
        // information needed to draw the traffic sim
        return {
            roads: this.town.getRoads(),
            cars: this.getCars(),
        };
    }
    TrafficSim.prototype.getCars = function () {
        // Returns information needed to draw cars
        var sim=this;
        return this.cars.map(function (car) {
            var road = sim.town.getRoad(car.roadid);
            var center = [road.unit[0]*car.roadpos+road.startx,
                          road.unit[1]*car.roadpos+road.starty];
            var front  = [road.unit[0]*(car.roadpos+car.length/2)+road.startx,
                          road.unit[1]*(car.roadpos+car.length/2)+road.starty];
            var back   = [road.unit[0]*(car.roadpos-car.length/2)+road.startx,
                          road.unit[1]*(car.roadpos-car.length/2)+road.starty];
            return {
                frontx: front[0],
                fronty: front[1],
                centerx: center[0],
                centery: center[1],
                backx: center[0],
                backy: center[1],
            }
        });
    }
    TrafficSim.prototype.step = function () {
        // Does one traffic logic step
        this.town.step();
        this.stepCars();
    }
    TrafficSim.prototype.getFrame = function () {
        // Returns a function to be used as the physics step
        var that=this;
        return function (time) {
            that.step();
        }
    }

    function TrafficSimDrawer(sim,canvas) {
        //
        // Draws a TrafficSim object onto a canvas
        //
        this.sim = sim;
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
    }
    TrafficSimDrawer.prototype.draw = function (time) {
        var info = this.sim.getTrafficSim();
        this.clear();

        this.drawRoads(info.roads);
        this.drawCars(info.cars);
    }
    TrafficSimDrawer.prototype.drawCars = function (cars) {
        // Draws the cars
        this.context.beginPath();
        for (car of cars) {
            this.context.moveTo(car.backx,car.backy);
            this.context.lineTo(car.frontx,car.fronty);
        }
        this.context.lineWidth = 5;
        this.context.strokeStyle = "#00F";
        this.context.lineCap = "square";
        this.context.stroke();
        this.context.closePath();
    }
    TrafficSimDrawer.prototype.drawRoads = function (roads) {
        // Draws the roads
        this.context.beginPath();
        for (road of roads) {
            this.context.moveTo(road.x1,road.y1);
            this.context.lineTo(road.x2,road.y2);
        }
        this.context.lineWidth = 3;
        this.context.strokeStyle = "#000";
        this.context.stroke();
        this.context.closePath();
    }
    TrafficSimDrawer.prototype.clear = function () {
        // Clears the canvas
        this.context.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    }
    TrafficSimDrawer.prototype.getFrame = function () {
        // Returns function to be used as the frame builder
        var that=this;
        return function (time) {
            that.draw(time);
        }
    }

    function CanvasTimer(framePhysics,frameDraw) {
        // 
        // Provides timing for use in animating a canvas with stable physics
        // Usage:
        //   framePhysics - function(t) called PHYSICS_CPS times per second
        //     t - timing information
        //   frameDraw - function(t) called every requestAnimationFrame
        //     t - timing information
        //

        this.framePhysics = this.createCall(framePhysics);
        this.frameDraw = this.createCall(frameDraw);

        this.running = false;
        this.timeStart = -1;
        this.timeRunning = 1;
        this.timePrev  = -1;
        this.timeNow   = 0;
        this.timeElapse = 1;

        this.physCalls = 0;
    }
    CanvasTimer.prototype.go = function () {
        // Runs the CanvasTimer from a new this.timeStart
        
        if (this.running) {
            // Don't create 2 requestAnimationFrame loops
            return;
        }

        this.timeStart = getCurrentTime();
        this.timeRunning = 1;
        this.timePrev = getCurrentTime()-1;
        this.timeNow = getCurrentTime()+1;
        this.timeElapse = 1;

        this.physCalls = 0;

        this.running = true;
        requestAnimationFrame(this.getRAFHandler());
    }
    CanvasTimer.prototype.stop = function () {
        // Stops the canvas timer. Note the object won't be picked up by
        // garbage collection until next requestAnimationFrame call
        this.running = false;
    }
    CanvasTimer.prototype.handleRAF = function () {
        // Handles requestAnimationFrame responses
        this.timePrev = this.timeNow;
        this.timeNow = getCurrentTime();
        this.timeRunning = this.timeNow-this.timeStart;
        this.timeElapse = this.timeNow-this.timePrev;

        this.handlePhysicsFrame();
        this.handleDrawFrame();
    }
    CanvasTimer.prototype.handlePhysicsFrame = function () {
        // Handles physics every requestAnimationFrame

        // The physics function should be called, on average,
        // PHYSICS_CPS times per second. The total calls since
        // this.timeStart is stored in this.physCalls. Keep calling
        // until the number of times we're supposed to call has been
        // reached.
        var targetCalls = this.timeRunning * PHYSICS_CPS * 0.001;
        while (targetCalls > this.physCalls) {
            this.framePhysics();
            this.physCalls++;
        }
    }
    CanvasTimer.prototype.handleDrawFrame = function () {
        // Handles drawing every requestAnimationFrame
        
        // We trust the requestAnimationFrame handler to give us
        // a proper framerate, so nothing special has to be done
        this.frameDraw();
    }
    CanvasTimer.prototype.getRAFHandler = function () {
        // Crates a function that calls this.handleRAF
        var that=this;
        return (function () {
          if (that.running) {
              that.handleRAF();
              requestAnimationFrame(that.getRAFHandler());
          };
        });
    }
    CanvasTimer.prototype.createCall = function (callback) {
        // Creates a caller that we can call without leaking class in the
        // "this" object and giving proper arguments
        var that = this;
        return function () {
            callback.call(null,{
                prev: that.timePrev,
                now:  that.timeNow,
                running: that.timeRunning,
                elapse:  that.timeElapse,
            });
        };
    }

    ////////////////////////
    // External Functions //
    ////////////////////////
    function start() {
        if (builder) {
            stop();
        }
        builder = new TrafficBuilder(document.getElementById("traffic"));
        return builder.getSetup();
    };
    function stop() {
        builder.stop();
    }

    return {
        // Public Functions
        start: start,
        stop: stop,

        // Debug Functions
        getBuilder: function () {
            return builder;
        },
    };

})();
