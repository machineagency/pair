'use strict';

// modules =================================================
const express        = require('express');
const app            = express();
const bodyParser     = require('body-parser');
const path           = require('path');
const fs             = require('fs');
const ps             = require('python-shell');

// configuration ===========================================
let port = process.env.PORT || 3000; // set our port
app.use(bodyParser.json()); // for parsing application/json
app.use(express.static(__dirname + '/client')); // set the static files location /public/img will be /img for users
const shell = new ps.PythonShell('./cp_interpreter.py', {});

/* Keep references to the name and Express response object for the current
 * RPC and set the shell.on handler once only, using a lookup table that
 * checks the name of the RPC and handles it appropriately. This is because
 * we cannot unbind shell.on handlers and so cannot set them in routes. */
shell.currRpcResponse = undefined;
shell.currRpcName = '';
shell.on('message', (message) => {
    if (shell.currRpcName === 'choosePoint') {
        let xyPair = message;
        let parsedPair = xyPair.split(',').map(s => parseInt(s));
        shell.currRpcResponse.status(200).json({
            results: {
                x: parsedPair[0],
                y: parsedPair[1]
            }
        });
        shell.currRpcResponse = undefined;
        shell.currRpcName = '';
    }
    else if (shell.currRpcName === 'detectFaceBoxes') {
        try {
            let arrayOfArrays = JSON.parse(message);
            let boxes = arrayOfArrays.map(box => {
                return {
                    x: box[0],
                    y: box[1],
                    width: box[2],
                    height: box[3]
                }
            });
            shell.currRpcResponse.status(200).json({
                results: boxes
            });
            shell.currRpcResponse = undefined;
            shell.currRpcName = '';
        }
        catch (e) {
            console.log(`PC --> Could not parse faces.`);
        }
    }
    else if (shell.currRpcName === 'takePhoto') {
        shell.currRpcResponse.sendFile(__dirname + '/volatile/camera-photo.jpg');
        shell.currRpcResponse = undefined;
        shell.currRpcName = '';
    }
    else if (shell.currRpcResponse === 'warpLastPhoto') {
        shell.currRpcResponse.sendFile(__dirname + '/volatile/camera-photo-warped.jpg');
        shell.currRpcResponse = undefined;
        shell.currRpcName = '';
    }
    else {
        console.log(`PC --> ${message}`);
    }
});

// routes and start ========================================

let attachRoutesAndStart = () => {

    app.get('/machine/drawEnvelope', (req, res) => {
        shell.send('draw_envelope');
        res.status(200).send();
    });

    app.get('/machine/drawToolpath', (req, res) => {
        let svg_string = req.query['svgString']
        shell.send('draw_toolpath '+ svg_string);
        res.status(200).send();
    });

    app.get('/camera/takePhoto', (req, res) => {
        shell.currRpcResponse = res;
        shell.currRpcName = 'takePhoto';
        shell.send('take_photo');
    });

    app.get('/camera/warpLastPhoto', (req, res) => {
        shell.currRpcResponse = res;
        shell.currRpcName = 'warpLastPhoto';
        shell.send('warp_last_photo');
    });

    // TODO: pass in photo as parameter
    app.get('/image/detectFaceBoxes', (req, res) => {
        shell.currRpcResponse = res;
        shell.currRpcName = 'detectFaceBoxes';
        shell.send('detect_face_boxes');
    });

    app.get('/geometries', (req, res) => {
        let names = fs.readdirSync('./geometries').map((file) => {
            return file;
        });
        res.status(200).json({ names: names });
    });

    app.get('/geometry/:name', (req, res) => {
        res.sendFile(__dirname + `/geometries/${req.params.name}`);
    });

    app.listen(port, () => {
        console.log("Running on port: " + port);
        exports = module.exports = app;
    });
}

attachRoutesAndStart();

