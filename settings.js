/*
 * settings.js
 *
 * Sets up the Traffic Simulator
 */

var towns = [
    {
        name: "Trapezoid",
        create: function (town) {
            town.addStraightRoad(20,20,480,20,3);
            town.addStraightRoad(480,20,360,300,0.3);
            town.addStraightRoad(360,300,140,300,3);
            town.addStraightRoad(140,300,20,20,0.3);
            town.connectRoads(0,1);
            town.connectRoads(1,2);
            town.connectRoads(2,3);
            town.connectRoads(3,0);
        }
    },
    {
        name: "Road-a-bout",
        create: function (town) {
            town.addStraightRoad(250,50,350,150);
            town.addStraightRoad(350,150,325,300);
            town.addStraightRoad(325,300,175,300);
            town.addStraightRoad(175,300,150,150);
            town.addStraightRoad(150,150,250,50);
            town.connectRoads(0,1);
            town.connectRoads(1,2);
            town.connectRoads(2,3);
            town.connectRoads(3,4);
            town.connectRoads(4,0);
            town.addStraightRoad(175,300,100,300);
            town.addStraightRoad(50,250,150,150);
            town.addStraightRoad(350,150,450,250);
            town.connectRoads(5,2)
            town.connectRoads(6,4);
            town.connectRoads(0,7);
            town.connectRoads(7,5);
            town.connectRoads(7,6);
        }
    }
];


var cars = [
    {
        name: "Basic",
        intel: function (car,store,help) {
            if (help.roadEndRoadDistance() > 3) {
                help.forward(3);
            } else {
                help.nextRandomRoad();
            }
        }
    }
];

function genSim(build,opts) {
    var car = cars[opts.carai];
    var town = towns[opts.town];
    var count = parseInt(opts.carn);

    town.create(build.town);

    var carai = [];
    var pos = null;
    for (var i=0;i<count;i++) {
        pos = build.sim.getRandomPos(5);
        build.sim.addCar(5,pos.road,pos.pos,car.intel);
    }

    build.start();
}

function setupUI() {
    // Setup options
    var s_town = document.getElementById("s_town");
    var s_carai = document.getElementById("s_carai");
    var s_carn = document.getElementById("s_carn");
    towns.forEach(function (e,i) {
        var elem = document.createElement("option");
        var text = document.createTextNode(e.name);
        elem.appendChild(text);
        elem.value = i;
        s_town.appendChild(elem);
    });
    cars.forEach(function (e,i) {
        var elem = document.createElement("option");
        var text = document.createTextNode(e.name);
        elem.appendChild(text);
        elem.value = i;
        s_carai.appendChild(elem);
    });
    s_carn.value = 10;

    // Setup buttons
    document.getElementById("b_start").addEventListener("click", function () {
        genSim(window.traffic.start(),{
            town: s_town.value,
            carai: s_carai.value,
            carn: s_carn.value,
        });
    });
    document.getElementById("b_stop").addEventListener("click", function () {
        window.traffic.stop();
    });
}

window.addEventListener("load", function () {
    setupUI();
});
