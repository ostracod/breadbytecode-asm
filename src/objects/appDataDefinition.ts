
import {AssemblyLine} from "models/objects";
import {Assembler} from "objects/assembler";
import {AssemblyError} from "objects/assemblyError";
import {lineUtils} from "utils/lineUtils";

Assembler.prototype.extractAppDataDefinitions = function(): void {
    var self = this;
    self.processLines(function(line) {
        if (line.directiveName == "APP_DATA") {
            if (line.argList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            var index = 0;
            while (index < line.codeBlock.length) {
                var tempLine = line.codeBlock[index];
                self.appDataLineList.push(tempLine);
                index += 1;
            }
            return [];
        }
        return null
    });
}


