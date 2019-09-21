
var lineUtils = require("./lineUtils").lineUtils;

function NiceUtils() {
    
}

var niceUtils = new NiceUtils();

NiceUtils.prototype.printDefinitionList = function(title, definitionList) {
    if (definitionList.length <= 0) {
        return;
    }
    var tempIndentation = lineUtils.getIndentation(1);
    console.log(title + ":");
    var index = 0;
    while (index < definitionList.length) {
        var tempDefinition = definitionList[index];
        console.log(tempIndentation + tempDefinition.getDisplayString());
        index += 1;
    }
}

module.exports = {
    niceUtils: niceUtils
};


