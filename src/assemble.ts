
// This code is intended to perform the functionality of rootpath.
// Put all other code after these few lines.
import * as pathUtils from "path";
process.env.NODE_PATH = pathUtils.dirname(__filename);
require("module")._initPaths();
export var projectPath = pathUtils.dirname(__dirname);

import {BytecodeAppAssembler, InterfaceAssembler} from "objects/assembler";

const assemblerClassMap = {
    ".bbasm": BytecodeAppAssembler,
    ".biasm": InterfaceAssembler
};

function printPermittedFileExtensions() {
    let extensionList = [];
    for (let extension in assemblerClassMap) {
        extensionList.push(extension);
    }
    console.log("Permitted assembly file extensions: " + extensionList.join(", "));
}

function printUsageAndExit() {
    console.log(`Usage: node assemble.js [-v] (path to assembly file)`);
    printPermittedFileExtensions();
    process.exit(1);
}

function printExtensionErrorAndExit() {
    console.log("Invalid assembly file extension.");
    printPermittedFileExtensions();
    process.exit(1);
}

if (process.argv.length !== 3 && process.argv.length !== 4) {
    printUsageAndExit();
}

let sourcePath = process.argv[process.argv.length - 1];
let fileName = pathUtils.basename(sourcePath);
let tempIndex = fileName.lastIndexOf(".");
if (tempIndex < 0) {
    printExtensionErrorAndExit();
}
let fileExtension = fileName.substring(tempIndex, fileName.length);
if (!(fileExtension in assemblerClassMap)) {
    printExtensionErrorAndExit();
}

let shouldBeVerbose = false;
if (process.argv.length === 4) {
    if (process.argv[2] === "-v") {
        shouldBeVerbose = true;
    } else {
        printUsageAndExit();
    }
}

let destinationPath = sourcePath.substring(0, sourcePath.length - fileExtension.length);
let assemblerClass = assemblerClassMap[fileExtension];
let assembler = new assemblerClass(shouldBeVerbose);
assembler.assembleCodeFile(sourcePath, destinationPath);


