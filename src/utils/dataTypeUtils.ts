
import {NumberTypeClass} from "models/items";
import {DataTypeUtils as DataTypeUtilsInterface} from "models/utils";
import {DataType, NumberType} from "models/delegates";
import {dataTypeList, dataTypeMap} from "delegates/dataType";
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

DataTypeUtils.prototype.getNumberType = function(numberTypeClass: NumberTypeClass, byteAmount: number): NumberType {
    var index = 0;
    while (index < dataTypeList.length) {
        var tempDataType = dataTypeList[index];
        if (tempDataType instanceof numberTypeClass) {
            var tempNumberType = tempDataType as NumberType;
            if (tempNumberType.byteAmount == byteAmount) {
                return tempDataType;
            }
        }
        index += 1;
    }
    return null;
}

DataTypeUtils.prototype.mergeNumberTypes = function(numberType1: NumberType, numberType2: NumberType): NumberType {
    
    var tempClass;
    var tempByteAmount;
    
    var tempPriority1 = numberType1.getClassMergePriority();
    var tempPriority2 = numberType2.getClassMergePriority();
    if (tempPriority1 >= tempPriority2) {
        tempClass = numberType1.constructor;
    } else {
        tempClass = numberType2.constructor;
    }
    
    var tempPriority1 = numberType1.getByteAmountMergePriority();
    var tempPriority2 = numberType2.getByteAmountMergePriority();
    if (tempPriority1 > tempPriority2) {
        tempByteAmount = numberType1.byteAmount;
    } else if (tempPriority1 < tempPriority2) {
        tempByteAmount = numberType2.byteAmount;
    } else {
        tempByteAmount = Math.max(numberType1.byteAmount, numberType2.byteAmount);
    }
    
    return dataTypeUtils.getNumberType(tempClass, tempByteAmount);
}


