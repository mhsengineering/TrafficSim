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
    var PHYSICS_CPS = 15;

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

    function Town() {
        //
        // Provides road for cars to drive on, connected in various ways
        //
        var roads = [];
    }
    Town.prototype.step = function () {
        // TODO: For every road, do something
    }

    function TrafficSim(town) {
        //
        // Simulates traffic in a town
        //
        this.town = town;
        this.pos = [0,0];
    }
    TrafficSim.prototype.getTrafficSim = function () {
        // Returns a collection of objects that represent all the
        // information needed to draw the traffic sim
        return this.pos;
    }
    TrafficSim.prototype.step = function () {
        // Does one traffic logic step
        this.town.step();
        this.pos[0]++;
        this.pos[1]++;
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
        this.context.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

        // Draw a path and print the current time to demonstrate its working
        this.context.beginPath();
        this.context.moveTo(10,10);
        this.context.lineTo(info[0],info[1]);
        this.context.stroke();
        this.context.closePath();
        this.context.fillText("time (ms): "+time.running.toString(),10,10);
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
        builder.start();
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


window.addEventListener("load", function () {
    window.traffic.start();
});
