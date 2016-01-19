/*
 * normalize an array of elements (from 0 to 1)
 * @param lst, array, a list of number to be normalized
 * @return thisArray, array, results of normalized array
 */
var toNormalized = function(lst) {
    var thisArray = lst,
        ratio = Math.max.apply(Math, thisArray) / 100;

    for (var i = 0; i < thisArray.length; i++)
        thisArray[i] = Math.round(thisArray[i] / ratio) * 0.01;

    return thisArray;
}


/*
 * find extreme values in an object array
 * @param objArray, an object array
 * @param filed, string, the field to be used
 * @param type, string, min or max
 * @return float or int, the extreme values found
 */
var objArrayExtremeVal = function(objArray, field, type) {
    var xVals = objArray.map(function(val) {
        return val[field];
    });

    if (type == "min") {
        return Math.min.apply(Math, xVals);
    } else {
        return Math.max.apply(Math, xVals);
    }
}


/*
 * split a string and return the required section of it
 * @param str, string, the string to be splited
 * @param splitBy, string, splited condition
 * @param id, integer, the id of the required section
 */
var getStrSplited = function(str, splitBy, id) {
    return str.split(splitBy)[id];
}
