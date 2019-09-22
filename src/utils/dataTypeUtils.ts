
import {DataTypeUtils as DataTypeUtilsInterface} from "models/utils";
import {DataType} from "models/delegates";
import {dataTypeMap} from "delegates/dataType";
import {AssemblyError} from "objects/assemblyError";

export interface DataTypeUtils extends DataTypeUtilsInterface {}

export class DataTypeUtils {
    
}

export var dataTypeUtils = new DataTypeUtils();

DataTypeUtils.prototype.getDataTypeByName = function(name: string): DataType {
    if (!(name in dataTypeMap)) {
        throw new AssemblyError("Unrecognized data type.");
    }
    return dataTypeMap[name];
}


