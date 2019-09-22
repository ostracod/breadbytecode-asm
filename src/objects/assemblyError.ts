
import {AssemblyError as AssemblyErrorInterface} from "models/objects";

export interface AssemblyError extends AssemblyErrorInterface {}

export class AssemblyError {
    constructor(message: string, lineNumber?: number) {
        this.message = message;
        if (typeof lineNumber === "undefined") {
            this.lineNumber = null;
        } else {
            this.lineNumber = lineNumber;
        }
    }
}


