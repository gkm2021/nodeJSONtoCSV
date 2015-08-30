#!/usr/bin/env node
var path = require('path'),
    pkg = require(path.join(__dirname, 'package.json')),
    program = require('commander'),
    fs = require('fs'),
    jsonSchemaGenerator = require('json-schema-generator');
var data = '';
var columnNames = [];
var csvRows = [];
var prefixes = [];
var readStream;
var schemaObj;
var tempObj = [];
var totalProps = 1;

program
    .version(pkg.version)
    .option('-i, --input <input>', 'json file to process')
    .option('-o, --output <output>', 'name of the csv file to output after conversion')
    .parse(process.argv);
readStream = fs.createReadStream(path.join(__dirname, program.input));

function isArray(b) {
    return Object.prototype.toString.call(b) === '[object Array]';
}

function isObject(b) {
    return Object.prototype.toString.call(b) === "[object Object]";
}

var getColumnNames = function(obj) {
    var clearPrefixes = true;
    var processedProps = 0;
    for (var property in obj)
    {
        if(obj[property].type == "array") {
            prefixes.push(property.toString());
            totalProps = obj[property]["items"]["required"].length;
            getColumnNames(obj[property]["items"]["properties"]);
        }
        else if (obj[property].type == "object") {
            prefixes.push(property.toString());
            tempObj.push(obj[property]["properties"]);
            getColumnNames(obj[property]["properties"]);
        }
        else {
            var columnName = '';
            for (var i = 0; i < prefixes.length ; i++)
            {
                columnName += prefixes[i] + ".";
            }
            columnName += property.toString();
            columnNames.push(columnName.trim());
            processedProps++;
            if (tempObj.length > 0)
            {
                var keys = Object.keys(tempObj[tempObj.length-1]);
                if (processedProps < totalProps)
                {
                    continue;
                }
                else
                {
                    if (keys[keys.length - 1].toString() != prefixes[prefixes.length-1].toString() )
                    {
                        prefixes.splice(prefixes.length-1, 1);
                        clearPrefixes = false;
                    }
                }
            }
        }
    }
    processedProps = 0;
    tempObj = [];
    totalProps = 1;
    if (clearPrefixes)
    {
        prefixes = [];
    }

};

var getValue = function(obj, words) {

    var value = '';
    for (var j = 0; j < words.length; j++)
    {
        if (isArray(obj))
        {
            var innerValuesCount = obj.length;
            for (var i = 0; i < innerValuesCount; i++ )
            {
                if (i === innerValuesCount-1)
                {
                    value += obj[i][words[j]];
                }
                else
                {
                    value += obj[i][words[j]] + ";";
                }
            }
            break;
        }
        else if (isObject(obj))
        {
            value = getValue(obj[words[j]], words.slice(j+1));
            break;
        }
        else
        {
            value = obj[words[j]];
            break;
        }
    }
    return value;
};

var addCsvRow = function(dataRow) {
    var csvRow = "";

    for(var i = 0; i < columnNames.length; i++)
    {
        var words = columnNames[i].split(".");
        var value;

        for (var j = 0; j < words.length; j++)
        {
            if (!(words[j] in dataRow) && (words[j] === words[words.length-1]))
            {
                value = "";
                break;
            }
            else
            {
                if (isArray(dataRow[words[j]]))
                {
                    value = getValue(dataRow[words[j]], words.slice(j+1));
                    break;
                }
                else if(isObject(dataRow[words[j]]))
                {
                    value = getValue(dataRow[words[j]], words.slice(j+1));
                    break;
                }
                else
                {
                    value = dataRow[words[j]];
                    break;
                }
            }
        }

        if (i === columnNames.length-1)
            csvRow += value;
        else
            csvRow += value + ",";
}
    csvRows.push(csvRow);
};

readStream
    .on('data', function (chunk) {
        data += chunk;
    })
    .on('end', function(err) {
        var jsonData = JSON.parse(data);
        schemaObj = jsonSchemaGenerator(jsonData);
        getColumnNames(schemaObj["items"]["properties"]);
        var csvHeader = '';
        for (var i = 0; i < columnNames.length; i++)
        {
            if (i === columnNames.length-1)
                csvHeader += columnNames[i];
            else
                csvHeader += columnNames[i] + ",";
        }
        csvRows.push(csvHeader);
        for (var j = 0; j < jsonData.length; j++)
        {
            addCsvRow(jsonData[j]);
        }
        console.log(csvRows);
    })
    .on('error', function(err) {
        console.log(err);
    });
