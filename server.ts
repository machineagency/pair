import { Database, Statement } from 'better-sqlite3';
import { Express, Application, Handler, Request, Response } from 'express';
import { SerialPort, SerialPortMock } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const IDENTITY_COEFFS = '1,0,0,0,1,0,0,0,1';

// modules =================================================
const express        = require('express');
const app            = express();
const bodyParser     = require('body-parser');
const path           = require('path');
const fs             = require('fs');
const ps             = require('python-shell');
const bsDatabase     = require('better-sqlite3');

// configuration ===========================================
const SERVER_PORT = 3001; // set our port
// For testing — change PORT_DEBUG to false to work with real ports—true otherwise.
const PORT_DEBUG = true;
SerialPortMock.binding.createPort('/dev/JUBILEE', { echo: true, record: true });
SerialPortMock.binding.createPort('/dev/LASER_CUTTER', { echo: true, record: true });
const DEVICE_PORTS: SerialPort[] = [];
const DEVICE_PORT_MOCKS: SerialPortMock[] = [];
const DEVICE_PORT_PARSERS: ReadlineParser[] = [];
app.use(bodyParser.json()); // for parsing application/json
app.use(express.static(__dirname + '/client')); // set the static files location /public/img will be /img for users
const shell = new ps.PythonShell('./cp_interpreter.py', {});

// database ===========================================
const db = new bsDatabase('verso.db', {});
let initWorkflowTable = (db: Database) => {
    let query = db.prepare('CREATE TABLE IF NOT EXISTS Workflows ('
        + 'progName TEXT NOT NULL,'
        + 'progText TEXT NOT NULL'
        + ');');
    query.run();
};

let workflowTableIsEmpty = (db: Database) => {
    let query = db.prepare('SELECT * FROM Workflows;');
    let maybeRows = query.all();
    return maybeRows.length === 0;
};

let addWorkflow = (db: Database, workflowName: string, workflowText: string) => {
    let query = db.prepare('INSERT INTO Workflows '
        + `VALUES ('${workflowName}', '${workflowText}');`);
    query.run();
};

initWorkflowTable(db);
if (workflowTableIsEmpty(db)) {
    console.log('Seeding database!');
    seedDatabase(db);
}


/* Keep references to the name and Express response object for the current
 * RPC and set the shell.on handler once only, using a lookup table that
 * checks the name of the RPC and handles it appropriately. This is because
 * we cannot unbind shell.on handlers and so cannot set them in routes. */
shell.currRpcResponse = undefined;
shell.currRpcName = '';
shell.on('message', (message: string) => {
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
            let boxes = arrayOfArrays.map((box: number[]) => {
                return {
                    topLeftX: box[0],
                    topLeftY: box[1],
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
    else if (shell.currRpcName === 'generatePreview') {
        console.log(`PC (preview) --> ${message}`);
        shell.currRpcResponse.sendFile(__dirname + '/volatile/plot_preview.svg');
        shell.currRpcResponse = undefined;
        shell.currRpcName = '';
    }
    else if (shell.currRpcName === 'generateInstructions') {
        let instText = fs.readFileSync(__dirname + '/volatile/plot_instructions.txt')
                         .toString();
        let instructions = instText.split('\n').filter((inst: string) => !!inst);
        shell.currRpcResponse.status(200).json({
            instructions: instructions
        });
        shell.currRpcResponse = undefined;
        shell.currRpcName = '';
    }
    else if (shell.currRpcName === 'takePhoto') {
        shell.currRpcResponse.sendFile(__dirname + '/volatile/camera-photo.jpg');
        shell.currRpcResponse = undefined;
        shell.currRpcName = '';
    }
    else if (shell.currRpcName === 'warpLastPhoto') {
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

    app.get('/workflows', (req: Request, res: Response) => {
        let query;
        if (req.query.workflowName) {
            query = db.prepare('SELECT * FROM Workflows '
                + `WHERE progName='${req.query.workflowName}'`);
            try {
                let row = query.get();
                res.status(200).json({
                    workflows: row
                });
            }
            catch (e) {
                res.status(404).send();
            }
        }
        else {
            query = db.prepare('SELECT * FROM Workflows ORDER BY progName ASC;');
            try {
                let rows = query.all();
                res.status(200).json({
                    workflows: rows
                });
            }
            catch (e) {
                res.status(404).send();
            }
        }
    });

    app.put('/workflows', (req: Request, res: Response) => {
        let workflowName = req.query.workflowName;
        let workflowText = req.query.workflowText;
        if (!(workflowName && workflowText)) {
            res.status(400).send();
            return;
        }
        workflowText = workflowText.toString();
        workflowText = workflowText.replaceAll('\'', '\'\'');
        workflowText = workflowText.replaceAll('\\n', '\n');
        let maybeRows = db.prepare(`SELECT * FROM Workflows WHERE progName='${workflowName}'`)
                         .all();
        if (maybeRows.length !== 0) {
            // Update existing workflow text
            console.log('Resolve PUT -> UPDATE');
            let updateQuery = db.prepare(
                'UPDATE Workflows '
                + `SET progText='${workflowText}' `
                + `WHERE progName='${workflowName}'`
            );
            let info = updateQuery.run();
            if (!info.changes) {
                res.status(500).send();
            }
            else {
                res.status(200).send();
            }
        }
        else {
            // Insert new workflow
            console.log('Resolve PUT -> INSERT');
            let updateQuery = db.prepare(
                'INSERT INTO Workflows '
                + '(progName, progText) '
                + `VALUES ('${workflowName}', '${workflowText}')`
            );
            let info = updateQuery.run();
            if (!info.changes) {
                res.status(500).send();
            }
            else {
                res.status(200).send();
            }
        }
    });

    app.delete('/workflows', (req: Request, res: Response) => {
        let workflowName = req.query.workflowName;
        if (!workflowName) {
            res.status(400).send();
            return;
        }
        let updateQuery = db.prepare(
            'DELETE FROM Workflows '
            + `WHERE progName='${workflowName}'`
        );
        let info = updateQuery.run();
        if (info.changes) {
            res.status(200).send();
        }
        else {
            res.status(500).send();
        }
    });

    app.get('/machine/drawEnvelope', (req: Request, res: Response) => {
        shell.send('draw_envelope');
        res.status(200).send();
    });

    app.get('/machine/drawToolpath', (req: Request, res: Response) => {
        let svg_string = req.query['svgString']
        shell.send('draw_toolpath '+ svg_string);
        res.status(200).send();
    });

    app.get('/machine/generatePreview', (req: Request, res: Response) => {
        let svg_string = req.query['svgString']
        shell.currRpcResponse = res;
        shell.currRpcName = 'generatePreview';
        shell.send('generate_preview '+ svg_string);
    });

    app.get('/machine/generateInstructions', (req: Request, res: Response) => {
        let svg_string = req.query['svgString']
        shell.currRpcResponse = res;
        shell.currRpcName = 'generateInstructions';
        shell.send('generate_instructions '+ svg_string);
    });

    app.get('/camera/takePhoto', (req: Request, res: Response) => {
        /* Format: 'c0,c1,...,c8' */
        let coeffs = req.query['coeffs'] || IDENTITY_COEFFS;
        shell.currRpcResponse = res;
        shell.currRpcName = 'takePhoto';
        shell.send(`take_photo ${coeffs}`);
    });

    app.get('/camera/warpLastPhoto', (req: Request, res: Response) => {
        /* Format: 'c0,c1,...,c8' */
        let coeffs = req.query['coeffs']
        shell.currRpcResponse = res;
        shell.currRpcName = 'warpLastPhoto';
        shell.send(`warp_last_photo ${coeffs}`);
    });

    // TODO: pass in photo as parameter
    app.get('/image/detectFaceBoxes', (req: Request, res: Response) => {
        shell.currRpcResponse = res;
        shell.currRpcName = 'detectFaceBoxes';
        shell.send('detect_face_boxes');
    });

    app.get('/geometries', (req: Request, res: Response) => {
        let possiblyHiddenNames: string[] = fs.readdirSync('./geometries')
                                                .map((file: string) => {
            return file;
        });
        let names = possiblyHiddenNames.filter((name) => {
            return name.length > 0 && name[0] !== '.';
        });
        res.status(200).json({ names: names });
    });

    app.get('/geometry/:name', (req: Request, res: Response) => {
        res.sendFile(__dirname + `/geometries/${req.params.name}`);
    });

    // List device's UNIX ports, whether open or not.
    app.get('/portPaths', (req: Request, res: Response) => {
        let PortType = PORT_DEBUG ? SerialPortMock : SerialPort;
        PortType.list().then((list) => {
            res.status(200).json({
                paths: list
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            });
        });
    });

    // List ports opened and wrapped in the SerialPort API.
    app.get('/ports', (req: Request, res: Response) => {
        res.status(200).json({
            ports: DEVICE_PORTS.map((fullPort, idx) => {
                return `<DevicePort - id: ${idx}, path: ${fullPort.path}>`;
            })
        });
    });

    // Initialize a new device port and return its assigned id.
    // If a port already exists with this path, return that port's id.
    app.put('/ports', (req: Request, res: Response) => {
        const DEFAULT_BAUD_RATE = 115200;
        let pathQuery = req.query.path;
        let baudRateQuery = req.query.baudRate;
        if (!pathQuery || !baudRateQuery) {
            res.status(400).json({ message: 'Need a valid path a baudrate.' });
        }
        else {
            let path = pathQuery.toString();
            let maybeExistingPort = DEVICE_PORTS.find((port) => port.path === path);
            if (maybeExistingPort) {
                let portId = DEVICE_PORTS.indexOf(maybeExistingPort);
                    res.status(200).json({
                        id: portId,
                        message: 'Hardware port has already been opened.'
                    });
                    return;
            }
            let baudRate = parseInt(baudRateQuery.toString()) || DEFAULT_BAUD_RATE;
            if (PORT_DEBUG) {
                let devicePort = new SerialPortMock({
                    path: path,
                    baudRate: baudRate,
                }, (err: Error | null) => {
                    if (err) {
                        res.status(500).json({ message: err.message });
                    }
                    else {
                        let parser = devicePort.pipe(new ReadlineParser());
                        let devicePortId = DEVICE_PORT_MOCKS.push(devicePort) - 1;
                        DEVICE_PORT_PARSERS.push(parser);
                        res.status(200).json({
                            id: devicePortId,
                            message: 'Port opened successfully.'
                        });
                    }
                });
            }
            else {
                let devicePort = new SerialPort({
                    path: path,
                    baudRate: baudRate,
                }, (err: Error | null) => {
                    if (err) {
                        res.status(500).json({ message: err.message });
                    }
                    else {
                        let parser = devicePort.pipe(new ReadlineParser());
                        let devicePortId = DEVICE_PORTS.push(devicePort) - 1;
                        DEVICE_PORT_PARSERS.push(parser);
                        res.status(200).json({
                            id: devicePortId,
                            message: 'Port opened successfully.'
                        });
                    }
                });
            }
        }
    });

    app.get('/ports/:portId/', (req: Request, res: Response) => {
        let portId = parseInt(req.params.portId);
        let portList = PORT_DEBUG ? DEVICE_PORT_MOCKS : DEVICE_PORTS;
        if (isNaN(portId) || portId >= portList.length) {
            res.status(400).json({ message: 'Invalid port id.' });
        }
        else {
            let port = portList[portId];
            res.status(200).json({
                message: `<DevicePort - id: ${portId}, path: ${port.path}>`
            });
        }
    });

    // Expects a body with the format { "instructions" : [ <string>* ] }
    app.put('/ports/:portId/instructions', (req: Request, res: Response) => {
        let portId = parseInt(req.params.portId);
        let portList = PORT_DEBUG ? DEVICE_PORT_MOCKS : DEVICE_PORTS;
        if (isNaN(portId) || portId >= portList.length) {
            res.status(400).json({ message: 'Invalid port id.' });
            return;
        }
        let instructionJson = req.body;
        if (!instructionJson) {
            res.status(400).json({ message: 'No instructions sent.' });
            return;
        }
        let instructions = instructionJson.instructions;
        if (!instructions) {
            res.status(400).json({ message: 'Body has no instruction field.' });
            return;
        }
        let port = portList[portId];
        let parser = DEVICE_PORT_PARSERS[portId];
        let respondWithFirstLineAndFlush = (data: string) => {
            res.status(200).json({ message: data });
            port.flush();
            parser.removeListener('data', respondWithFirstLineAndFlush);
        };
        parser.on('data', respondWithFirstLineAndFlush);
        let serializedInstructions = instructions.join('\n') + '\n';
        port.write(serializedInstructions);
    });

    app.get('/ports/:portId/position', (req: Request, res: Response) => {
        let portId = parseInt(req.params.portId);
        let portList = PORT_DEBUG ? DEVICE_PORT_MOCKS : DEVICE_PORTS;
        if (isNaN(portId) || portId >= portList.length) {
            res.status(400).json({ message: 'Invalid port id.' });
            return;
        }
        let port = portList[portId];
        let parser = DEVICE_PORT_PARSERS[portId];
        parser.on('data', (data) => {
            console.log(`Received data: ${data}`);
            res.status(200).json({ data: data });
        });
        let positionQueryGCode = 'M114\n';
        port.write(positionQueryGCode);
    });

    app.listen(SERVER_PORT, () => {
        console.log("Running on port: " + SERVER_PORT);
        exports = module.exports = app;
    });
}

function seedDatabase(db: Database) {
    const workflowHeadersDir = 'workflows/headers/';
    const workflowImplementationDir = 'workflows/implementations/';
    fs.readdir(workflowHeadersDir, (err: string, files: string[]) => {
        if (err) {
            throw err;
        }
        files.forEach((filename) => {
            if (filename[0] === '.') {
                return;
            }
            if (filename.split('.')[1] === 'json') {
                let fullFilename = workflowHeadersDir + filename;
                let jsFilename = filename.split('.')[0] + '.js';
                let jsFullFileName = workflowImplementationDir + jsFilename;
                fs.readFile(fullFilename, (err: string, headerData: string) => {
                    if (err) {
                        throw err;
                    }
                    let headerObj = JSON.parse(headerData);
                    fs.readFile(jsFullFileName, (err: string, jsData: string) => {
                        if (err) {
                            console.error(`Missing JS for: ${filename}.`);
                            throw err;
                        }
                        let progName = headerObj['progName'];
                        let progText = jsData.toString();
                        // SQL escapes quotes with ... another quote.
                        progText = progText.replaceAll('\'', '\'\'');
                        let queryStr = ('INSERT INTO Workflows '
                            + '(progName, progText) '
                            + `VALUES ('${progName}', '${progText}');`);
                        let query = db.prepare(queryStr);
                        query.run();
                    });
                });
            }
        });
    });
};

attachRoutesAndStart();

