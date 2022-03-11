import * as verso from './verso.js';

export type InterpreterSignature = (tp: verso.Toolpath) => THREE.Group;

export class VisualizationInterpreters {
    // EBB
    static ebbBasicViz(toolpath: verso.Toolpath) {
        let moveCurves : THREE.LineCurve3[] = [];
        let getXyMmChangeFromABSteps = (aSteps: number, bSteps: number) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new THREE.Vector3(
                (x / stepsPerMm),
                (y / stepsPerMm),
                0.0
            );
        };
        let currentPosition = new THREE.Vector3();
        let newPosition : THREE.Vector3;
        let moveCurve: THREE.LineCurve3;
        let tokens, opcode, duration, aSteps, bSteps, xyChange;
        toolpath.instructions.forEach((instruction) => {
            tokens = instruction.split(',');
            opcode = tokens[0];
            if (opcode === 'SM') {
                aSteps = parseInt(tokens[2]);
                bSteps = parseInt(tokens[3]);
                xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
                newPosition = currentPosition.clone().add(xyChange);
                moveCurve = new THREE.LineCurve3(currentPosition, newPosition);
                moveCurves.push(moveCurve);
                currentPosition = newPosition;
            }
        });
        let material = new THREE.MeshToonMaterial({
            color: 0xe44242,
            side: THREE.DoubleSide
        });
        let pathRadius = 0.25
        let geometries = moveCurves.map((curve) => {
            return new THREE.TubeBufferGeometry(curve, 64, pathRadius, 64, false);
        });
        let meshes = geometries.map((geom) => {
            return new THREE.Mesh(geom, material);
        });
        let wrapperGroup = new THREE.Group();
        meshes.forEach((mesh) => wrapperGroup.add(mesh));
        wrapperGroup.rotateX(Math.PI / 2);
        return wrapperGroup;
    }

    static ebbColorViz(toolpath: verso.Toolpath) {
        let moveCurves : THREE.LineCurve3[] = [];
        let getXyMmChangeFromABSteps = (aSteps: number, bSteps: number) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new THREE.Vector3(
                (x / stepsPerMm),
                (y / stepsPerMm),
                0.0
            );
        };
        let moveCurve: THREE.LineCurve3;
        let curveMaterials: THREE.Material[] = [];
        enum Colors {
            Red = 0xe44242,
            Green = 0x2ecc71
        }
        enum PenHeight {
            Up = -7,
            Down = 0
        }
        let currentColor = Colors.Green;
        let currentPenHeight = PenHeight.Up;
        let currentPosition = new THREE.Vector3(0, 0, currentPenHeight);
        let newPosition = currentPosition.clone();
        let tokens, opcode, duration, aSteps, bSteps, xyChange, material;
        let materialColor = Colors.Green;
        toolpath.instructions.forEach((instruction) => {
            tokens = instruction.split(',');
            opcode = tokens[0];
            if (opcode === 'SM') {
                aSteps = parseInt(tokens[2]);
                bSteps = parseInt(tokens[3]);
                xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
                newPosition = currentPosition.clone().add(xyChange);
                materialColor = currentColor;
            }
            if (opcode === 'SP') {
                currentColor = currentColor === Colors.Red
                               ? Colors.Green : Colors.Red;
                currentPenHeight = currentPenHeight === PenHeight.Up
                                   ? PenHeight.Down : PenHeight.Up;
                newPosition = currentPosition.clone().setZ(currentPenHeight);
                materialColor = Colors.Green;
            }
            moveCurve = new THREE.LineCurve3(currentPosition, newPosition);
            moveCurves.push(moveCurve);
            currentPosition = newPosition;
            material = new THREE.MeshToonMaterial({
                color: materialColor,
                side: THREE.DoubleSide
            });
            curveMaterials.push(material);
        });
        let pathRadius = 0.25
        let geometries = moveCurves.map((curve) => {
            return new THREE.TubeBufferGeometry(curve, 64, pathRadius, 64, false);
        });
        let meshes = geometries.map((geom, idx) => {
            return new THREE.Mesh(geom, curveMaterials[idx]);
        });
        let wrapperGroup = new THREE.Group();
        meshes.forEach((mesh) => wrapperGroup.add(mesh));
        wrapperGroup.rotateX(Math.PI / 2);
        return wrapperGroup;
    }

    static ebbVelocityThicknessViz(toolpath: verso.Toolpath) {
        let moveCurves : THREE.LineCurve3[] = [];
        let getXyMmChangeFromABSteps = (aSteps: number, bSteps: number) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new THREE.Vector3(
                (x / stepsPerMm),
                (y / stepsPerMm),
                0.0
            );
        };
        let axidrawMaxMMPerSec = 380;
        let maxStrokeRadius = 10;
        let currentPosition = new THREE.Vector3();
        let newPosition : THREE.Vector3;
        let moveCurve: THREE.LineCurve3;
        let tokens, opcode, duration, aSteps, bSteps, xyChange;
        let velRadii : number[] = [];
        toolpath.instructions.forEach((instruction) => {
            tokens = instruction.split(',');
            opcode = tokens[0];
            if (opcode === 'SM') {
                duration = parseInt(tokens[1]);
                aSteps = parseInt(tokens[2]);
                bSteps = parseInt(tokens[3]);
                xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
                newPosition = currentPosition.clone().add(xyChange);
                moveCurve = new THREE.LineCurve3(currentPosition, newPosition);
                moveCurves.push(moveCurve);
                currentPosition = newPosition;
                let durationSec = duration / 100;
                let norm = Math.sqrt(Math.pow(xyChange.x, 2) + Math.pow(xyChange.y,2));
                let mmPerSec = norm / durationSec;
                let velRadius = (mmPerSec / axidrawMaxMMPerSec) * maxStrokeRadius;
                velRadii.push(velRadius);
            }
        });
        let material = new THREE.MeshToonMaterial({
            color: 0xe44242,
            side: THREE.DoubleSide
        });
        let geometries = moveCurves.map((curve, idx) => {
            let velRadius = velRadii[idx];
            return new THREE.TubeBufferGeometry(curve, 64, velRadius, 64, false);
        });
        let meshes = geometries.map((geom) => {
            return new THREE.Mesh(geom, material);
        });
        let wrapperGroup = new THREE.Group();
        meshes.forEach((mesh) => wrapperGroup.add(mesh));
        wrapperGroup.rotateX(Math.PI / 2);
        return wrapperGroup;
    }

    //G-Code
    static gcodeColorViz(toolpath: verso.Toolpath) {
        let moveCurves : THREE.LineCurve3[] = [];
        let moveCurve: THREE.LineCurve3;
        let curveMaterials: THREE.Material[] = [];
        enum Colors {
            Red = 0xe44242,
            Green = 0x2ecc71
        }
        enum PenHeight {
            Up = -7,
            Down = 0
        }
        let currentColor = Colors.Green;
        let currentPenHeight = PenHeight.Up;
        let currentPosition = new THREE.Vector3(0, 0, currentPenHeight);
        let newPosition = currentPosition.clone();
        let tokens, opcode, duration, opX, opY, opZ, opF, material;
        let posChange;
        let materialColor = Colors.Green;
        let opcodeRe = /(G[0-9]+|M[0-9]+)/;
        let opXRe = /X([0-9]+)/;
        let opYRe = /Y([0-9]+)/;
        let opZRe = /Z([0-9]+)/;
        let opFRe = /F([0-9]+)/;
        let findOpcode = (instruction: string, argRe: RegExp) => {
            let maybeArgResults = instruction.match(argRe);
            if (!maybeArgResults) { return ''; }
            return maybeArgResults[0];
        };
        let findArg = (instruction: string, argRe: RegExp, fallback: number) => {
            let maybeArgResults = instruction.match(argRe);
            if (!maybeArgResults || maybeArgResults.length < 2) {
                return fallback;
            }
            return parseInt(maybeArgResults[1]) || 0;
        };
        toolpath.instructions.forEach((instruction) => {
            opcode = findOpcode(instruction, opcodeRe);
            if (opcode === 'G0' || opcode === 'G1') {
                opX = findArg(instruction, opXRe, currentPosition.x),
                opY = findArg(instruction, opYRe, currentPosition.y),
                // Two negatives here because our coordinate basis is wonky
                opZ = -findArg(instruction, opZRe, -currentPosition.z)
                newPosition = new THREE.Vector3(opX, opY, opZ);
                // Set color based on height
                if (currentPosition.z === 0 && newPosition.z === 0) {
                    currentColor = Colors.Red;
                }
                else {
                    currentColor = Colors.Green;
                }
                materialColor = currentColor;
            }
            moveCurve = new THREE.LineCurve3(currentPosition, newPosition);
            moveCurves.push(moveCurve);
            currentPosition = newPosition;
            material = new THREE.MeshToonMaterial({
                color: materialColor,
                side: THREE.DoubleSide
            });
            curveMaterials.push(material);
        });
        let pathRadius = 0.25
        let geometries = moveCurves.map((curve) => {
            return new THREE.TubeBufferGeometry(curve, 64, pathRadius, 64, false);
        });
        let meshes = geometries.map((geom, idx) => {
            return new THREE.Mesh(geom, curveMaterials[idx]);
        });
        let wrapperGroup = new THREE.Group();
        meshes.forEach((mesh) => wrapperGroup.add(mesh));
        wrapperGroup.rotateX(Math.PI / 2);
        return wrapperGroup;
    }


}
