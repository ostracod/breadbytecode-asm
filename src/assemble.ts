
// This code is intended to perform the functionality of rootpath.
// Put all other code after these few lines.
import * as path from "path";
process.env.NODE_PATH = path.dirname(__filename);
require("module")._initPaths();
export var projectPath = path.dirname(__dirname);

import {Assembler} from "objects/assembler";

var assemblyFileExtension = ".bbasm";

if (process.argv.length != 3) {
    console.log("Please provide a single path to a .bbasm file.");
    process.exit(1);
}

var sourcePath = process.argv[2];
if (!sourcePath.toLowerCase().endsWith(assemblyFileExtension)) {
    console.log("Input file must have " + assemblyFileExtension + " extension.");
    process.exit(1);
}

var destinationPath = sourcePath.substring(0, sourcePath.length - assemblyFileExtension.length);
var assembler = new Assembler();
assembler.assembleCodeFile(sourcePath, destinationPath);


