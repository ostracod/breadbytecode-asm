
import {AssemblyError as AssemblyErrorInterface} from "models/objects";

export interface AssemblyError extends AssemblyErrorInterface {}

export class AssemblyError {
    
    constructor(message: string, lineNumber?: number, filePath?: string) {
        this.message = message;
        if (typeof lineNumber === "undefined") {
            this.lineNumber = null;
        } else {
            this.lineNumber = lineNumber;
        }
        if (typeof filePath === "undefined") {
            this.filePath = null;
        } else {
            this.filePath = filePath;
        }
    }
}


