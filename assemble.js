
var Assembler = require("./assembler").Assembler;

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


