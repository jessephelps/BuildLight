var express = require('express');
var app = express();
var path = require('path');
var http = require('http');
var server =http.Server(app);
var io = require('socket.io')(server);
var noble = require('noble');
var bodyParser = require('body-parser');
var fs = require('fs');
var buildConfigs = [];
var peripherals = [];
var exitHandlerBound = false;
var assignedConfigs = [];
var config;

console.log("Starting Build Lights");

if(fs.existsSync('config')) {
    console.log("Config file found.");
    console.log("Loading config file.");
    var configData = fs.readFileSync('config', 'utf8');
} else {
    console.log("No config file found.");
}

//app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.json({ type: '*/*' }))

app.get('/', function(req, res) {
    //Join all arguments together and normalize the resulting path.
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});

app.get('/config', function (req, res) {
    res.status(200).send(config);
});

app.post('/config', function(req, res) {
    console.log(req.body);
    res.redirect('..');
});

app.post('/', function(req, res) {
    console.log(req.body);
    console.log(req);
    var config = req.body.build.buildTypeId;
    var notifyType = req.body.build.notifyType;
    var result = req.body.build.buildResult;
    console.log(config + " " + notifyType + " " + result);
    var bulb = assignedConfigs[config];
    if(bulb) {
        console.log("Config " + config + " has bulb " + bulb + " assigned to it.");
        if(notifyType == "buildStarted")
        {
            var startedBuffer = new Buffer("bb280344", "hex");
            sendCommand(bulb.peripheral, startedBuffer);
        }
        else if(notifyType == "buildFinished" && result == "success")
        {
            var successBuffer = new Buffer("5600ff0000f0aa", "hex");
            sendCommand(bulb.peripheral, successBuffer);
        }
        else if(notifyType == "buildFinished" && result == "failure")
        {
            var failureBuffer = new Buffer("56ff000000f0aa", "hex");
            sendCommand(bulb.peripheral, failureBuffer);
        }
        else if(notifyType == "buildInterrupted")
        {
            var failureBuffer = new Buffer("56ffff0000f0aa", "hex");
            sendCommand(bulb.peripheral, failureBuffer);
        }
    }
    res.sendStatus(200);
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));

noble.on('warning', function(message) {
    console.log("warning: " + message);
});

noble.on('discover', function(peripheral) {
    if(peripheral && peripheral.advertisement && peripheral.advertisement.localName) {
        var peripheralName = peripheral.advertisement.localName.substring(0,16);
        var peripheralId = peripheralName.substring(8,16);
        if(peripheralName && peripheralName.substring(0,7) == 'LEDBlue')
        {
            if(!exitHandlerBound)
            {
                exitHandlerBound = true;
                process.on('SIGINT', exitHandler);
                process.on('exit', exitHandler);
            }
            console.log("Discovered: " + peripheralName);
            peripheral.on('connect', function () {
                console.log("Connected to: " + peripheralName);
                var buffer = new Buffer("56ffff0000f0aa", "hex");
                sendCommand(peripheral, buffer);
            });
            
            peripheral.connect(function (e) {
                if(e)
                    console.log(e);
            });
            peripheral.on('disconnect', function() {
                console.log("Disconnect from: " + peripheralName);
            });
            peripherals[peripheralId] = {
                name: peripheralName,
                peripheral: peripheral
            };
            io.emit('bulb detected', peripheralId);
        }
    }
});

//Socket.io Event handlers
io.on('connection', function(socket) {
    io.emit('connected bulbs', Object.keys(peripherals));
    io.emit('teamcity configs', buildConfigs);
    
//    socket.on('toogle led', function(msg) {
//        myOnboardLed.write(ledState?1:0); //if ledState is true then write a '1' (high) otherwise write a '0' (low)
//        msg.value = ledState;
//        io.emit('toogle led', msg);
//        ledState = !ledState; //invert the ledState
//    });

    socket.on('identify bulb', function(msg) {
        var identifyBuffer = new Buffer("bb250144", "hex");
        var revertBuffer = new Buffer("5600ff0000f0aa", "hex");
        console.log("Identify bulb: " + msg.bulb);
        sendCommand(peripherals[msg.bulb].peripheral, identifyBuffer);
        setTimeout(function () {
            console.log("End identify bulb: " + msg.bulb);
            sendCommand(peripherals[msg.bulb].peripheral, revertBuffer);
        }, 5000);
    });
    
    socket.on('assign bulb', function (msg) { 
        var bulb = msg.bulb;
        var config = msg.config;
        console.log("Assign bulb " + bulb + " to config " + config);
        assignedConfigs[config] = peripherals[bulb];
    });
});

var exitHandler = function exitHandler() {
    peripherals.forEach(function(peripheral) {
        console.log('Disconnecting from ' + peripheral.uuid + '...');
        peripheral.disconnect( function(){
            console.log('disconnected');
        });
    });
 
    //end process after 2 more seconds
    setTimeout(function(){
        process.exit();
    }, 5000);
}

function sendCommand(peripheral, buffer) {
    if(peripheral.state != "connected") {
        console.log("peripheral not connected - " + peripheral.state);
        if(peripheral.state == "disconnected") {
            console.log("connecting");
            peripheral.connect(function (e) {
                if(e)
                    console.log(e);
            });
        }
    } else {
        var peripheralName = peripheral.advertisement.localName.substring(0,16);
        if(peripheralName.substring(8,9) == '8')
        {
            peripheral.writeHandle(0x002e, buffer, true, function (e) {
            if(e)
                console.log("writeHandle error: " + e);
            });
        }
        else {
            peripheral.writeHandle(0x0043, buffer, true, function (e) {
            if(e)
                console.log("writeHandle error: " + e);
            });
        }
    }
}

noble.on('stateChange', function(state) {
  if (state === 'poweredOn')
    noble.startScanning([], false, function (e){
        if(e)
            console.log(e);
    });
  else
    noble.stopScanning();
});

server.listen(3000, function(){
    console.log('Web server Active listening on *:3000');
});

var options = {
    host: '192.168.1.111',
    port: '8111',
    path: '/httpAuth/app/rest/buildTypes?locator=paused:false',
    headers: { 
        'Authorization': 'AUTH HEADER NEEDED HERE', 
        'Accept': 'application/json' 
    }
};

callback = function(response) {
    var str = '';

    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
        str += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
        var tcjson = JSON.parse(str);
        console.log(tcjson);
        buildConfigs = tcjson.buildType.map(function (buildType) {
            return {
                id: buildType.id,
                name: buildType.name,
                projectName: buildType.projectName
            };
        });
        
        //console.log(buildConfigs);
    });
}

http.request(options, callback).end();