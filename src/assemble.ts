
// This code is intended to perform the functionality of rootpath.
// Put all other code after these few lines.
import * as path from "path";
process.env.NODE_PATH = path.dirname(__filename);
require("module")._initPaths();
export var projectPath = path.dirname(__dirname);

import {Assembler} from "objects/assembler";

const assemblyFileExtension = ".bbasm";

function printUsageAndExit() {
    console.log("Usage: node assemble.js [-v] (path to .bbasm file)");
    process.exit(1);
}

if (process.argv.length !== 3 && process.argv.length !== 4) {
    printUsageAndExit();
}

let sourcePath = process.argv[process.argv.length - 1];
if (!sourcePath.toLowerCase().endsWith(assemblyFileExtension)) {
    console.log(`Input file must have ${assemblyFileExtension} extension.`);
    process.exit(1);
}

let shouldBeVerbose = false;
if (process.argv.length === 4) {
    if (process.argv[2] === "-v") {
        shouldBeVerbose = true;
    } else {
        printUsageAndExit();
    }
}

let destinationPath = sourcePath.substring(0, sourcePath.length - assemblyFileExtension.length);
let assembler = new Assembler(shouldBeVerbose);
assembler.assembleCodeFile(sourcePath, destinationPath);


