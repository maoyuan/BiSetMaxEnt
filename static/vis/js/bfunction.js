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


/*
 * intersect function of two lists
 * @param lst1, a list
 * @param lst2, another list
 * @return, elements of the intersection
 */
var lstIntersect = function(lst1, lst2) {
    var setA = new Set(lst1);
    var setB = new Set(lst2);
    var interSet = new Set();
    setA.forEach(function(item) {
        if (setB.has(item))
            interSet.add(item);
    });
    return Array.from(interSet);
}


/*
 * union function of two lists
 * @param lst1, a list
 * @param lst2, another list
 * @return, elements of the uion
 */
var lstUnion = function(lst1, lst2) {
    var setA = new Set(lst1);
    var setB = new Set(lst2);
    setA.forEach(function(item) {
        setB.add(item);
    });
    return Array.from(setB);
}


/*
 * calculate jaccard Index
 * @param intersection, int, # of interseced ents
 * @param union, int, # of unioned ents
 * @return, float, the value of jaccard coefficient
 */
var jacIndex = function(intersect, union) {
    return parseFloat(intersect / union);
}


var objArraySortMinToMax = function(objArray, field) {
    return objArray.sort(function(a, b) {
        return a[field] - b[field];
    });
}

var objArraySortMaxToMin = function(objArray, field) {
    return objArray.sort(function(a, b) {
        return b[field] - a[field];
    });
}


/*
 * separate a list of object based on a threshold
 * @param vList, array, a list of object
 * @param vThreshold, int/float, the threshold
 * @return a list of subsets in this list
 */
function findSubset(vList, field, vThreshold) {

    var ret = [];
    var length = vList.length;
    var index = 1;
    while (index != length) {
        var diff = vList[index][field] - vList[index - 1][field];
        if (diff >= vThreshold)
            index += 1;
        else {
            var tmp = [];
            tmp.push(vList[index - 1]);
            tmp.push(vList[index]);
            index += 1;
            //greedy, find the longest sequence
            while (index != length) {
                diff = vList[index][field] - vList[index - 1][field];
                index += 1;
                if (diff >= vThreshold)
                    break;
                else
                    tmp.push(vList[index - 1]);
            }
            ret.push(tmp);
        }
    }
    return ret;
}


/*
 * check the neighbouring elements in a list
 * @param lst, a object array
 * @param field, string, a field of the object
 * @param distMatrix, distance matrix between paired elements
 * @param threshold, int/float, the threshold
 * @return sets of neighboring elements meet the threshold
 */
function distCheck(lst, field, distMatrix, threshold) {
    var ret = [],
        length = lst.length,
        index = 1;

    while (index != length) {
        var val = distMatrix[lst[index - 1][field]][lst[index][field]];
        if (val < threshold)
            index += 1;
        else {
            var tmp = [];
            tmp.push(lst[index - 1]);
            tmp.push(lst[index]);
            index += 1;
            //greedy, find the longest sequence
            while (index != length) {
                val = distMatrix[lst[index - 1][field]][lst[index][field]];
                index += 1;
                if (val < threshold)
                    break;
                else
                    tmp.push(lst[index - 1]);
            }
            ret.push(tmp);
        }
    }
    return ret;
}


/*
 * get basic stats of a list, (key, values)
 * @param lst, array,
 * @param lstObj, object to depict this list
 */
function lstEntCount(lst, lstObj) {
    for (var r = 0; r < lst.length; r++) {
        if (lstObj[lst[r]] === undefined) {
            lstObj[lst[r]] = 1;
        } else {
            lstObj[lst[r]] += 1;
        }
    }
}
