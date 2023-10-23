let materialMap = [];
let distanceMap = [];

let cameraEditor = {
    "selectedCameraIndex": 0,
    "isEditing": false,
    "cameras": []
};

var regionEditor = null;

var regionColors = ["Salmon", "Crimson", "Red", "DarkRed", "Pink", "DeepPink", "Coral", "Tomato", "Orange", "Gold", "Yellow", "Khaki", "Thistle", "Plum", "Violet", "Magenta", "Purple", "Indigo", "Lime", "SeaGreen", "Green", "Olive", "Teal", "Cyan", "SkyBlue", "Blue", "Navy", "Tan", "Brown", "Maroon"];
var tempRanges = { "highCelsius": 250.0, "lowCelsius": 0 };
let regionTypes = ['point', 'polygon'];
let regionEditorTools = ['look', 'select', 'move', 'pointadd', 'pointmove', 'pointdelete', 'sample', 'fill', 'change', 'paintround', 'paintsquare', 'eraseround', 'erasesquare'];
let regionEditorLayers = ['Region', 'Matl', 'Dist'];
let activeTool = 'look';
let activeLayer = 'Region';
const maxHistoryStackEntries = 50;
let historyStack = [];
let historyIndex = -1;
const maxMetaHistoryStackEntries = 10;//material and distance are huge!
let metaHistoryStack = [];//material and distance.
let metaHistoryIndex = -1;

let tempsCelsius = [];

let selectedPointIndex = -1;
let editAlarmThresh = { "loPriority": 1, "hiPriority": 1, "loTempC": null, "hiTempC": null };
let editAlarmIsImage = true;
let paintBrushSize = 10;
let eraseBrushSize = 10;
let selectedDistance = 1.0;
let fillRange = 1.0;
const unknownCameraName = '-Unknown-';


/*AI Prompt
Give me a list of 25 common materials found in an electrical cabinet and their emissivity values.
The names should be no longer than 20 characters. Abbreviate the names if necessary.
The names may only contain letters, numbers, spaces and commas. 
Order them by highest emissivity to lowest. 
Do not give emissivity as a range, it should be a single value. 
The list should contain Black Body with an emissivity of 1.00.
The list should contain Black Electrical Tape with an emissivity of 0.95.
The list should contain a Polished Silver with an emissivity of 0.02.
Make certain that these items may be found in an electrical cabinet.
Emissivity values should be rounded to 2 decimal places.
Give me the results as a javascript array in the following format:var knownMaterials =  [{"name":"material name", "emissivity":.95}]
*/
const knownMaterials = [
    { "name": "Black Body", "emissivity": 1.00 },
    { "name": "Black Elec. Tape", "emissivity": 0.95 },
    { "name": "Polypropylene", "emissivity": 0.97 },
    { "name": "Polystyrene", "emissivity": 0.95 },
    { "name": "Rubber, hard glossy", "emissivity": 0.94 },
    { "name": "Iron, rusted", "emissivity": 0.94 },
    { "name": "PTFE", "emissivity": 0.92 },
    { "name": "Polyethylene, black", "emissivity": 0.92 },
    { "name": "PVC", "emissivity": 0.92 },
    { "name": "Fibreglass", "emissivity": 0.85 },
    { "name": "Carbon, not oxidized", "emissivity": 0.88 },
    { "name": "Carbon filament", "emissivity": 0.86 },
    { "name": "Copper, oxidized", "emissivity": 0.76 },
    { "name": "Brass, oxidized", "emissivity": 0.79 },
    { "name": "Steel, stainless", "emissivity": 0.70 },
    { "name": "Steel, galvanized", "emissivity": 0.56 },
    { "name": "Aluminium, anodised", "emissivity": 0.82 },
    { "name": "Aluminium, oxidized", "emissivity": 0.26 },
    { "name": "Aluminium, sheet", "emissivity": 0.10 },
    { "name": "Aluminium, polished", "emissivity": 0.06 },
    { "name": "Gold, not polished", "emissivity": 0.49 },
    { "name": "Gold, polished", "emissivity": 0.03 },
    { "name": "Copper, polished", "emissivity": 0.04 },
    { "name": "Nickel, polished", "emissivity": 0.09 },
    { "name": "Silver, polished", "emissivity": 0.02 }
];
let selectedMaterial = knownMaterials[15];

let storedImageData = null;
let storedImageRotation = null;
let storedImageWidth = null;
let storedImageHeight = null;
let storedImageMirrorHorizontally = null;


var activeFunc = null;
var waiterTime = 100;

let imageFilters = ['none', 'contrast', 'invert', 'sepia'];

function changeLayerNext(doNext) {
    
    let index = regionEditorLayers.indexOf(activeLayer);
    if (doNext) {
        index++;
    }
    else {
        index--;
    }
    if (index < 0) {
        index = regionEditorLayers.length - 1;
    }
    else if (index >= regionEditorLayers.length) {
        index = 0;
    }
    setActiveLayer(regionEditorLayers[index]);
    //changing layers clears the history stack;
    hideTips();
    goRegionEditor();
    


}

function setActiveLayer(layer) {
    if (regionEditorLayers.indexOf(layer) == -1) {
        console.error('invalid layer: ' + layer);
        return;
    }
    this.closeAlarmTemp();
    activeLayer = layer;
    activeTool = 'look';
    recalcEditor();
}

function changeBrushSizeBy(isPaint, amount) {
    if (isPaint) {

        paintBrushSize += amount;
        if (paintBrushSize < 1) {
            paintBrushSize = 1;
        }
        else if (paintBrushSize > 100) {
            paintBrushSize = 100;
        }
        paintBrushSize = parseInt(paintBrushSize.toFixed(0));

        document.getElementById("valPaintBrushSize").innerHTML = paintBrushSize.toFixed(0);
    }
    else {
        eraseBrushSize += amount;
        if (eraseBrushSize < 1) {
            eraseBrushSize = 1;
        }
        else if (eraseBrushSize > 100) {
            eraseBrushSize = 100;
        }
        eraseBrushSize = parseInt(eraseBrushSize.toFixed(0));
        document.getElementById("valEraseBrushSize").innerHTML = eraseBrushSize.toFixed(0);
    }

    hideTips();
}

function changeFillRangeBy(amount) {
    fillRange += amount;
    if (fillRange < 0.1) {
        fillRange = 0.1;
    }
    else if (fillRange > 500) {
        fillRange = 500;
    }
    fillRange = parseFloat(fillRange.toFixed(2));
    document.getElementById("valFillRange").innerHTML = fillRange.toFixed(2);
    hideTips();
}

function selectRegionEditorTool(toolName) {
    hideTips();
    if (toolName == 'erase') {
        if (activeTool.indexOf('erase') > -1) {//already active
            toolName = document.getElementById('shapeEraseRound').style.display == 'none' ? 'eraseround' : 'erasesquare';
        }
        else {
            toolName = document.getElementById('shapeEraseRound').style.display == 'none' ? 'erasesquare' : 'eraseround';

        }
        document.getElementById('shapeEraseRound').style.display = toolName == 'eraseround' ? '' : 'none';
        document.getElementById('shapeEraseSquare').style.display = toolName == 'erasesquare' ? '' : 'none';
    }
    else if (toolName == 'paint') {
        if (activeTool.indexOf('paint') > -1) {//already painting so flip the tool
            toolName = document.getElementById('shapePaintRound').style.display == 'none' ? 'paintround' : 'paintsquare';
        }
        else {//keep the current tool
            toolName = document.getElementById('shapePaintRound').style.display == 'none' ? 'paintsquare' : 'paintround';

        }
        document.getElementById('shapePaintRound').style.display = toolName == 'paintround' ? '' : 'none';
        document.getElementById('shapePaintSquare').style.display = toolName == 'paintsquare' ? '' : 'none';
    }

    if (regionEditorTools.indexOf(toolName) == -1) {
        console.error('invalid tool name: ' + toolName);
        recalcEditor();
        return;
    }
    this.closeAlarmTemp();//close alarm temp if open
    let oldActiveTool = activeTool;
    //put some logic here
    activeTool = toolName;
    recalcEditor();
}

function redoMetaHistory() {

    if (metaHistoryIndex < 0 || metaHistoryStack.length <= 1) {
        //console.log('nothing to redo');
        return;
    }
    if (metaHistoryIndex < metaHistoryStack.length - 1) {
        this.closeAlarmTemp();//close alarm temp if open
        metaHistoryIndex++;
        let historyEntry = metaHistoryStack[metaHistoryIndex];
        if (historyEntry.materialMap != null) {
            materialMap = [...historyEntry.materialMap];
        }
        if (historyEntry.distanceMap != null) {
            distanceMap = [...historyEntry.distanceMap];
        }
        recalcEditor();
    }
    else {
        //console.log('nothing to redo');
        return;
    }
}



function undoMetaHistory() {
    if (metaHistoryStack.length <= 1) {//first entry is initial state
        //console.log('nothing to undo');
        return;
    }

    if (metaHistoryIndex < 0 || metaHistoryIndex >= metaHistoryStack.length) {
        //console.log('adjusting out of bounds history index to last entry');
        metaHistoryIndex = metaHistoryStack.length - 1;
    }

    if (metaHistoryIndex >= 1) {
        this.closeAlarmTemp();//close alarm temp if open
        metaHistoryIndex--;
        let historyEntry = metaHistoryStack[metaHistoryIndex];
        if (historyEntry.materialMap != null) {
            materialMap = [...historyEntry.materialMap];
        }
        if (historyEntry.distanceMap != null) {
            distanceMap = [...historyEntry.distanceMap];
        }
        recalcEditor();
    }
    else {
        console.log('nothing to undo');

    }

}


function addMetaHistory(historyType, force) {
    if (!cameraEditor.isEditing) {
        setButtons();
        return;
    }
    this.closeAlarmTemp();//close alarm temp if open
    let time = new Date().getTime();
    let historyEntry = { "historyType": historyType, "time":time, "materialMap": null, "distanceMap": null };
    if(activeLayer == 'Matl'){
        historyEntry.materialMap = [...materialMap];
    }
    else if(activeLayer == 'Dist'){
        historyEntry.distanceMap = [...distanceMap];
    }
    else{
        console.error('invalid layer: ' + activeLayer);
        return;
    }

    let lastHistoryEntry = null;
    if (metaHistoryStack.length > 0) {
        console.log('evaluating new history entry of ' + historyEntry.historyType);
        if (metaHistoryIndex < 0 || metaHistoryIndex > metaHistoryStack.length) {
            //console.log('adjusting out of bounds history index to last entry');
            metaHistoryIndex = metaHistoryStack.length - 1;
        }
        lastHistoryEntry = metaHistoryStack[metaHistoryIndex];
        //even for a force this doesn't make sense.
        if (historyEntry.materialMap == lastHistoryEntry.materialMap && historyEntry.distanceMap == lastHistoryEntry.distanceMap) {
            setButtons();
            return;
        }
        

        if (force) {
            console.log('force add history entry of ' + historyEntry.historyType)
            metaHistoryStack.splice(metaHistoryIndex + 1, 0, historyEntry);
            metaHistoryStack.length = metaHistoryIndex + 2;//new action clears redo stack
        }
        else {
            if (historyEntry.historyType == lastHistoryEntry.historyType && (historyEntry.time - lastHistoryEntry.time) < 250) {
                //just replace if there hasn't been a break in editing.
                console.log('replace existing history entry of' + historyEntry.historyType);
                metaHistoryStack[metaHistoryIndex] = historyEntry;
                setButtons();
                return;
            }
            else {
                console.log('add history entry of ' + historyEntry.historyType);
                metaHistoryStack.splice(metaHistoryIndex + 1, 0, historyEntry);
                metaHistoryStack.length = metaHistoryIndex + 2;//new action clears redo stack
            }

        }
    }
    else {
        console.log('add initial history entry of ' + historyEntry.historyType)
        metaHistoryStack.push(historyEntry);
        metaHistoryIndex = 0;
        setButtons();
        return;
    }
    metaHistoryIndex++;
    if (metaHistoryStack.length > maxMetaHistoryStackEntries) {
        if (metaHistoryIndex > 1) {
            metaHistoryStack.shift();
            metaHistoryIndex--;
        }
        else {
            metaHistoryStack.pop();
        }
    }
    setButtons();




}




function redoRegionEditor() {
    if (historyIndex < 0 || historyStack.length <= 1) {
        //console.log('nothing to redo');
        return;
    }
    if (historyIndex < historyStack.length - 1) {
        this.closeAlarmTemp();//close alarm temp if open
        historyIndex++;
        let historyEntry = historyStack[historyIndex];
        //console.log('restoring ' + historyEntry.historyType + ' with index ' + historyEntry.selectedIndex);
        let storedRegionEditor = JSON.parse(historyEntry.regionEditor);
        regionEditor = storedRegionEditor;
        recalcEditor();
    }
    else {
        //console.log('nothing to redo');
        return;
    }

}

function undoRegionEditor() {
    if (historyStack.length <= 1) {//first entry is initial state
        //console.log('nothing to undo');
        return;
    }

    if (historyIndex < 0 || historyIndex >= historyStack.length) {
        //console.log('adjusting out of bounds history index to last entry');
        historyIndex = historyStack.length - 1;
    }

    if (historyIndex >= 1) {
        this.closeAlarmTemp();//close alarm temp if open
        let currentHistoryEntry = historyStack[historyIndex];
        //console.log('undoing ' + currentHistoryEntry.historyType + ' with index ' + currentHistoryEntry.selectedIndex);
        historyIndex--;
        let historyEntry = historyStack[historyIndex];
        //console.log('restoring ' + historyEntry.historyType + ' with index ' + historyEntry.selectedIndex);
        let storedRegionEditor = JSON.parse(historyEntry.regionEditor);
        regionEditor = storedRegionEditor;
        recalcEditor();
    }
    else {
        console.log('nothing to undo');

    }


}


function addRegionHistory(historyType, selectedIndex, force) {
    if (!cameraEditor.isEditing) {
        setButtons();
        return;
    }
    this.closeAlarmTemp();//close alarm temp if open
    let historyEntry = { "historyType": historyType, "selectedIndex": selectedIndex, "regionEditor": JSON.stringify(regionEditor) };
    let lastHistoryEntry = null;
    if (historyStack.length > 0) {
        if (historyIndex < 0 || historyIndex > historyStack.length) {
            //console.log('adjusting out of bounds history index to last entry');
            historyIndex = historyStack.length - 1;
        }
        lastHistoryEntry = historyStack[historyIndex];
        //even for a force this doesn't make sense.
        if (historyEntry.regionEditor == lastHistoryEntry.regionEditor) {
            setButtons();
            return;
        }
        if (force) {
            //console.log('force add history entry of ' + historyEntry.historyType)
            historyStack.splice(historyIndex + 1, 0, historyEntry);
            historyStack.length = historyIndex + 2;//new action clears redo stack
        }
        else {
            if (historyEntry.historyType == lastHistoryEntry.historyType && historyEntry.selectedIndex == lastHistoryEntry.selectedIndex) {
                //console.log('replace existing history entry');
                historyStack[historyIndex] = historyEntry;
                setButtons();
                return;
            }
            else {
                //console.log('add history entry of ' + historyEntry.historyType + ' with index ' + historyEntry.selectedIndex)
                historyStack.splice(historyIndex + 1, 0, historyEntry);
                historyStack.length = historyIndex + 2;//new action clears redo stack
            }

        }
    }
    else {
        console.log('add initial history entry of ' + historyEntry.historyType)
        historyStack.push(historyEntry);
        historyIndex = 0;
        setButtons();
        return;
    }
    historyIndex++;
    if (historyStack.length > maxHistoryStackEntries) {
        if (historyIndex > 1) {
            historyStack.shift();
            historyIndex--;
        }
        else {
            historyStack.pop();
        }
    }
    setButtons();




}

function setButtons() {



    document.getElementById("btnUndoRegionEdit").disabled = historyStack.length <= 1 || historyIndex <= 0;
    document.getElementById("btnUndoRegionEdit").style.display = cameraEditor.isEditing ? '' : 'none';
    document.getElementById("btnRedoRegionEdit").disabled = historyStack.length <= 1 || historyIndex >= historyStack.length - 1;
    document.getElementById("btnRedoRegionEdit").style.display = cameraEditor.isEditing ? '' : 'none';

    document.getElementById("btnUndoMaterialEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex <= 0;
    document.getElementById("btnUndoMaterialEdit").style.display = cameraEditor.isEditing ? '' : 'none';
    document.getElementById("btnRedoMaterialEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex >= metaHistoryStack.length - 1;
    document.getElementById("btnRedoMaterialEdit").style.display = cameraEditor.isEditing ? '' : 'none';

    document.getElementById("btnUndoDistanceEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex <= 0;
    document.getElementById("btnUndoDistanceEdit").style.display = cameraEditor.isEditing ? '' : 'none';
    document.getElementById("btnRedoDistanceEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex >= metaHistoryStack.length - 1;
    document.getElementById("btnRedoDistanceEdit").style.display = cameraEditor.isEditing ? '' : 'none';



    let hasActiveItem = false;
    let canSize = false;
    let canRotate = false;
    let polygonSelected = false;
    let region = null;
    if (regionEditor.selectedRegionIndex >= 0 && regionEditor.selectedRegionIndex < regionEditor.regions.length) {
        region = regionEditor.regions[regionEditor.selectedRegionIndex];
        hasActiveItem = true;
        canSize = region.type != 'point' && region.type != 'polygon';
        polygonSelected = region.type == 'polygon';
    }
    let activeToolColor = 'yellow';
    let inactiveToolColor = 'white';


    document.getElementById("rowRegionTools").style.display = (activeLayer != 'Region' ? 'none' : '');
    document.getElementById("rowMaterialTools").style.display = (activeLayer != 'Matl' ? 'none' : '');
    document.getElementById("rowDistanceTools").style.display = (activeLayer != 'Dist' ? 'none' : '');

    document.getElementById("btnChangeMaterial").disabled = !cameraEditor.isEditing;
    if (cameraEditor.isEditing) {
        if (selectedMaterial != null && selectedMaterial.name != null && selectedMaterial.emissivity != null) {
            document.getElementById('valMaterialName').innerHTML = selectedMaterial.name;
            document.getElementById('valMaterialEmissivity').innerHTML = selectedMaterial.emissivity.toFixed(2);
        }
        else {
            document.getElementById('valMaterialName').innerHTML = '--';
            document.getElementById('valMaterialEmissivity').innerHTML = '--';
        }


    }
    else {
        document.getElementById('valMaterialName').innerHTML = 'Emissivity';
        document.getElementById('valMaterialEmissivity').innerHTML = '';
        document.getElementById('valDistanceMeters').innerHTML = '';
        document.getElementById('valDistanceInches').innerHTML = '';
    }


    document.getElementById("btnClearMaterial").style.visibility = cameraEditor.isEditing ? 'visible' : 'hidden';


    document.getElementById("btnDistance").disabled = !cameraEditor.isEditing;
    document.getElementById("btnChangeDistanceLess").style.display = !cameraEditor.isEditing ? 'none' : '';
    document.getElementById("btnChangeDistanceMore").style.display = !cameraEditor.isEditing ? 'none' : '';
    document.getElementById("spacerDistanceColorRampMin").style.display = !cameraEditor.isEditing ? 'none' : '';
    document.getElementById("btnClearDistance").style.display = !cameraEditor.isEditing ? 'none' : '';




    document.getElementById("btnPolygonAdd").style.display = ((activeLayer != 'Region' || !cameraEditor.isEditing) ? 'none' : '');
    document.getElementById("btnPointAdd").style.display = ((activeLayer != 'Region' || !cameraEditor.isEditing) ? 'none' : '');


    document.getElementById("btnRegionToolLook").disabled = false;
    document.getElementById("btnRegionToolLook").style.color = (activeTool == 'look' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnRegionToolSelect").style.display = (activeLayer != 'Region' ? 'none' : '');
    document.getElementById("btnRegionToolSelect").disabled = regionEditor.regions.length <= 1;
    document.getElementById("btnRegionToolSelect").style.color = (activeTool == 'select' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnRegionToolMove").style.display = ((activeLayer != 'Region' || !cameraEditor.isEditing) ? 'none' : '');
    document.getElementById("btnRegionToolMove").disabled = !hasActiveItem;
    document.getElementById("btnRegionToolMove").style.color = (activeTool == 'move' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnRegionToolPointAdd").style.display = (activeLayer == 'Region' && polygonSelected && cameraEditor.isEditing) ? '' : 'none';
    document.getElementById("btnRegionToolPointAdd").disabled = !polygonSelected;
    document.getElementById("btnRegionToolPointAdd").style.color = (activeTool == 'pointadd' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnRegionToolPointMove").style.display = (activeLayer == 'Region' && polygonSelected && cameraEditor.isEditing) ? '' : 'none';
    document.getElementById("btnRegionToolPointMove").disabled = !polygonSelected;
    document.getElementById("btnRegionToolPointMove").style.color = (activeTool == 'pointmove' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnRegionToolPointDelete").style.display = (activeLayer == 'Region' && polygonSelected && cameraEditor.isEditing) ? '' : 'none';
    document.getElementById("btnRegionToolPointDelete").disabled = !polygonSelected || (region != null && region.points.length <= 3);
    document.getElementById("btnRegionToolPointDelete").style.color = (activeTool == 'pointdelete' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnSetDefaultMaterial").disabled = !cameraEditor.isEditing || selectedMaterial == null;
    document.getElementById("btnSetDefaultMaterial").style.display = cameraEditor.isEditing ? '' : 'none';

    document.getElementById("btnSampleMaterial").style.color = (activeTool == 'sample' ? activeToolColor : inactiveToolColor);
    document.getElementById("btnSampleMaterial").disabled = !cameraEditor.isEditing;
    document.getElementById("btnSampleMaterial").style.display = cameraEditor.isEditing ? '' : 'none';

    document.getElementById("btnSetDefaultDistance").disabled = !cameraEditor.isEditing;
    document.getElementById("btnSetDefaultDistance").style.display = cameraEditor.isEditing ? '' : 'none';

    document.getElementById("btnSampleDistance").style.color = (activeTool == 'sample' ? activeToolColor : inactiveToolColor);
    document.getElementById("btnSampleDistance").disabled = !cameraEditor.isEditing;
    document.getElementById("btnSampleDistance").style.display = cameraEditor.isEditing ? '' : 'none';

    let fillSelected = activeLayer != 'Region' && cameraEditor.isEditing && (activeTool.indexOf('fill') > -1);
    document.getElementById("btnRegionToolFill").style.display = ((activeLayer == 'Region' || !cameraEditor.isEditing) ? 'none' : '');
    document.getElementById("btnRegionToolFill").disabled = activeLayer == 'Region';
    document.getElementById("btnRegionToolFill").style.color = (fillSelected ? activeToolColor : inactiveToolColor);


    document.getElementById("btnChangeFillRangeInfo").style.display = (!fillSelected ? 'none' : '');
    document.getElementById("btnChangeFillRangeLess").style.display = (!fillSelected ? 'none' : '');
    document.getElementById("btnChangeFillRangeLess").disabled = !fillSelected;
    document.getElementById("btnChangeFillRangeMore").style.display = (!fillSelected ? 'none' : '');
    document.getElementById("btnChangeFillRangeMore").disabled = !fillSelected;


    document.getElementById("btnRegionToolChange").style.display = ((activeLayer == 'Region' || !cameraEditor.isEditing) ? 'none' : '');
    document.getElementById("btnRegionToolChange").disabled = activeLayer == 'Region';
    document.getElementById("btnRegionToolChange").style.color = (activeTool == 'change' ? activeToolColor : inactiveToolColor);

    document.getElementById("btnRegionToolPaint").style.display = ((activeLayer == 'Region' || !cameraEditor.isEditing) ? 'none' : '');
    document.getElementById("btnRegionToolPaint").disabled = activeLayer == 'Region';
    document.getElementById("btnRegionToolPaint").style.color = (activeTool.indexOf('paint') > -1 ? activeToolColor : inactiveToolColor);

    let paintSelected = activeLayer != 'Region' && (activeTool.indexOf('paint') > -1);
    document.getElementById("btnChangePaintSizeInfo").style.display = (!paintSelected ? 'none' : '');
    document.getElementById("btnChangePaintSizeLess").style.display = (!paintSelected ? 'none' : '');
    document.getElementById("btnChangePaintSizeLess").disabled = !paintSelected;
    document.getElementById("btnChangePaintSizeMore").style.display = (!paintSelected ? 'none' : '');
    document.getElementById("btnChangePaintSizeMore").disabled = !paintSelected;


    document.getElementById("btnRegionToolErase").style.display = ((activeLayer == 'Region' || !cameraEditor.isEditing) ? 'none' : '');
    document.getElementById("btnRegionToolErase").disabled = activeLayer == 'Region';
    document.getElementById("btnRegionToolErase").style.color = (activeTool.indexOf('erase') > -1 ? activeToolColor : inactiveToolColor);


    let eraseSelected = activeLayer != 'Region' && (activeTool.indexOf('erase') > -1);
    document.getElementById("btnChangeEraseSizeInfo").style.display = (!eraseSelected ? 'none' : '');
    document.getElementById("btnChangeEraseSizeLess").style.display = (!eraseSelected ? 'none' : '');
    document.getElementById("btnChangeEraseSizeLess").disabled = !eraseSelected;
    document.getElementById("btnChangeEraseSizeMore").style.display = (!eraseSelected ? 'none' : '');
    document.getElementById("btnChangeEraseSizeMore").disabled = !eraseSelected;



    document.getElementById("btnDeleteRegion").disabled = !hasActiveItem;
    document.getElementById("btnDeleteRegion").style.visibility = cameraEditor.isEditing ? 'visible' : 'hidden';
    document.getElementById("btnChangeRegion").disabled = !hasActiveItem;



    document.getElementById("btnChangeRegionName").disabled = !hasActiveItem || !cameraEditor.isEditing;
    document.getElementById("btnChangeColor").disabled = !hasActiveItem || !cameraEditor.isEditing;
    document.getElementById("btnChangeImageMaxTemp").disabled = !cameraEditor.isEditing;
    document.getElementById("btnChangeImageMinTemp").disabled = !cameraEditor.isEditing;
    document.getElementById("btnChangeImageMaxPriorityLevel").disabled = !cameraEditor.isEditing;
    document.getElementById("btnChangeImageMinPriorityLevel").disabled = !cameraEditor.isEditing;

    document.getElementById("btnChangeRegionMaxTemp").disabled = !hasActiveItem || !cameraEditor.isEditing;
    document.getElementById("btnChangeRegionMinTemp").disabled = !hasActiveItem || !cameraEditor.isEditing;

    document.getElementById("btnChangeRegionMaxPriorityLevel").disabled = !hasActiveItem || !cameraEditor.isEditing;
    document.getElementById("btnChangeRegionMinPriorityLevel").disabled = !hasActiveItem || !cameraEditor.isEditing;






}

function randomNumberGenerator(min = 0, max = 1, fractionDigits = 0, inclusive = true) {
    const precision = Math.pow(10, Math.max(fractionDigits, 0));
    const scaledMax = max * precision;
    const scaledMin = min * precision;
    const offset = inclusive ? 1 : 0;
    const num = Math.floor(Math.random() * (scaledMax - scaledMin + offset)) + scaledMin;

    return num / precision;
};


function changeDistanceBy(amount) {
    if (selectedDistance == null) {
        changeDistance(1.00);
    }
    else {
        changeDistance(selectedDistance + amount);
    }
}

function changeDistance(distance) {

    if (distance > 999) {
        distance = 999;
    }
    else if (distance <= 0) {
        distance = 0.01;
    }
    selectedDistance = distance;
    document.getElementById('valDistanceMeters').innerHTML = selectedDistance.toFixed(2) + "m";
    document.getElementById('valDistanceInches').innerHTML = metersToInches(selectedDistance).toFixed(1) + "in";
}

function metersToInches(meters) {
    let fixed = parseFloat(meters.toFixed(2));//convert on what they see on the screen
    return meters * 39.3701;
}

function clearDistanceMap() {
    hideTips();
    distanceMap = new Array(49152);
    recalcEditor();
    addMetaHistory('clear distance', false);//prevent double click

}

function hideEverything() {
    hideTips();
    document.getElementById('mainEditor').style.display = 'none';
    document.getElementById('dialogDistance').style.display = 'none';
    document.getElementById('dialogMaterials').style.display = 'none';
}


function cancelMaterial() {
    hideEverything();
    document.getElementById('mainEditor').style.display = 'block';
}

function pickMaterial() {
    hideEverything();
    let materialList = document.getElementById('materialList');
    if (knownMaterials != null && knownMaterials.length > 0) {
        let sb = '';
        for (let i = 0; i < knownMaterials.length; i++) {
            let material = knownMaterials[i];
            sb += '<button class="resizebutton2" onclick="changeMaterial(\'' + material.name + '\',' + material.emissivity + ')">';
            sb += '<div style="line-height: 17px;">';
            sb += '<div class="regioneditortext2">Material</div>';
            sb += '<div class="regionditortextsub4">' + material.name + '</div>';
            sb += '<div class="regionditortextsub3">' + material.emissivity.toFixed(2) + '</div>';
            sb += '</div>';
            sb += '</button>';
        }
        materialList.innerHTML = sb;
    }
    document.getElementById('dialogMaterials').style.display = 'block';
}

function changeMaterial(materialName, emissivity) {
    if (materialName == null || emissivity == null) {
        console.error('invalid material');
        return;
    }

    //validate material name
    materialName = materialName.trim();
    if (materialName.length > 100) {
        console.error('invalid material name length');
        return;
    }
    // regular expression that only allows mixed case letters, whole numbers, spaces and commas.
    let regex = /^[a-zA-Z0-9 ,]*$/;
    if (!regex.test(materialName)) {
        console.error('invalid material name characters');
        return;
    }

    //round emissivity to 2 decimal places
    emissivity = parseFloat(emissivity.toFixed(2));
    if (emissivity < 0.00 || emissivity > 1.00) {
        console.error('invalid emissivity');
        return;
    }
    console.log('old material: ' + selectedMaterial.name + ' with emissivity ' + selectedMaterial.emissivity.toFixed(2) + '');
    selectedMaterial = { "name": materialName, "emissivity": emissivity };
    console.log('changed material to: ' + selectedMaterial.name + ' with emissivity ' + selectedMaterial.emissivity.toFixed(2) + '');
    document.getElementById('valMaterialName').innerHTML = selectedMaterial.name;
    document.getElementById('valMaterialEmissivity').innerHTML = selectedMaterial.emissivity.toFixed(2);
    cancelMaterial();
}

function clearMaterialMap() {
    hideTips();
    materialMap = new Array(49152);
    recalcEditor();
    addMetaHistory('clear material', false);//prevent double click
}



function clearFunc() {
    activeFunc = null;
    waiterTime = 1000;
}



function repeatFunc(myfunc) {
    if (activeFunc != myfunc) {
        waiterTime = 1000;
    }
    activeFunc = myfunc;
    activeFunc();
    waiterTime -= 150;
    if (waiterTime <= 10) {
        waiterTime = 10;
    }
    setTimeout(function () {
        if (activeFunc != null) {
            repeatFunc(activeFunc);
        }
    }, waiterTime);
}

function showTips() {
    const tipmagnifier = document.getElementById('tipmagnifier');
    const tiptarget = document.getElementById('tiptarget');
    const tooltip = document.getElementById('tooltip');
    tipmagnifier.style.display = 'block';
    tiptarget.style.display = 'block';
    tooltip.style.display = 'block';
}

function hideTips() {
    //console.log('hiding tips');
    const tipmagnifier = document.getElementById('tipmagnifier');
    const tiptarget = document.getElementById('tiptarget');
    const tooltip = document.getElementById('tooltip');
    tipmagnifier.style.display = 'none';
    tiptarget.style.display = 'none';
    tooltip.style.display = 'none';
}

function recalcEditor() {

    clearStoredImageData();
    if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
        regionEditor.imageWidth = regionEditor.imageNativeWidth * regionEditor.imageScale;
        regionEditor.imageHeight = regionEditor.imageNativeHeight * regionEditor.imageScale;
    }
    else {
        regionEditor.imageWidth = regionEditor.imageNativeHeight * regionEditor.imageScale;
        regionEditor.imageHeight = regionEditor.imageNativeWidth * regionEditor.imageScale;
    }






    document.getElementById("valActiveLayer").innerHTML = activeLayer;
    document.getElementById("valPaintBrushSize").innerHTML = paintBrushSize.toFixed(0);
    document.getElementById("valEraseBrushSize").innerHTML = eraseBrushSize.toFixed(0);
    document.getElementById("valFillRange").innerHTML = fillRange.toFixed(2);

    if (selectedDistance != null) {
        document.getElementById('valDistanceMeters').innerHTML = selectedDistance.toFixed(2) + "m";
        document.getElementById('valDistanceInches').innerHTML = metersToInches(selectedDistance).toFixed(1) + "in";
    }
    else {
        document.getElementById('valDistanceMeters').innerHTML = "--m";
        document.getElementById('valDistanceInches').innerHTML = "--in";
    }

    if (selectedMaterial != null) {
        document.getElementById('valMaterialName').innerHTML = selectedMaterial.name;
        document.getElementById('valMaterialEmissivity').innerHTML = selectedMaterial.emissivity.toFixed(2);
    }
    else {
        document.getElementById('valMaterialName').innerHTML = "--";
        document.getElementById('valMaterialEmissivity').innerHTML = "--";
    }


    var valueZoom = document.getElementById("valueZoom");
    valueZoom.innerHTML = Math.round(regionEditor.imageScale * 100) + "%";

    document.getElementById("valueFilter").innerHTML = regionEditor.imageFilter;
    document.getElementById("valueImageMirrorHorizontally").innerHTML = regionEditor.imageMirrorHorizontally ? 'On' : 'Off';

    document.getElementById("valImageMaxTempC").innerHTML = getDisplayTempFromCelsius(regionEditor.imageAlarmThresh.hiTempC, false) + '&deg;C';
    document.getElementById("valImageMaxTempF").innerHTML = getDisplayTempFromCelsius(regionEditor.imageAlarmThresh.hiTempC, true) + '&deg;F';
    document.getElementById("valImageMaxPriorityLevel").innerHTML = regionEditor.imageAlarmThresh.hiTempC == null ? '--' : regionEditor.imageAlarmThresh.hiPriority;
    document.getElementById("valImageMinTempC").innerHTML = getDisplayTempFromCelsius(regionEditor.imageAlarmThresh.loTempC, false) + '&deg;C';
    document.getElementById("valImageMinTempF").innerHTML = getDisplayTempFromCelsius(regionEditor.imageAlarmThresh.loTempC, true) + '&deg;F';
    document.getElementById("valImageMinPriorityLevel").innerHTML = regionEditor.imageAlarmThresh.loTempC == null ? '--' : regionEditor.imageAlarmThresh.loPriority;


    var valImageRotation = document.getElementById("valImageRotation");
    valImageRotation.innerHTML = regionEditor.imageRotation + "&deg;";
    drawRegions();
    setButtons();

}

function rotateFillPoint(imageRotation, imageNativeWidth, imageNativeHeight, imageMirrorHorizontally, x, y) {
    //test by putting a 1 pixel block in a corner
    if (imageRotation == 0) {
        if (imageMirrorHorizontally) {
            x = imageNativeWidth - x - 1;
        }
    }
    else if (imageRotation == 90) {
        let pts = rotate90(imageNativeWidth, imageNativeHeight, x, y);
        x = pts[0] - 1;
        y = pts[1];
        if (imageMirrorHorizontally) {
            y = imageNativeWidth - y - 1;
        }
    }
    else if (imageRotation == 180) {
        let pts = rotate90(imageNativeWidth, imageNativeHeight, x, y);
        x = pts[0] - 1;
        y = pts[1];
        pts = rotate90(imageNativeHeight, imageNativeWidth, x, y);
        x = pts[0] - 1;
        y = pts[1];
        if (imageMirrorHorizontally) {
            x = imageNativeWidth - x - 1;
        }
    }
    else if (imageRotation == 270) {
        let pts = rotate90(imageNativeWidth, imageNativeHeight, x, y);
        x = pts[0] - 1;
        y = pts[1];
        pts = rotate90(imageNativeHeight, imageNativeWidth, x, y);
        x = pts[0] - 1;
        y = pts[1];
        pts = rotate90(imageNativeWidth, imageNativeHeight, x, y);
        x = pts[0] - 1;
        y = pts[1];
        if (imageMirrorHorizontally) {
            y = imageNativeWidth - y - 1;
        }
    }

    return [x, y];
}


function rotate90(w, h, x, y) {
    // Create a new object to store the new coordinate
    var newPoint = {};

    // To rotate the point 90 degrees clockwise, swap the x and y values and subtract the x value from the height
    newPoint.x = h - y;
    newPoint.y = x;

    // To rotate the point 90 degrees counterclockwise, swap the x and y values and subtract the y value from the width
    // newPoint.x = y;
    // newPoint.y = w - x;

    // Return the new coordinate object
    return [newPoint.x, newPoint.y];
}


function rotateImage() {
    hideTips();
    let originalRotation = regionEditor.imageRotation;
    regionEditor.imageRotation += 90;
    if (regionEditor.imageRotation >= 360) {
        regionEditor.imageRotation = 0;
    }
    if (regionEditor.regions.length > 0) {
        //rotate all regions by 90 degrees. move x and y accordingly
        for (let i = 0; i < regionEditor.regions.length; i++) {
            let region = regionEditor.regions[i];
            var pts = [region.x, region.y];
            if (originalRotation == 0 || originalRotation == 180) {
                if (region.type == 'point') {
                    //console.log('point');
                    pts = rotate90(regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, region.x, region.y);
                }
                else if (region.type == 'polygon') {

                    for (let index = 0; index < region.points.length; index++) {
                        let point = region.points[index];
                        pts = rotate90(regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, point.x, point.y);
                        point.x = pts[0];
                        point.y = pts[1];
                    }
                    region.x = region.points[0].x;
                    region.y = region.points[0].y;
                    fixRegionOutOfBounds(region);//recalcs width and height.
                }
                else {
                    pts = rotate90(regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, region.x, region.y);
                    let nX = pts[0];//85  //80
                    let nY = pts[1];//64  //84
                    //console.log('rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                    nX = nX - region.height;

                    //console.log('adjusted rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                    pts[0] = nX;
                    pts[1] = nY;

                }

            }
            else {
                if (region.type == 'point') {
                    pts = rotate90(regionEditor.imageNativeHeight, regionEditor.imageNativeWidth, region.x, region.y);
                }
                else if (region.type == 'polygon') {

                    for (let index = 0; index < region.points.length; index++) {
                        let point = region.points[index];
                        pts = rotate90(regionEditor.imageNativeHeight, regionEditor.imageNativeWidth, point.x, point.y);
                        point.x = pts[0];
                        point.y = pts[1];
                    }
                    region.x = region.points[0].x;
                    region.y = region.points[0].y;
                    fixRegionOutOfBounds(region);//recalcs width and height.
                }
                else {
                    pts = rotate90(regionEditor.imageNativeHeight, regionEditor.imageNativeWidth, region.x, region.y);
                    let nX = pts[0];//85  //80
                    let nY = pts[1];//64  //84
                    //console.log('rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                    nX = nX - region.height;

                    //console.log('adjusted rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                    pts[0] = nX;
                    pts[1] = nY;
                }


            }
            let originalWidth = region.width;
            let originalHeight = region.height;
            let newX = pts[0];
            let newY = pts[1];

            region.x = newX;
            region.y = newY;
            region.width = originalHeight;
            region.height = originalWidth;

        }
    }
    recalcEditor();
    addRegionHistory('rotate image', null, false);//I don't think this needs a undo.
}

let lastRedrawDate = null;
let waitinhRedraw = false;
function drawRegions() {
    if (lastRedrawDate != null) {
        let now = new Date();
        let diff = now - lastRedrawDate;
        if (diff < 100) {
            if (!waitingRedraw) {
                waitingRedraw = true;
                window.setTimeout(drawRegions, 100);//when they are painting with a prush updates are too fast.
            }
            return;
        }
    }
    waitingRedraw = false;
    lastRedrawDate = new Date();

    var regionEditorImage = document.getElementById("regionEditorImage");
    var regionEditorImageRef = document.getElementById("regionEditorImageRef");

    var canvas = document.createElement("canvas");
    canvas.width = regionEditor.imageWidth;
    canvas.height = regionEditor.imageHeight;


    var ctx = canvas.getContext("2d");
    resetSelectedRegionAttributes();

    let rotation = regionEditor.imageRotation * Math.PI / 180;
    if (regionEditor.imageFilter == 'sepia') {
        ctx.filter = "sepia(1)";
    }
    else if (regionEditor.imageFilter == 'contrast') {
        ctx.filter = ' contrast(150%) brightness(60%)';
    }
    else if (regionEditor.imageFilter == 'invert') {
        ctx.filter = 'invert(75%)';
    }
    else {
        ctx.filter = 'none';
    }
    let scale = regionEditor.imageScale;
    //fix this
    if (rotation != 0 || regionEditor.imageMirrorHorizontally) {
        ctx.save();
        // translate context to center of canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);

        ctx.rotate(rotation);

        if (regionEditor.imageMirrorHorizontally) {
            ctx.scale(-1, 1);
        }
        // draw image

        ctx.scale(scale, scale);
        ctx.drawImage(regionEditorImageRef, (-regionEditor.imageNativeWidth / 2), (-regionEditor.imageNativeHeight / 2));
        ctx.scale(1 / scale, 1 / scale);
        //ctx.drawImage(regionEditorImageRef,(-regionEditor.imageNativeWidth * regionEditor.imageScale) / 2, (-regionEditor.imageNativeHeight * regionEditor.imageScale) / 2);
        //unrotate
        ctx.rotate(-rotation);
        // un-translate the canvas back to origin==top-left canvas
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.restore();

    }
    else {
        ctx.drawImage(regionEditorImageRef, 0, 0, canvas.width, canvas.height);
    }
    ctx.filter = 'none';
    if (activeLayer == 'Matl') {

        drawMaterialMap(ctx, scale);
    }
    else if (activeLayer == 'Dist') {

        drawDistanceMap(ctx, scale);
    }
    else {
        drawRegionMap(ctx, scale);
    }

    var ctxMain = regionEditorImage.getContext("2d");

    regionEditorImage.width = canvas.width;
    regionEditorImage.height = canvas.height;
    ctxMain.clearRect(0, 0, regionEditorImage.width, regionEditorImage.height);
    ctxMain.drawImage(canvas, 0, 0, regionEditorImage.width, regionEditorImage.height);
}



function getColorRampValueRGBA(min, max, num, alpha, rgbColors) {
    // Check if the parameters are valid
    if (min > max || num < min || num > max || rgbColors.length < 2) {
        return null; // Invalid input, return null
    }

    if (min == max) {
        //return the first item in the array
        return 'rgba(' +
            Math.round(rgbColors[0][0]) + ',' + // Red
            Math.round(rgbColors[0][1]) + ',' + // Green
            Math.round(rgbColors[0][2]) + ',' + //Blue
            alpha + ')'; // Alpha
        console.log('min == max')
    }

    // Calculate the relative position of the number in the range [0, 1]
    var position = (num - min) / (max - min);

    // Find the index of the lower color in the array
    var index = Math.floor(position * (rgbColors.length - 1));

    // Find the fraction of the position between the lower and upper colors
    var fraction = position * (rgbColors.length - 1) - index;

    // Get the lower and upper colors as RGB arrays
    var lower = rgbColors[index];
    var upper = rgbColors[index + 1];
    if (upper == null) {
        upper = rgbColors[index];
    }
    try {
        // Interpolate between the lower and upper colors using the fraction
        return 'rgba(' +
            Math.round(lower[0] + fraction * (upper[0] - lower[0])) + ',' + // Red
            Math.round(lower[1] + fraction * (upper[1] - lower[1])) + ',' + // Green
            Math.round(lower[2] + fraction * (upper[2] - lower[2])) + ',' + //Blue
            alpha + ')'; // Alpha
    }
    catch (e) {
        console.error('upper', JSON.stringify(upper));
        return 'rgba(0,0,0,0)';
    }

}







function drawDistanceMap(ctx, scale) {

    //red, //yellow //green //cyan //blue

    const colorRamp = [[255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255]];
    let min = 999;
    let max = -999;
    for (let i = 0; i < distanceMap.length; i++) {
        let distanceItem = distanceMap[i];
        if (distanceItem == null) {
            continue;
        }
        if (distanceItem < min) {
            min = distanceItem;
        }
        if (distanceItem > max) {
            max = distanceItem;
        }
    }

    for (let i = 0; i < distanceMap.length; i++) {
        let distanceItem = distanceMap[i];
        if (distanceItem == null) {
            continue;
        }
        let pt = getPointFromIndex(i, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
        let x = pt[0];
        let y = pt[1];
        ctx.fillStyle = getColorRampValueRGBA(min * 100, max * 100, distanceItem * 100, .2, colorRamp);

        let pts = rotateFillPoint(regionEditor.imageRotation, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageMirrorHorizontally, x, y)
        x = pts[0];
        y = pts[1];

        ctx.fillRect(x * scale, y * scale, scale, scale);
    }

    document.getElementById("valMinDistanceM").innerHTML = (min == 999 ? '--' : (min.toFixed(2) + "m"));
    document.getElementById("valMinDistanceIn").innerHTML = (min == 999 ? '--' : (metersToInches(min).toFixed(1) + "in"));
    document.getElementById("valMinDistanceColor").style.backgroundColor = (min == max ? 'rgb(255,0,0)' : 'rgb(255,0,0)');
    document.getElementById("valMaxDistanceM").innerHTML = (max == -999 ? '--' : (max.toFixed(2) + "m"));
    document.getElementById("valMaxDistanceIn").innerHTML = (max == -999 ? '--' : (metersToInches(max).toFixed(1) + "in"));
    document.getElementById("valMaxDistanceColor").style.backgroundColor = (min == max ? 'rgb(255,0,0)' : 'rgb(0,0,255)');
}

function drawMaterialMap(ctx, scale) {

    const colorRamp = [[255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255]];
    let min = 999;
    let max = -999;
    for (let i = 0; i < materialMap.length; i++) {
        let materialItem = materialMap[i];
        if (materialItem == null || materialItem.name == null || materialItem.emissivity == null) {
            continue;
        }
        if (materialItem.emissivity < min) {
            min = materialItem.emissivity;
        }
        if (materialItem.emissivity > max) {
            max = materialItem.emissivity;
        }
    }

    for (let i = 0; i < materialMap.length; i++) {
        let materialItem = materialMap[i];
        if (materialItem == null || materialItem.name == null || materialItem.emissivity == null) {
            continue;
        }
        let pt = getPointFromIndex(i, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
        let x = pt[0];
        let y = pt[1];
        ctx.fillStyle = getColorRampValueRGBA(min * 100, max * 100, materialItem.emissivity * 100, .2, colorRamp);

        let pts = rotateFillPoint(regionEditor.imageRotation, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageMirrorHorizontally, x, y)
        x = pts[0];
        y = pts[1];

        ctx.fillRect(x * scale, y * scale, scale, scale);



    }

    document.getElementById("valMinEmissivity").innerHTML = (min == 999 ? '--' : (min.toFixed(2)));
    document.getElementById("valMinEmissivityColor").style.backgroundColor = (min == max ? 'rgb(255,0,0)' : 'rgb(255,0,0)');
    document.getElementById("valMaxEmissivity").innerHTML = (max == -999 ? '--' : (max.toFixed(2)));
    document.getElementById("valMaxEmissivityColor").style.backgroundColor = (min == max ? 'rgb(255,0,0)' : 'rgb(0,0,255)');
}

function drawRegionMap(ctx, scale) {
    for (var i = 0; i < regionEditor.regions.length; i++) {
        var region = regionEditor.regions[i];
        let isSelected = false;
        let drawControls = false;
        if (activeLayer == 'Region') {
            isSelected = i == regionEditor.selectedRegionIndex;
            drawControls = isSelected && region.type == 'polygon' && activeTool.indexOf('point') > -1;
            if (drawControls) {
                if (region.points.length <= 3 && activeTool == 'pointdelete') {
                    drawControls = false;
                }
            }
        }
        drawRegion(ctx, scale, region, isSelected, region.color, null, drawControls);
        if (isSelected) {
            updateSelectedRegionAttributes(region);
        }
    }
}

function getDisplayTempFromCelsius(celsius, displayFahrenheit) {
    if (celsius == null) {
        return '--';
    }
    if (!displayFahrenheit) {
        return (Math.round(celsius * 10) / 10).toString();
    }
    else {
        let cel = Math.round(celsius * 10) / 10;//need to round first as this is what they see for on screen conversion
        let valF = (cel * 9 / 5) + 32;
        return (Math.round(valF * 10) / 10).toString();
    }

}

function changeRegionNext(nextRegion) {
    if (regionEditor.regions.length <= 1) {
        return;
    }
    this.closeAlarmTemp();//close alarm temp if open
    let regionIndex = regionEditor.selectedRegionIndex;
    if (nextRegion) {
        regionIndex++;
    }
    else {
        regionIndex--;
    }
    if (regionIndex < 0) {
        regionIndex = regionEditor.regions.length - 1;
    }
    else if (regionIndex >= regionEditor.regions.length) {
        regionIndex = 0;
    }
    setRegionIndex(regionIndex);

}

function setRegionIndex(regionIndex) {
    if (regionIndex < 0 || regionIndex >= regionEditor.regions.length) {
        console.error('invalid region index: ' + regionIndex);
        return;
    }
    if (regionIndex != regionEditor.selectedRegionIndex) {
        let region = regionEditor.regions[regionIndex];
        if (region.type == 'polygon') {
            if (selectedPointIndex < 0 || selectedPointIndex >= region.points.length) {
                selectedPointIndex = 0;
            }
        }
        else {
            selectedPointIndex = -1;
        }


    }
    regionEditor.selectedRegionIndex = regionIndex;
    activeTool = 'select';
    recalcEditor();
    //I don't think this needs a undo.
}

function getRegionPointsOnCanvas(region, outlineOnly) {
    if (region.type == 'point') {
        return [{ "x": region.x, "y": region.y }];//only one point
    }
    let canvas = document.createElement("canvas");
    if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
        canvas.width = regionEditor.imageNativeWidth;
        canvas.height = regionEditor.imageNativeHeight;

    }
    else {
        canvas.width = regionEditor.imageNativeHeight;
        canvas.height = regionEditor.imageNativeWidth;

    }
    let ctx = canvas.getContext("2d");
    let fillColor = outlineOnly ? null : 'black';
    drawRegion(ctx, 1, region, false, 'black', fillColor, false);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    let points = [];
    for (let i = 0; i < data.length; i += 4) {
        //i==R i+1==G i+2==B i+3==A
        if (data[i + 3] > 0) {
            let x = (i / 4) % canvas.width;
            let y = Math.floor((i / 4) / canvas.width);
            points.push({ "x": x, "y": y })
        }
    }
    //console.log('length ' + data.length / 4 + ' points: ' + points.length);
    return points;
}

function getTempsFromPointsOnCanvas(points) {

    let lowCelsius = 999999
    let highCelsius = -999999
    let lowX = -1;
    let lowY = -1;
    let highX = -1;
    let highY = -1;
    for (let i = 0; i < points.length; i++) {
        let point = points[i];

        let index = getIndexOfMapFromXY(point.x, point.y, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally);

        if (index > -1 && index < tempsCelsius.length) {
            let temp = tempsCelsius[index];
            if (temp < lowCelsius) {
                lowCelsius = temp;
                lowX = point.x;
                lowY = point.y;
            }
            if (temp > highCelsius) {
                highCelsius = temp;
                highX = point.x;
                highY = point.y;
            }
        }
        else {
            console.error("temp index out of bounds:" + index + "Length is: " + tempsCelsius.length + " point: " + point.x + "," + point.y + "");
        }

    }

    if (lowCelsius == 999999) {
        lowCelsius = null;
        highCelsius = null;
        console.error('no temps found');
    }
    let regionTemps = { "lowCelsius": lowCelsius, "highCelsius": highCelsius, "lowX": lowX, "lowY": lowY, "highX": highX, "highY": highY };
    //console.log('region temps: ' + JSON.stringify(regionTemps));
    return regionTemps;
}


function getRegionTemps(region) {

    let points = getRegionPointsOnCanvas(region, false);//This will return only points that are in bounds!
    return getTempsFromPointsOnCanvas(points);

}

function updateSelectedRegionAttributes(region) {
    resetSelectedRegionAttributes();
    document.getElementById("valRegionIndex").innerHTML = "0 of 0";
    if (regionEditor.selectedRegionIndex > -1 && regionEditor.regions.length > 0) {
        document.getElementById("valRegionIndex").innerHTML = (regionEditor.selectedRegionIndex + 1) + " of " + regionEditor.regions.length;
    }

    let regionTemps = getRegionTemps(region);
    document.getElementById("valRegionHighTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, false) + '&deg;C';
    document.getElementById("valRegionHighTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, true) + '&deg;F';
    document.getElementById("valRegionLowTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, false) + '&deg;C';
    document.getElementById("valRegionLowTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, true) + '&deg;F';


    document.getElementById("valRegionName").innerHTML = region.name;
    document.getElementById("valRegionMaxTempC").innerHTML = getDisplayTempFromCelsius(region.alarmThresh.hiTempC, false) + '&deg;C';
    document.getElementById("valRegionMaxTempF").innerHTML = getDisplayTempFromCelsius(region.alarmThresh.hiTempC, true) + '&deg;F';
    document.getElementById("valRegionMaxPriorityLevel").innerHTML = region.alarmThresh.hiTempC == null ? '--' : region.alarmThresh.hiPriority;
    document.getElementById("valRegionMinTempC").innerHTML = getDisplayTempFromCelsius(region.alarmThresh.loTempC, false) + '&deg;C';
    document.getElementById("valRegionMinTempF").innerHTML = getDisplayTempFromCelsius(region.alarmThresh.loTempC, true) + '&deg;F';
    document.getElementById("valRegionMinPriorityLevel").innerHTML = region.alarmThresh.loTempC == null ? '--' : region.alarmThresh.loPriority;
    document.getElementById("valRegionColor").innerHTML = region.color;
    document.getElementById("valRegionColorDemo").style.backgroundColor = region.color;
}

function resetSelectedRegionAttributes() {
    document.getElementById("valRegionIndex").innerHTML = "0 of 0";

    document.getElementById("valRegionHighTempC").innerHTML = "--&deg;C";
    document.getElementById("valRegionHighTempF").innerHTML = "--&deg;F";
    document.getElementById("valRegionLowTempC").innerHTML = "--&deg;C";
    document.getElementById("valRegionLowTempF").innerHTML = "--&deg;F";

    document.getElementById("valRegionName").innerHTML = "--";
    document.getElementById("valRegionMaxTempC").innerHTML = "--&deg;C";
    document.getElementById("valRegionMaxTempF").innerHTML = "--&deg;F";
    document.getElementById("valRegionMinTempC").innerHTML = "--&deg;C";
    document.getElementById("valRegionMinTempF").innerHTML = "--&deg;F";
    document.getElementById("valRegionMaxPriorityLevel").innerHTML = "--";
    document.getElementById("valRegionMinPriorityLevel").innerHTML = "--";
    document.getElementById("valRegionColor").innerHTML = "--";
    document.getElementById("valRegionColorDemo").style.backgroundColor = "grey";

}

function deleteRegionEditor() {
    if (regionEditor.selectedRegionIndex >= 0) {
        let selIndex = regionEditor.selectedRegionIndex;
        let region = regionEditor.regions[regionEditor.selectedRegionIndex];
        regionEditor.regions.splice(regionEditor.selectedRegionIndex, 1);
        regionEditor.selectedRegionIndex--;
        if (regionEditor.selectedRegionIndex < 0 && regionEditor.regions.length > 0) {
            regionEditor.selectedRegionIndex = 0;
        }
        recalcEditor();
        addRegionHistory('delete ' + region.type, selIndex, true);
    }
}

function changeImageMirror() {
    regionEditor.imageMirrorHorizontally = !regionEditor.imageMirrorHorizontally;
    if (regionEditor.regions != null && regionEditor.regions.length > 0) {
        for (let i = 0; i < regionEditor.regions.length; i++) {
            let region = regionEditor.regions[i];
            if (region.type == 'point') {
                if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
                    region.x = regionEditor.imageNativeWidth - region.x;
                }
                else {
                    region.y = regionEditor.imageNativeWidth - region.y//mirror is always on horizontal axis
                }

            }
            else if (region.type == 'polygon') {
                for (let j = 0; j < region.points.length; j++) {
                    let point = region.points[j];
                    if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
                        point.x = regionEditor.imageNativeWidth - point.x;
                    }
                    else {
                        point.y = regionEditor.imageNativeWidth - point.y;//mirror is always on horizontal axis

                    }
                }
                region.x = region.points[0].x;
                region.y = region.points[0].y;
                fixRegionOutOfBounds(region);//recalcs width and height.
            }
            else {
                console.error('cannot mirror, unknown region type: ' + region.type);
            }
        }
    }
    hideTips();
    addRegionHistory('image mirror horizontally', null, false);
    recalcEditor();
}

function changeAlarmPriority(isMax, value) {
    if (this.editAlarmThresh == null) {
        return;
    }
    if (isMax) {
        this.editAlarmThresh.hiPriority += value;
        if (this.editAlarmThresh.hiPriority > 9) {
            this.editAlarmThresh.hiPriority = 1;
        }
        else if (this.editAlarmThresh.hiPriority < 1) {
            this.editAlarmThresh.hiPriority = 9;
        }
    }
    else {
        this.editAlarmThresh.loPriority += value;
        if (this.editAlarmThresh.loPriority > 9) {
            this.editAlarmThresh.loPriority = 1;
        }
        else if (this.editAlarmThresh.loPriority < 1) {
            this.editAlarmThresh.loPriority = 9;
        }
    }
    updateThreshDisplay(this.editAlarmIsImage, this.editAlarmThresh);

}

function changeAlarmTempBy(isMaxTemp, changeAmount) {

    if (this.editAlarmThresh == null) {
        return;
    }
    if (isMaxTemp) {

        let defaultTempC = this.editAlarmThresh.hiTempC;
        if (defaultTempC == null) {
            defaultTempC = tempRanges.highCelsius;
        }
        let tempCelsius = defaultTempC + changeAmount;
        tempCelsius = Math.round(tempCelsius * 10) / 10;//round to .1
        tempCelsius = Math.min(999, tempCelsius);
        tempCelsius = Math.max(-999, tempCelsius);
        this.editAlarmThresh.hiTempC = tempCelsius;

    }
    else {
        let defaultTempC = this.editAlarmThresh.loTempC;
        if (defaultTempC == null) {
            defaultTempC = tempRanges.lowCelsius;
        }
        let tempCelsius = defaultTempC + changeAmount;
        tempCelsius = Math.round(tempCelsius * 10) / 10;//round to .1
        tempCelsius = Math.min(999, tempCelsius);
        tempCelsius = Math.max(-999, tempCelsius);
        this.editAlarmThresh.loTempC = tempCelsius;
    }

    updateThreshDisplay(this.editAlarmIsImage, this.editAlarmThresh);
}

function clearAlarmThresh(isMaxTemp) {
    if (this.editAlarmThresh == null) {
        return;
    }
    if (isMaxTemp) {
        this.editAlarmThresh.hiTempC = null;
        this.editAlarmThresh.hiPriority = 1;
    }
    else {
        this.editAlarmThresh.loTempC = null;
        this.editAlarmThresh.loPriority = 1;
    }
    updateThreshDisplay(this.editAlarmIsImage, this.editAlarmThresh);
}


function updateThreshDisplay(isImage, thresh) {
    if (!isImage && (this.regionEditor.selectedRegionIndex < 0 || this.regionEditor.selectedRegionIndex >= this.regionEditor.regions.length)) {
        this.closeAlarmTemp();
        return;
    }

    let region = isImage ? null : this.regionEditor.regions[this.regionEditor.selectedRegionIndex];
    let strElm = "edtImage";
    let strBtnChange = "btnChangeImage";
    let strBtnClear = "btnClearImage";
    lblEditThreshTitle.innerHTML = isImage ? "Entire Image Alarm Settings" : 'Region "' + region.name + '" Alarm Settings';

    document.getElementById(strElm + "HighLabel").innerHTML = isImage ? "Img Hi" : "Rgn Hi";
    document.getElementById(strElm + "LowLabel").innerHTML = isImage ? "Img Lo" : "Rgn Lo";

    if (isImage) {
        document.getElementById(strElm + "HighTempC").innerHTML = document.getElementById("valImageHighTempC").innerHTML;
        document.getElementById(strElm + "HighTempF").innerHTML = document.getElementById("valImageHighTempF").innerHTML;
        document.getElementById(strElm + "LowTempC").innerHTML = document.getElementById("valImageLowTempC").innerHTML;
        document.getElementById(strElm + "LowTempF").innerHTML = document.getElementById("valImageLowTempF").innerHTML;
    }
    else {
        document.getElementById(strElm + "HighTempC").innerHTML = document.getElementById("valRegionHighTempC").innerHTML;
        document.getElementById(strElm + "HighTempF").innerHTML = document.getElementById("valRegionHighTempF").innerHTML;
        document.getElementById(strElm + "LowTempC").innerHTML = document.getElementById("valRegionLowTempC").innerHTML;
        document.getElementById(strElm + "LowTempF").innerHTML = document.getElementById("valRegionLowTempF").innerHTML;
    }


    document.getElementById(strElm + "MaxAlarmTempC").innerHTML = getDisplayTempFromCelsius(thresh.hiTempC, false) + '&deg;C';
    document.getElementById(strElm + "MaxAlarmTempF").innerHTML = getDisplayTempFromCelsius(thresh.hiTempC, true) + '&deg;F';
    document.getElementById(strElm + "MaxAlarmPriority").innerHTML = (thresh.hiTempC == null ? "--" : thresh.hiPriority);
    document.getElementById(strBtnChange + "MaxAlarmPriorityLess").disabled = thresh.hiTempC == null;
    document.getElementById(strBtnChange + "MaxAlarmPriorityMore").disabled = thresh.hiTempC == null;
    document.getElementById(strBtnClear + "MaxAlarmPriority").disabled = thresh.hiTempC == null;



    document.getElementById(strElm + "MinAlarmTempC").innerHTML = getDisplayTempFromCelsius(thresh.loTempC, false) + '&deg;C';
    document.getElementById(strElm + "MinAlarmTempF").innerHTML = getDisplayTempFromCelsius(thresh.loTempC, true) + '&deg;F';
    document.getElementById(strElm + "MinAlarmPriority").innerHTML = (thresh.loTempC == null ? "--" : thresh.loPriority);
    document.getElementById(strBtnChange + "MinAlarmPriorityLess").disabled = thresh.loTempC == null;
    document.getElementById(strBtnChange + "MinAlarmPriorityMore").disabled = thresh.loTempC == null;
    document.getElementById(strBtnClear + "MinAlarmPriority").disabled = thresh.loTempC == null;

    let invalidMessage = getAlarmThreshIsValidMessage(this.editAlarmIsImage, this.editAlarmThresh);
    document.getElementById("btnSaveImageAlarms").disabled = invalidMessage.length > 0;

    document.getElementById("threshWindowMessage").innerHTML = invalidMessage;


    document.getElementById("threshwindow").style.display = "block";


}

function closeAlarmTemp() {
    document.getElementById("threshwindow").style.display = "none";
}

function getAlarmThreshIsValidMessage(isImage, thresh) {
    if (thresh == null) {
        return "Thresholds are null";
    }
    if (thresh.hiTempC != null && thresh.loTempC != null && thresh.hiTempC < thresh.loTempC) {
        return "Alarm High Temp Is Less Than Alarm Low Temp.";
    }

    return '';
}

function saveAlarmTemp() {
    let hadChange = false;
    if (this.editAlarmThresh != null) {
        let strValidMessage = getAlarmThreshIsValidMessage(this.editAlarmIsImage, this.editAlarmThresh);
        if (strValidMessage.length > 0) {
            return;
        }
        if (this.editAlarmIsImage) {
            if (JSON.stringify(this.regionEditor.imageAlarmThresh) != JSON.stringify(this.editAlarmThresh)) {
                hadChange = true;
                this.regionEditor.imageAlarmThresh = JSON.parse(JSON.stringify(this.editAlarmThresh));
            }


        }
        else {
            let region = this.regionEditor.regions[this.regionEditor.selectedRegionIndex];
            if (JSON.stringify(region.alarmThresh) != JSON.stringify(this.editAlarmThresh)) {
                hadChange = true;
                region.alarmThresh = JSON.parse(JSON.stringify(this.editAlarmThresh));
            }
        }
        recalcEditor();
        if (hadChange) {
            addRegionHistory('change alarm temp', null, true);//force this
        }
    }

    this.closeAlarmTemp();
}

function changeAlarmTemp(isImage, isMax) {
    console.log('showing alarm settings');
    if (isImage) {
        this.editAlarmThresh = JSON.parse(JSON.stringify(this.regionEditor.imageAlarmThresh));
        this.editAlarmIsImage = true;
    }
    else {
        if (this.regionEditor.selectedRegionIndex >= 0 && this.regionEditor.selectedRegionIndex < this.regionEditor.regions.length) {
            this.editAlarmThresh = JSON.parse(JSON.stringify(this.regionEditor.regions[this.regionEditor.selectedRegionIndex].alarmThresh));
            this.editAlarmIsImage = false;
        }
        else {
            return;
        }
    }
    selectRegionEditorTool('look');
    updateThreshDisplay(this.editAlarmIsImage, this.editAlarmThresh);

    //{"loPriority" : 1, "hiPriority" : 1, "loTempC" : null, "hiTempC" : null}


}

function changeImageFilterNext(nextFilter) {
    hideTips();
    let imageFilter = imageFilters[0];
    let imageFilterIndex = 0;
    if (regionEditor.imageFilter != null) {
        imageFilterIndex = imageFilters.indexOf(regionEditor.imageFilter);
        if (imageFilterIndex == -1) {
            imageFilterIndex = 0;
        }
    }
    if (nextFilter) {
        imageFilterIndex++;
    }
    else {
        imageFilterIndex--;
    }

    if (imageFilterIndex < 0) {
        imageFilterIndex = imageFilters.length - 1;
    }
    else if (imageFilterIndex >= imageFilters.length) {
        imageFilterIndex = 0;
    }
    imageFilter = imageFilters[imageFilterIndex];
    regionEditor.imageFilter = imageFilter;

    recalcEditor();
    addRegionHistory('change image filter', null, false);//I don't think this needs a undo.
}

function changeRegionName() {
    if (regionEditor.selectedRegionIndex >= 0) {
        this.closeAlarmTemp();//close alarm temp if open
        var region = regionEditor.regions[regionEditor.selectedRegionIndex];
        var newName = prompt("Please enter a new region name with maximum length of " + regionEditor.maxNameLength + " characters consisting only of letters, numbers and underscores.", region.name);
        if (newName != null && newName.trim() != "") {
            newName = newName.trim();
            if (newName.length > regionEditor.maxNameLength) {
                console.error('name too long, max ' + regionEditor.maxNameLength + ' characters');
                return;
            }
            for (let i = 0; i < newName.length; i++) {
                let c = newName.charAt(i);
                if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= 9) || c == '_')) {
                    console.error('Invalid character in name: ' + c + ', only a-z, A-Z, 0-9 and _ are allowed.');
                    return;
                }
            }
            region.name = newName;
            recalcEditor();
            addRegionHistory('change ' + region.type + ' name', regionEditor.selectedRegionIndex, true);
        }
    }
}

function drawRegion(ctx, scale, region, isSelected, strokeColor, fillColor, drawControls) {
    // Reset transformation matrix to the identity matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (region.type == "polygon") {

        if (region.points != null && region.points.length > 0) {
            ctx.beginPath();
            // we don't have a rotation angle
            //console.log('drawing polygon: ' + JSON.stringify(region.points));

            ctx.moveTo((region.points[0].x * scale), (region.points[0].y * scale));
            for (let i = 1; i < region.points.length; i++) {
                ctx.lineTo((region.points[i].x * scale), (region.points[i].y * scale));
            }
            ctx.closePath();
            if (isSelected) {
                ctx.setLineDash([4]);
            }
            else {
                ctx.setLineDash([]);
            }

            ctx.lineWidth = 1 * scale;
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
            ctx.closePath();
            if (fillColor != null) {
                ctx.fillStyle = fillColor;
                ctx.fill();
            }
            if (drawControls) {
                let showDeleteNodes = region.points.length > 3 && activeTool == 'pointdelete';
                let showAddNodes = activeTool == 'pointadd';
                for (let i = 0; i < region.points.length; i++) {
                    let point = region.points[i];
                    if (showDeleteNodes) {

                        ctx.beginPath();
                        ctx.setLineDash([]);
                        ctx.lineWidth = 1 * scale;
                        ctx.strokeStyle = strokeColor;
                        let slashLength = 3 * scale;
                        ctx.moveTo((point.x * scale) - slashLength, (point.y * scale) - slashLength);
                        ctx.lineTo((point.x * scale) + slashLength, (point.y * scale) + slashLength);

                        ctx.moveTo((point.x * scale) + slashLength, (point.y * scale) - slashLength);
                        ctx.lineTo((point.x * scale) - slashLength, (point.y * scale) + slashLength);
                        ctx.stroke();
                        ctx.closePath();

                        ctx.beginPath();
                        ctx.setLineDash([]);
                        ctx.strokeStyle = strokeColor;
                        ctx.arc((point.x * scale), (point.y * scale), (4 * scale), 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                    else if (showAddNodes) {
                        ctx.beginPath();
                        ctx.setLineDash([]);
                        ctx.lineWidth = 1 * scale;
                        ctx.strokeStyle = strokeColor;
                        let slashLength = 3 * scale;
                        ctx.moveTo((point.x * scale), (point.y * scale) - slashLength);
                        ctx.lineTo((point.x * scale), (point.y * scale) + slashLength);

                        ctx.moveTo((point.x * scale) + slashLength, (point.y * scale));
                        ctx.lineTo((point.x * scale) - slashLength, (point.y * scale));
                        ctx.stroke();
                        ctx.closePath();

                        ctx.beginPath();
                        ctx.setLineDash([]);
                        ctx.strokeStyle = strokeColor;
                        ctx.arc((point.x * scale), (point.y * scale), (4 * scale), 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                    else {

                        if (activeTool != 'pointmove') {
                            ctx.beginPath();
                            ctx.arc((point.x * scale), (point.y * scale), (2 * scale), 0, 2 * Math.PI);
                            ctx.fillStyle = strokeColor;
                            ctx.fill();
                        }

                        if ((i == selectedPointIndex || activeTool == 'pointmove')) {

                            ctx.beginPath();
                            ctx.setLineDash([]);
                            ctx.strokeStyle = strokeColor;
                            ctx.arc((point.x * scale), (point.y * scale), (4 * scale), 0, 2 * Math.PI);
                            ctx.stroke();
                        }
                    }


                }
            }
        }
        else {
            console.error('polygon has no points: ' + JSON.stringify(region));
        }
    }
    else if (region.type == 'point') {
        ctx.beginPath();

        //console.log('drawing point: ' + region.x + ',' + region.y);
        ctx.setLineDash([]);
        ctx.lineWidth = 1 * scale;
        ctx.strokeStyle = strokeColor;
        ctx.moveTo((region.x * scale), (region.y * scale) - (8 * scale));
        ctx.lineTo((region.x * scale), (region.y * scale) - (1 * scale));
        ctx.stroke();

        ctx.moveTo((region.x * scale), (region.y * scale) + (1 * scale));
        ctx.lineTo((region.x * scale), (region.y * scale) + (8 * scale));
        ctx.stroke();

        ctx.moveTo((region.x * scale) - (8 * scale), (region.y * scale));
        ctx.lineTo((region.x * scale) - (1 * scale), (region.y * scale));
        ctx.stroke();

        ctx.moveTo((region.x * scale) + (1 * scale), (region.y * scale));
        ctx.lineTo((region.x * scale) + (8 * scale), (region.y * scale));
        ctx.stroke();

        if (isSelected) {
            ctx.beginPath();
            ctx.arc((region.x * scale), (region.y * scale), (4 * scale), 0, 2 * Math.PI);
            ctx.stroke();
        }






    }
}

function getPolygonBounds(points) {

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (let index = 1; index < points.length; index++) {
        if (points[index].x < minX) {
            minX = points[index].x;
        }
        if (points[index].x > maxX) {
            maxX = points[index].x;
        }
        if (points[index].y < minY) {
            minY = points[index].y;
        }
        if (points[index].y > maxY) {
            maxY = points[index].y;
        }
    }
    let bounds = { "minX": minX, "minY": minY, "maxX": maxX, "maxY": maxY, "width": maxX - minX, "height": maxY - minY, "x": minX, "y": minY };
    return bounds;
}

function fixRegionOutOfBounds(region) {
    if (region.type == 'point') {
        region.x = Math.max(region.x, 0);
        region.y = Math.max(region.y, 0);
        if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
            region.x = Math.min(region.x, regionEditor.imageNativeWidth);
            region.y = Math.min(region.y, regionEditor.imageNativeHeight);
        }
        else {
            region.x = Math.min(region.x, regionEditor.imageNativeHeight);
            region.y = Math.min(region.y, regionEditor.imageNativeWidth);
        }
    }
    else if (region.type == 'polygon') {
        //we need to adjust x and  y.
        let bounds = getPolygonBounds(region.points);
        region.angle = 0;//cannot rotate polygon.
        region.width = bounds.width;
        region.height = bounds.height;

        let moveX = 0;
        let moveY = 0;
        if (bounds.minX < 0) {
            moveX = 0 - bounds.minX;
        }
        else if ((regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) && bounds.maxX > regionEditor.imageNativeWidth) {
            moveX = regionEditor.imageNativeWidth - bounds.maxX;
        }
        else if ((regionEditor.imageRotation == 90 || regionEditor.imageRotation == 270) && bounds.maxX > regionEditor.imageNativeHeight) {
            moveX = regionEditor.imageNativeHeight - bounds.maxX;
        }

        if (bounds.minY < 0) {
            moveY = 0 - bounds.minY;
        }
        else if ((regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) && bounds.maxY > regionEditor.imageNativeHeight) {
            moveY = regionEditor.imageNativeHeight - bounds.maxY;
        }
        else if ((regionEditor.imageRotation == 90 || regionEditor.imageRotation == 270) && bounds.maxY > regionEditor.imageNativeWidth) {
            moveY = regionEditor.imageNativeWidth - bounds.maxY;
        }

        if (moveX != 0 || moveY != 0) {
            for (let index = 0; index < region.points.length; index++) {
                region.points[index].x += moveX;
                region.points[index].y += moveY;
            }
            bounds = getPolygonBounds(region.points)
            region.x = bounds.x;
            region.y = bounds.y;
        }


    }
    else {

        if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
            region.x = Math.max(region.x, 0 - region.width / 2);
            region.y = Math.max(region.y, 0 - region.height / 2);
            region.x = Math.min(region.x, regionEditor.imageNativeWidth - region.width / 2);
            region.y = Math.min(region.y, regionEditor.imageNativeHeight - region.height / 2);
        }
        else {
            region.x = Math.max(region.x, 0 - region.height / 2);
            region.y = Math.max(region.y, 0 - region.width / 2);
            region.x = Math.min(region.x, regionEditor.imageNativeHeight - region.width / 2);
            region.y = Math.min(region.y, regionEditor.imageNativeWidth - region.height / 2);
        }
    }
}

function moveRegionAbsolute(x, y) {
    if (x == -1 || y == -1) {
        return;
    }


    if (regionEditor.selectedRegionIndex >= 0) {
        let region = regionEditor.regions[regionEditor.selectedRegionIndex];
        let originalX = region.x;
        let originalY = region.y;

        if (region.type == 'polygon') {
            let bounds = getPolygonBounds(region.points);
            if (bounds.x == x && bounds.y == y) {
                return;
            }
            let diffX = x - bounds.x;
            let diffy = y - bounds.y;
            for (let index = 0; index < region.points.length; index++) {
                region.points[index].x += diffX;
                region.points[index].y += diffy;
            }
            bounds = getPolygonBounds(region.points);
            region.x = bounds.x;
            region.y = bounds.y;
        }
        else {
            if (region.x == x && region.y == y) {
                return;
            }
            region.x = x;
            region.y = y;
        }

        fixRegionOutOfBounds(region);
        recalcEditor();
        let strTag = 'dragged';
        addRegionHistory('move ' + region.type + ' ' + strTag, regionEditor.selectedRegionIndex, false);
    }
}


function moveRegionBy(x, y) {
    if (x == 0 && y == 0) {
        return;
    }
    if (regionEditor.selectedRegionIndex >= 0) {
        var region = regionEditor.regions[regionEditor.selectedRegionIndex];
        region.x += x;
        region.y += y;

        if (region.type == 'polygon') {
            for (let index = 0; index < region.points.length; index++) {
                region.points[index].x += x;
                region.points[index].y += y;
            }
            region.x = region.points[0].x;
            region.y = region.points[0].y;
        }
        fixRegionOutOfBounds(region);
        recalcEditor();
        let strTag = '';
        if (x != 0 && y != 0) {
            strTag = 'diagnolly';
        }
        else if (x != 0) {
            strTag = 'horizontally';
        }
        else {
            strTag = 'vertically';
        }
        addRegionHistory('move ' + region.type + ' ' + strTag, regionEditor.selectedRegionIndex, false);
    }
}


function resizeRegionBy(w, h) {
    if (w == 0 && h == 0) {
        return;
    }
    if (regionEditor.selectedRegionIndex >= 0) {
        var region = regionEditor.regions[regionEditor.selectedRegionIndex];
        if (region.type == 'point') {
            clearFunc();
            return;
        }
        region.width += w;
        region.height += h;
        region.width = Math.max(region.width, 1);
        region.height = Math.max(region.height, 1);
        region.width = Math.min(region.width, regionEditor.imageNativeWidth);
        region.height = Math.min(region.height, regionEditor.imageNativeHeight);
        fixRegionOutOfBounds(region);
        recalcEditor();
        let strTag = '';
        if (w != 0 && h != 0) {
            strTag = 'width and height';
        }
        else if (h != 0) {
            strTag = 'height';
        }
        else {
            strTag = 'width';
        }
        addRegionHistory('resize ' + region.type + ' ' + strTag, regionEditor.selectedRegionIndex, false);
    }
}

function rotateRegionBy(rotateBy) {
    if (rotateBy == 0) {
        return;
    }
    if (regionEditor.selectedRegionIndex >= 0) {
        var region = regionEditor.regions[regionEditor.selectedRegionIndex];
        if (region.type == 'point') {
            clearFunc();
            return;
        }
        region.angle += rotateBy;
        while (region.angle > 360) {
            region.angle -= 360;
        }
        while (region.angle < 0) {
            region.angle += 360;
        }
        fixRegionOutOfBounds(region);
        recalcEditor();
        addRegionHistory('rotate ' + region.type, regionEditor.selectedRegionIndex, false);
    }
}

function changeRegionColorNext(goNext) {
    if (regionEditor.selectedRegionIndex >= 0) {
        this.closeAlarmTemp();//close alarm temp if open
        var region = regionEditor.regions[regionEditor.selectedRegionIndex];
        var currentIndex = regionColors.indexOf(region.color);
        if (currentIndex == -1) {
            currentIndex = 0;
        }
        if (goNext) {
            currentIndex++;
        }
        else {
            currentIndex--;
        }

        if (currentIndex < 0) {
            currentIndex = regionColors.length - 1;
        }
        else if (currentIndex >= regionColors.length) {
            currentIndex = 0;
        }
        region.color = regionColors[currentIndex];
        recalcEditor();
        addRegionHistory('change ' + region.type + ' color', regionEditor.selectedRegionIndex, false);
    }
}



function getPointFromIndex(index, width, height) {
    var calcY = index % height;
    var calcX = Math.floor(index / height);
    return [calcX, calcY];
}



function getIndexOfMapFromXY(posX, posY, pointRotation, imageMirrorHorizontally) {
    let indexTempC = -1;
    let myX = posX;
    let myY = posY;


    if (pointRotation == 0) {
        if (imageMirrorHorizontally) {
            myX = regionEditor.imageNativeWidth - myX - 1;
        }
        indexTempC = (myX * regionEditor.imageNativeHeight) + myY;
    }
    else if (pointRotation == 90) {
        if (imageMirrorHorizontally) {
            myX = regionEditor.imageNativeHeight - myX - 1;
        }
        indexTempC = (myY * regionEditor.imageNativeHeight) + (regionEditor.imageNativeHeight - myX - 1);
    }
    else if (pointRotation == 180) {
        if (imageMirrorHorizontally) {
            myX = regionEditor.imageNativeWidth - myX - 1;
        }
        indexTempC = ((regionEditor.imageNativeWidth - myX - 1) * regionEditor.imageNativeHeight) + (regionEditor.imageNativeHeight - myY - 1);
    }
    else if (pointRotation == 270) {
        if (imageMirrorHorizontally) {
            myX = regionEditor.imageNativeHeight - myX - 1;
        }
        indexTempC = ((regionEditor.imageNativeWidth - myY - 1) * regionEditor.imageNativeHeight) + myX;
    }
    else {
        return -1;
    }
    return indexTempC;
}

function findIndexOfClosestRegion(x, y, ignoreList) {
    if (regionEditor.regions.length == 0) {
        return -1;
    }
    if (ignoreList == null) {
        ignoreList = [];
    }
    let closetRegionIndex = -1;
    let closestDistance = 999999;
    for (let i = 0; i < regionEditor.regions.length; i++) {

        if (ignoreList.includes(i)) {
            continue;
        }
        let region = regionEditor.regions[i];
        let points = getRegionPointsOnCanvas(region, true);
        let index = findIndexOfClosestPoint(x, y, points);
        if (index == -1) {
            continue;
        }
        let point = points[index];
        let distanceToPoint = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
        if (distanceToPoint < closestDistance) {
            closestDistance = distanceToPoint;
            closetRegionIndex = i;
        }
    }
    return closetRegionIndex;
}

function findIndexOfClosestPoint(dragX, dragY, points, ignoreList) {
    let indexOfClosestPoint = -1;
    let closestDistance = 999999;
    for (let index = 0; index < points.length; index++) {
        if (ignoreList != null && ignoreList.includes(index)) {
            continue;
        }
        let point = points[index];
        let distanceToPoint = Math.sqrt(Math.pow(point.x - dragX, 2) + Math.pow(point.y - dragY, 2));
        if (distanceToPoint < closestDistance) {
            closestDistance = distanceToPoint;
            indexOfClosestPoint = index;
        }
    }
    return indexOfClosestPoint;
}

function findIndexOfClosestPolygonLine(x, y, points) {
    let indexOfClosestLine = -1;
    let closestDistance = 999999;
    for (let index = 0; index < points.length; index++) {
        let point = points[index];
        let nextPoint = null;
        if (index < points.length - 1) {
            nextPoint = points[index + 1];
        }
        else {
            nextPoint = points[0];
        }
        let distanceToLineItem = distanceToLine(x, y, point.x, point.y, nextPoint.x, nextPoint.y);
        if (distanceToLineItem < closestDistance) {
            closestDistance = distanceToLineItem;
            indexOfClosestLine = index;
        }
    }
    return indexOfClosestLine;
}



function distanceToLine(x, y, x1, y1, x2, y2) {
    let A = x - x1;
    let B = y - y1;
    let C = x2 - x1;
    let D = y2 - y1;

    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) { //in case of 0 length line
        param = dot / len_sq;
    }

    let xx;
    let yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    }
    else if (param > 1) {
        xx = x2;
        yy = y2;
    }
    else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    let dx = x - xx;
    let dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function processRegionMouseEvent(offsetX, offsetY, isMouseMoveEvent) {
    if (regionEditor.selectedRegionIndex < 0 || regionEditor.selectedRegionIndex >= regionEditor.regions.length) {
        return;
    }
    let region = regionEditor.regions[regionEditor.selectedRegionIndex];
    let dragX = Math.max(-200, Math.round(offsetX / regionEditor.imageScale));
    let dragY = Math.max(-200, Math.round(offsetY / regionEditor.imageScale));
    if (activeTool == 'look') {
        return;//nothing to do
    }
    else if (!isMouseMoveEvent && activeTool == 'select') {
        if (regionEditor.regions.length == 2) {
            changeRegionNext(true);
        }
        else if (regionEditor.regions.length > 2) {
            //todo find closest region that isn't this one.
            let indexOfClosestRegion = findIndexOfClosestRegion(dragX, dragY, [regionEditor.selectedRegionIndex]);//ignore the current region.
            if (indexOfClosestRegion == -1) {
                console.log('no other regions found')
                changeRegionNext(true);
            }
            else {
                setRegionIndex(indexOfClosestRegion);
            }


        }

    }
    else if (isMouseMoveEvent && activeTool == 'move') {
        moveRegionAbsolute(dragX, dragY);
    }
    else if (region.type == 'polygon') {
        if (!isMouseMoveEvent && activeTool == 'pointadd') {
            let indexOfClosestPoint = findIndexOfClosestPolygonLine(dragX, dragY, region.points);
            if (indexOfClosestPoint > -1) {
                let point = { "x": dragX, "y": dragY };
                let insertIndex = indexOfClosestPoint + 1;
                region.points.splice(insertIndex, 0, point);
                selectedPointIndex = insertIndex;
                activeTool = 'pointmove';
                recalcEditor();
                addRegionHistory('add point to ' + region.type, regionEditor.selectedRegionIndex, true);//force this
            }

        }
        else if (!isMouseMoveEvent && activeTool == 'pointdelete') {
            if (region.points.length > 3) {
                let indexOfClosestPoint = findIndexOfClosestPoint(dragX, dragY, region.points, []);
                if (indexOfClosestPoint > -1) {
                    region.points.splice(indexOfClosestPoint, 1);
                    recalcEditor();
                    addRegionHistory('remove point from ' + region.type, regionEditor.selectedRegionIndex, true);//force this
                }
            }
        }
        else if (activeTool == 'pointmove') {
            if (!isMouseMoveEvent) {
                let indexOfClosestPoint = findIndexOfClosestPoint(dragX, dragY, region.points, []);
                if (indexOfClosestPoint > -1) {
                    selectedPointIndex = indexOfClosestPoint;
                }
                else {
                    return;
                }
            }
            if (selectedPointIndex > -1 && selectedPointIndex < region.points.length) {
                region.points[selectedPointIndex].x = dragX;
                region.points[selectedPointIndex].y = dragY;
                recalcEditor();
                addRegionHistory('move point in ' + region.type + 'pt:' + selectedPointIndex, regionEditor.selectedRegionIndex, false);
            }
        }
    }
}

function getMapIndex(offsetX, offsetY) {
    let realX = Math.max(0, Math.round(offsetX / regionEditor.imageScale));
    let realY = Math.max(0, Math.round(offsetY / regionEditor.imageScale));
    let myIndex = realX + (realY * regionEditor.imageNativeWidth);
    return myIndex;
}

function setDefaultDistance() {
    if (selectedDistance == null) {
        return;
    }
    for (let i = 0; i < distanceMap.length; i++) {
        if (distanceMap[i] == null) {
            distanceMap[i] = selectedDistance;
        }
    }
    hideTips();
    recalcEditor();
}

function processDistanceMouseEvent(offsetX, offsetY, isMouseMoveEvent) {

    if (activeTool == 'sample') {
        if (!isMouseMoveEvent) {
            let myIndex = getMapIndex(offsetX, offsetY);
            if (myIndex >= 0 && myIndex < distanceMap.length) {
                let distance = distanceMap[myIndex];
                if (distance != null) {
                    changeDistance(distance);

                }
            }


        }
    }
    else if (activeTool == 'fill') {
        //todo we really only want to do this on touch up
        if (selectedDistance == null) {
            return;
        }
        let pts = getNativePoint(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally);
        let realX = pts[0];
        let realY = pts[1];

        let indexes = getFillIndexesToChange(tempsCelsius, distanceMap, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, realX, realY, fillRange, false);

        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            if (index < distanceMap.length && index >= 0) {
                distanceMap[index] = selectedDistance;

            }
            else {
                console.error('index out of bounds: ' + index);
            }

        }
        recalcEditor();
        addMetaHistory('fill distance', true);


    }
    else if (activeTool == 'change') {
        if (selectedDistance == null) {
            return;
        }

        let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally, false, 1);
        if (indexes.length == 0) {
            return;
        }
        let index = indexes[0];
        console.log('distance is' + selectedDistance);
        if (index < distanceMap.length && index >= 0) {
            let foundDistance = distanceMap[index];
            if (foundDistance == null) {
                return;
            }
            for (let i = 0; i < distanceMap.length; i++) {
                let distance = distanceMap[i];
                if (distance == null) {
                    continue;
                }
                if (distance == foundDistance) {
                    distanceMap[i] = selectedDistance;
                }
            }
            recalcEditor();
            addMetaHistory('change distance', true);
        }

    }
    else if (activeTool == 'paintround' || activeTool == 'paintsquare') {
        let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, paintBrushSize);
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            if (index < distanceMap.length && index >= 0) {
                distanceMap[index] = selectedDistance;
            }
        }
        recalcEditor();
        addMetaHistory(activeTool + ' distance', false);
    }
    else if (activeTool == 'eraseround' || activeTool == 'erasesquare') {
        let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, eraseBrushSize);
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            if (index < distanceMap.length && index >= 0) {
                distanceMap[index] = null;
            }
        }
        recalcEditor();
        addMetaHistory(activeTool + ' distance', false);
    }
}

function setDefaultMaterial() {
    if (selectedMaterial == null || selectedMaterial.name == null || selectedMaterial.emissivity == null) {
        return;
    }
    for (let i = 0; i < materialMap.length; i++) {
        let material = materialMap[i];
        if (material == null || material.name == null || material.emissivity == null) {
            materialMap[i] = { "name": selectedMaterial.name, "emissivity": selectedMaterial.emissivity };
        }
    }
    hideTips();
    recalcEditor();

}

function processMaterialMouseEvent(offsetX, offsetY, isMouseMoveEvent) {

    if (activeTool == 'sample') {
        if (!isMouseMoveEvent) {
            let myIndex = getMapIndex(offsetX, offsetY);

            if (myIndex >= 0 && myIndex < materialMap.length) {
                let material = materialMap[myIndex];
                if (material != null) {
                    changeMaterial(material);

                }
            }
        }
    }
    else if (activeTool == 'fill') {

        if (selectedMaterial == null) {
            return;
        }
        let pts = getNativePoint(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally);
        let realX = pts[0];
        let realY = pts[1];
        let indexes = getFillIndexesToChange(tempsCelsius, materialMap, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, realX, realY, fillRange, true);

        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            if (index < materialMap.length && index >= 0) {
                materialMap[index] = { "name": selectedMaterial.name, "emissivity": selectedMaterial.emissivity };

            }
            else {
                console.error('index out of bounds: ' + index);
            }

        }
        recalcEditor();
        
        addMetaHistory('fill material', true);



    }
    else if (activeTool == 'change') {

        if (selectedMaterial == null || selectedMaterial.name == null || selectedMaterial.emissivity == null) {
            return;
        }

        let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally, false, 1);
        if (indexes.length == 0) {
            return;
        }
        let index = indexes[0];
        if (index < materialMap.length && index >= 0) {
            let foundMaterial = materialMap[index];
            if (foundMaterial == null || foundMaterial.name == null || foundMaterial.emissivity == null) {
                return;
            }
            for (let i = 0; i < materialMap.length; i++) {
                let material = materialMap[i];
                if (material == null || material.name == null || material.emissivity == null) {
                    continue;
                }
                if (material.name.toLowerCase() == foundMaterial.name.toLowerCase() && material.emissivity == foundMaterial.emissivity) {
                    materialMap[i] = { "name": selectedMaterial.name, "emissivity": selectedMaterial.emissivity };
                }
            }
            recalcEditor();
            addMetaHistory('change material', true);
        }
    }
    else if (activeTool == 'paintround' || activeTool == 'paintsquare') {
        if (selectedMaterial == null || selectedMaterial.name == null || selectedMaterial.emissivity == null) {
            return;
        }
        let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, paintBrushSize);
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            if (index < materialMap.length && index >= 0) {
                if (selectedMaterial == null) {
                    materialMap[index] = null;
                }
                else {
                    materialMap[index] = { "name": selectedMaterial.name, "emissivity": selectedMaterial.emissivity };//todo this should be the current material
                }
            }
        }
        recalcEditor();
        addMetaHistory(activeTool + ' material', false);
    }
    else if (activeTool == 'eraseround' || activeTool == 'erasesquare') {
        let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, regionEditor.imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, eraseBrushSize);
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            if (index < materialMap.length && index >= 0) {
                materialMap[index] = null;
            }
        }
        recalcEditor();
        addMetaHistory(activeTool + ' material', false);
    }


}

function getNativePoint(offsetX, offsetY, imageNativeWidth, imageNativeHeight, imageRotation, imageScale, imageMirrorHorizontally) {
    let realX = Math.max(0, Math.round(offsetX / imageScale));
    let realY = Math.max(0, Math.round(offsetY / imageScale));
    let pts = [0, 0];
    if (imageRotation == 0) {
        if (imageMirrorHorizontally) {
            realX = imageNativeWidth - realX - 1;
        }
        pts[0] = realX;
        pts[1] = realY;
    }
    else if (imageRotation == 90) {
        if (imageMirrorHorizontally) {
            realX = imageNativeHeight - realX - 1;
        }
        pts[0] = realY;
        pts[1] = imageNativeHeight - realX;


    }
    else if (imageRotation == 180) {
        if (imageMirrorHorizontally) {
            realX = imageNativeWidth - realX - 1;
        }
        pts[0] = regionEditor.imageNativeWidth - realX;
        pts[1] = regionEditor.imageNativeHeight - realY;
    }
    else if (imageRotation == 270) {
        if (imageMirrorHorizontally) {
            realX = imageNativeHeight - realX - 1;
        }
        pts[0] = imageNativeWidth - realY;
        pts[1] = realX;
    }
    else {
        console.error('unknown rotation');

    }
    pts[0] = Math.max(0, Math.min(imageNativeWidth - 1, pts[0]));
    pts[1] = Math.max(0, Math.min(imageNativeHeight - 1, pts[1]));
    return pts;
}







function getFillIndexesToChange(mapTemperatures, map2, width, height, startX, startY, threshold, isMaterial) {

    let newPixel = -1;

    let startIndex = getIndexOfMapFromXY(startX, startY, 0, false);

    let point = getPointFromIndex(startIndex, width, height);
    if (point[0] != startX || point[1] != startY) {
        console.error('point not correct. indexOf:' + startIndex + ' point:' + point[0] + ' ' + point[1] + ' is not the expected: ' + startX + ' ' + startY);
    }


    let startTemperature = mapTemperatures[startIndex];
    let existingStringifiedItem = JSON.stringify(map2[startIndex]);


    // Create a new array that will store the pixels that should be changed
    let newPixels = JSON.parse(JSON.stringify(mapTemperatures)); // Copying by value

    // Create a queue that will store the pixels that need to be checked for similarity
    let queue = [];
    let checked = [];

    // Enqueue the starting pixel
    queue.push(startIndex);

    // Create a loop that will iterate until the queue is empty
    while (queue.length > 0) {
        // Dequeue a pixel from the queue and store it in a variable
        let currentIndex = queue.shift();
        let currentTemperature = mapTemperatures[currentIndex];


        let pt = getPointFromIndex(currentIndex, width, height);
        let currentX = pt[0];
        let currentY = pt[1];

        // Calculate the color distance between this pixel and the starting pixel using Euclidean distance
        let distance = Math.sqrt(Math.pow(currentTemperature - startTemperature, 2));

        /*
        var distance = Math.sqrt(
            Math.pow(currentColor[0] - startColor[0], 2) +
            Math.pow(currentColor[1] - startColor[1], 2) +
            Math.pow(currentColor[2] - startColor[2], 2)
        );
        */

        // If the color distance is less than or equal to your threshold value, then do the following:
        if (distance <= threshold) {
            // Mark this pixel as visited by setting its value in the new array to newColor
            newPixels[currentIndex] = newPixel;

            // Enqueue the adjacent pixels of this pixel (up, down, left, right) to the queue,
            // if they are within the bounds of the array and have not been visited before


            if (currentX > 0) {// && newPixels[currentX - 1][currentY] != newColor) {
                // Left
                let checkX = currentX - 1;
                let checkY = currentY
                let indexOfAdjacent = getIndexOfMapFromXY(checkX, checkY, 0, false);
                if (newPixels[indexOfAdjacent] != newPixel && JSON.stringify(map2[indexOfAdjacent]) == existingStringifiedItem) {
                    if (checked.indexOf(indexOfAdjacent) == -1) {
                        checked.push(indexOfAdjacent);
                        queue.push(indexOfAdjacent);
                    }
                }
            }
            if (currentX < width - 1) {// && newPixels[currentX + 1][currentY] != newColor) {
                // Right
                let indexOfAdjacent = getIndexOfMapFromXY(currentX + 1, currentY, 0, false);
                if (newPixels[indexOfAdjacent] != newPixel && JSON.stringify(map2[indexOfAdjacent]) == existingStringifiedItem) {
                    if (checked.indexOf(indexOfAdjacent) == -1) {
                        checked.push(indexOfAdjacent);
                        queue.push(indexOfAdjacent);
                    }
                }
            }

            if (currentY > 0) {// && newPixels[currentX][currentY - 1] != newColor) {
                // Up
                let indexOfAdjacent = getIndexOfMapFromXY(currentX, currentY - 1, 0, false);
                if (newPixels[indexOfAdjacent] != newPixel && JSON.stringify(map2[indexOfAdjacent]) == existingStringifiedItem) {
                    if (checked.indexOf(indexOfAdjacent) == -1) {
                        checked.push(indexOfAdjacent);
                        queue.push(indexOfAdjacent);
                    }
                }
            }

            if (currentY < height - 1) {
                // Down
                let indexOfAdjacent = getIndexOfMapFromXY(currentX, currentY + 1, 0, false);
                if (newPixels[indexOfAdjacent] != newPixel && JSON.stringify(map2[indexOfAdjacent]) == existingStringifiedItem) {
                    if (checked.indexOf(indexOfAdjacent) == -1) {
                        checked.push(indexOfAdjacent);
                        queue.push(indexOfAdjacent);
                    }
                }
            }

        }
    }

    // Return the new array of pixels that should be changed by the fill operation
    let indexes = [];
    for (let i = 0; i < newPixels.length; i++) {
        if (newPixels[i] === newPixel) {
            indexes.push(i);
        }
    }
    return indexes;

    // return newPixels;
}


function getPaintIndexes(offsetX, offsetY, imageNativeWidth, imageNativeHeight, imageRotation, imageScale, imageMirrorHorizontally, isRound, selBrushSize) {
    let pts = getNativePoint(offsetX, offsetY, imageNativeWidth, imageNativeHeight, imageRotation, imageScale, imageMirrorHorizontally);
    let realX = pts[0];
    let realY = pts[1];
    let myRotation = 0



    if (isRound) {
        let indexes = [];
        for (let x = realX - selBrushSize; x < realX + selBrushSize; x++) {
            if (x < 0 || x >= imageNativeWidth) {
                continue;
            }

            for (let y = realY - selBrushSize; y < realY + selBrushSize; y++) {
                if (y < 0 || y >= imageNativeHeight) {
                    continue;
                }
                let distanceItem = Math.sqrt(Math.pow(x - realX, 2) + Math.pow(y - realY, 2));
                if (distanceItem < selBrushSize) {
                    let index = getIndexOfMapFromXY(x, y, myRotation, false);

                    indexes.push(index);
                }
            }
        }
        return indexes;
    }
    else {
        let indexes = [];


        let myBrushSize = selBrushSize;
        if (myBrushSize == 1) {
            let index = getIndexOfMapFromXY(realX, realY, myRotation, false);
            if (index > -1) {
                indexes.push(index);
            }
            return indexes;
        }
        else {
            myBrushSize -= 1;
        }

        for (let x = realX - myBrushSize; x < realX + myBrushSize; x++) {
            if (x < 0 || x >= imageNativeWidth) {
                continue;
            }
            for (let y = realY - myBrushSize; y < realY + myBrushSize; y++) {
                if (y < 0 || y >= imageNativeHeight) {
                    continue;
                }
                let index = getIndexOfMapFromXY(x, y, myRotation, false);
                indexes.push(index);

            }
        }
        return indexes;
    }


}

function processScreenTouchCoordinates(offsetX, offsetY, isMouseMoveEvent) {
    if (activeLayer == 'Region') {
        processRegionMouseEvent(offsetX, offsetY, isMouseMoveEvent);
    }
    else if (activeLayer == 'Dist') {
        processDistanceMouseEvent(offsetX, offsetY, isMouseMoveEvent);
    }
    else if (activeLayer == 'Matl') {
        processMaterialMouseEvent(offsetX, offsetY, isMouseMoveEvent);
    }
}

function displayImageTemps() {
    let arraySize = (regionEditor.imageNativeHeight * regionEditor.imageNativeWidth);
    let points = new Array(arraySize);

    let index = -1;
    for (let x = 0; x < regionEditor.imageNativeWidth; x++) {
        for (let y = 0; y < regionEditor.imageNativeHeight; y++) {
            index++;
            points[index] = { "x": x, "y": y };

        }
    }



    let regionTemps = getTempsFromPointsOnCanvas(points);

    document.getElementById("valImageHighTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, false) + '&deg;C';
    document.getElementById("valImageHighTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, true) + '&deg;F';
    document.getElementById("valImageLowTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, false) + '&deg;C';
    document.getElementById("valImageLowTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, true) + '&deg;F';

    tempRanges.highCelsius = regionTemps.highCelsius;
    tempRanges.lowCelsius = regionTemps.lowCelsius;

}


function getRGBAFromCanvasData(data, imageWidth, x, y) {

    let index = (x + (y * imageWidth)) * 4;
    let r = data[index];
    let g = data[index + 1];
    let b = data[index + 2];
    let a = data[index + 3];
    return `rgba(${r},${g},${b},1)`;

}



function clearStoredImageData() {
    //console.log('clearing stored image data');
    storedImageData = null;
    storedImageRotation = null;
    storedImageWidth = null;
    storedImageHeight = null;
    storedImageMirrorHorizontally = null;
    hideTips();//this is now invalid.
}

function drawTipMagnifier(x, y) {

    let regionEditorImageRef = document.getElementById('regionEditorImage');
    const tipmagnifier = document.getElementById('tipmagnifier');
    const magnifierCanvas = document.getElementById('magnifierCanvas');



    if (storedImageData == null || storedImageRotation != regionEditor.imageRotation || storedImageMirrorHorizontally != regionEditor.imageMirrorHorizontally) {
        //console.log('Drawing A new magnifier with new image');
        let dummyCanvas = document.createElement('canvas');
        let ctxSource = dummyCanvas.getContext('2d');//, {willReadFrequently: true});
        if (regionEditor.imageRotation == 90 || regionEditor.imageRotation == 270) {
            dummyCanvas.width = regionEditor.imageNativeHeight;
            dummyCanvas.height = regionEditor.imageNativeWidth;
        }
        else {
            dummyCanvas.width = regionEditor.imageNativeWidth;
            dummyCanvas.height = regionEditor.imageNativeHeight;
        }
        storedImageWidth = dummyCanvas.width;
        storedImageHeight = dummyCanvas.height;
        storedImageMirrorHorizontally = regionEditor.imageMirrorHorizontally;

        ctxSource.drawImage(regionEditorImageRef, 0, 0, dummyCanvas.width, dummyCanvas.height);
        storedImageData = ctxSource.getImageData(0, 0, dummyCanvas.width, dummyCanvas.height).data;
        storedImageRotation = regionEditor.imageRotation;
    }

    let ctx = magnifierCanvas.getContext('2d');
    ctx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);


    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'black'
    ctx.ellipse(100, 100, 75, 75, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.restore();


    let pixelList = [];
    let pixelDist = 9;




    for (let pointx = x - pixelDist; pointx < x + pixelDist; pointx++) {
        for (let pointy = y - pixelDist; pointy < y + pixelDist; pointy++) {
            let rgba = "white";
            if (pointx < 0 || pointy < 0 || pointx > storedImageWidth - 1 || pointy > storedImageHeight - 1) {
                rgba = "white";

            }
            else {
                //90 90 is the center pixel of the magnifier.

                rgba = getRGBAFromCanvasData(storedImageData, storedImageWidth, pointx, pointy);
                //console.log('pointx:' + pointx + ' pointy:' + pointy + ' rgba:' + rgba);
            }

            let magX = 90 + ((pointx - x) * 10);
            let magY = 90 + ((pointy - y) * 10);
            let pixel = { "x": magX, "y": magY, "color": rgba }
            pixelList.push(pixel);
            //rgba == "orange" ? rgba = "cyan" : rgba = "orange";
        }
    }




    drawPixels(ctx, 10, pixelList);

    drawLines(ctx, 1, "green", [
        { "x": 0, "y": 30, "length": 200 },
        { "x": 0, "y": 40, "length": 200 },
        { "x": 0, "y": 50, "length": 200 },
        { "x": 0, "y": 60, "length": 200 },
        { "x": 0, "y": 70, "length": 200 },
        { "x": 0, "y": 80, "length": 200 },
        { "x": 0, "y": 90, "length": 200 },
        { "x": 0, "y": 110, "length": 200 },
        { "x": 0, "y": 120, "length": 200 },
        { "x": 0, "y": 130, "length": 200 },
        { "x": 0, "y": 140, "length": 200 },
        { "x": 0, "y": 150, "length": 200 },
        { "x": 0, "y": 160, "length": 200 },
        { "x": 0, "y": 170, "length": 120 },//some reason this wasn't clipping this one so reduced the length

    ], false);//horizontal

    drawLines(ctx, 1, "green", [
        { "x": 30, "y": 0, "length": 200 },
        { "x": 40, "y": 0, "length": 200 },
        { "x": 50, "y": 0, "length": 200 },
        { "x": 60, "y": 0, "length": 200 },
        { "x": 70, "y": 0, "length": 200 },
        { "x": 80, "y": 0, "length": 200 },
        { "x": 90, "y": 0, "length": 200 },
        { "x": 110, "y": 0, "length": 200 },
        { "x": 120, "y": 0, "length": 200 },
        { "x": 130, "y": 0, "length": 200 },
        { "x": 140, "y": 0, "length": 200 },
        { "x": 150, "y": 0, "length": 200 },
        { "x": 160, "y": 0, "length": 200 },
        { "x": 170, "y": 0, "length": 200 },

    ], true);//horizontal 


    drawLines(ctx, 1, "gold", [{ "x": 0, "y": 100, "length": 200 }], false);//horizontal
    drawLines(ctx, 1, "gold", [{ "x": 100, "y": 0, "length": 200 }], true);//vertical


    drawHotSpot(ctx, 90, 90, 10, 2);
    showTips();
}

function drawHotSpot(ctx, x, y, width, lineWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'red'
    ctx.lineWidth = lineWidth;
    ctx.rect(x, y, width, width, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

function drawPixels(ctx, width, points) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 73, 0, Math.PI * 2, true);
    ctx.clip();
    //ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        let point = points[i];
        ctx.fillStyle = point.color;
        ctx.rect(point.x, point.y, width, width);
        ctx.fill();
        ctx.closePath();
    }

    ctx.restore();
}

function drawLines(ctx, lineWidth, strokeStyle, lineInfos, isVertical) {
    ctx.save();

    ctx.arc(100, 100, 73, 0, Math.PI * 2, true);
    ctx.clip();
    for (let i = 0; i < lineInfos.length; i++) {
        ctx.beginPath();
        let lineInfo = lineInfos[i];

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = '';
        ctx.moveTo(lineInfo.x, lineInfo.y);
        if (isVertical) {
            ctx.lineTo(lineInfo.x, lineInfo.y + lineInfo.length);
        }
        else {
            ctx.lineTo(lineInfo.x + lineInfo.length, lineInfo.y);
        }
        ctx.stroke();
        ctx.closePath();

    }

    ctx.restore();

}

function placeMagnifier(offsetX, offsetY, pageX, pageY, isTouchEvent, isLeftMouseDown) {
    //const image = document.querySelector('#regionEditorImage');
    const tooltip = document.getElementById('tooltip');
    const tipmagnifier = document.getElementById('tipmagnifier');
    const tiptarget = document.getElementById('tiptarget');
    let x = Math.max(0, Math.round(offsetX / regionEditor.imageScale));
    let y = Math.max(0, Math.round(offsetY / regionEditor.imageScale));
    let indexMap = -1;
    let posX = -1;
    let posY = -1;

    let placementOffsetX = 0;
    let placementOffsetY = 0;
    let magOffsetX = pageX - 100;
    let magOffsetY = pageY - 100;

    if (regionEditor.imageScale > 2 && offsetX > regionEditor.imageWidth / 2) {
        placementOffsetX -= 256;//bottom left x
        magOffsetX -= 340;
    }
    else {
        placementOffsetX += 50;//left side
        magOffsetX += 340;
    }

    if (offsetY > regionEditor.imageHeight / 2) {
        placementOffsetY -= 120;
        magOffsetY -= 80;
    }
    else {
        placementOffsetY += 20;
        magOffsetY += 80;
    }

    if (activeTool == 'paintsquare' || activeTool == 'erasesquare') {
        let myBrushSize = activeTool == 'paintsquare' ? paintBrushSize : eraseBrushSize;
        let width = (myBrushSize * regionEditor.imageScale) * 2;
        let posOffSetX = (myBrushSize * regionEditor.imageScale);
        let posOffSetY = (myBrushSize * regionEditor.imageScale);
        if (myBrushSize == 1) {
            posOffSetY += 8;
        }

        tiptarget.innerHTML = `<svg width="${width + 2}" height="${width + 2}" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width}" height="${width}" stroke="red" stroke-width="2" /></svg>`;
        tiptarget.style.top = `${pageY - posOffSetY}px`;
        tiptarget.style.left = `${pageX - posOffSetX}px`;
    }
    else if (activeTool == 'paintround' || activeTool == 'eraseround') {
        let myBrushSize = activeTool == 'paintround' ? paintBrushSize : eraseBrushSize;
        let width = (myBrushSize * regionEditor.imageScale) * 2;
        let posOffSetX = (myBrushSize * regionEditor.imageScale);
        let posOffSetY = (myBrushSize * regionEditor.imageScale);
        if (myBrushSize == 1) {
            posOffSetY += 8;
        }
        tiptarget.innerHTML = `<svg width="${width + 2}" height="${width + 2}" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="${width / 2 + 1}" cy="${width / 2 + 1}" r="${width / 2}" stroke="red" stroke-width="2" /></svg>`;
        tiptarget.style.top = `${pageY - posOffSetY}px`;
        tiptarget.style.left = `${pageX - posOffSetX}px`;
    }
    else {
        tiptarget.innerHTML = `<svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="7" width="12" height="12" stroke="red" stroke-width="2" /></svg>`;
        tiptarget.style.top = `${pageY - 12}px`;
        tiptarget.style.left = `${pageX - 12}px`;
    }

    tooltip.style.top = `${pageY + placementOffsetY}px`;
    tooltip.style.left = `${pageX + placementOffsetX}px`;


    tipmagnifier.style.top = `${magOffsetY}px`;
    tipmagnifier.style.left = `${magOffsetX}px`;

    if (regionEditor.imageRotation == 0) {
        posX = Math.min(x, regionEditor.imageNativeWidth - 1);
        posY = Math.min(y, regionEditor.imageNativeHeight - 1);

    }
    else if (regionEditor.imageRotation == 180) {
        posX = Math.min(x, regionEditor.imageNativeWidth - 1);
        posY = Math.min(y, regionEditor.imageNativeHeight - 1);

    }
    else if (regionEditor.imageRotation == 90) {
        posX = Math.min(x, regionEditor.imageNativeHeight - 1);
        posY = Math.min(y, regionEditor.imageNativeWidth - 1);

    }
    else if (regionEditor.imageRotation == 270) {
        posX = Math.min(x, regionEditor.imageNativeHeight - 1);
        posY = Math.min(y, regionEditor.imageNativeWidth - 1);

    }
    else {
        console.error('unsupported rotation: ' + regionEditor.imageRotation);
        tooltip.textContent = 'unsupported rotation: ' + regionEditor.imageRotation;
        return;
    }

    drawTipMagnifier(posX, posY);


    indexMap = getIndexOfMapFromXY(posX, posY, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally);//this is x and y of the image rotated

    //Emissivity is defined as the ratio of the energy radiated from a material's surface to that radiated from a perfect emitter, 
    //known as a blackbody, at the same temperature and wavelength and under the same viewing conditions. 
    //It is a dimensionless number between 0 (for a perfect reflector) and 1 (for a perfect emitter).
    let distanceText = "Not Defined";
    let materialText = "Not Defined";
    let emissivityText = "Not Defined";


    let distanceMeters = null;
    let materialEmissivity = null;
    let adjTempC = null;

    if (indexMap >= 0 && indexMap < distanceMap.length) {
        let distance = distanceMap[indexMap];
        if (distance != null) {
            distanceMeters = distance;
            distanceText = distance.toFixed(2) + 'm&nbsp;' + metersToInches(distance).toFixed(1) + 'in';
        }
    }
    else {
        console.error('distance index out of bounds');
    }

    if (indexMap >= 0 && indexMap < materialMap.length) {
        let material = materialMap[indexMap];
        if (material != null) {
            materialEmissivity = material.emissivity;
            materialText = material.name;
            emissivityText = material.emissivity.toFixed(2);
        }
    }
    else {
        console.error('material index out of bounds');
    }


    if (indexMap > -1 && indexMap < tempsCelsius.length) {
        let tempC = tempsCelsius[indexMap];
        if (tempC != null && distanceMeters != null && materialEmissivity != null) {

            let ambientTempC = tempC;
            adjTempC = getAdjustedTempInCelsius(tempC, ambientTempC, distanceMeters, materialEmissivity);

        }

        let strMaterialColor = 'gray';
        let strDistanceColor = 'gray';

        if (activeLayer == 'Matl') {
            strMaterialColor = 'white';
        }
        else if (activeLayer == 'Dist') {
            strDistanceColor = 'white';
        }


        //index:${indexMap}
        tooltip.innerHTML = `<span style="white-space:nowrap;font-size:13px;color:gray">X: ${posX}, Y: ${posY}</span><br/>` +
            `<span style="white-space:nowrap;font-size:13px;color:gray">Raw Temp: ${getDisplayTempFromCelsius(tempC, false)}&deg;C&nbsp;${getDisplayTempFromCelsius(tempC, true)}&deg;F</span><br/>` +
            `<span style="white-space:nowrap;font-size:13px;color:${strDistanceColor}">Distance: ${distanceText}</span><br/>` +
            `<span style="white-space:nowrap;font-size:13px;color:${strMaterialColor}">Matl:&nbsp;</span><span style="white-space:nowrap;font-size:12px;width:100px;text-overflow: ellipsis;overflow: hidden;color:${strMaterialColor}">${materialText}</span><br/>` +
            `<span style="white-space:nowrap;font-size:13px;color:${strMaterialColor}">Emissivity: ${emissivityText}</span><br/>` +
            `<span style="white-space:nowrap;font-size:13px;color:gray">Adj Temp:${getDisplayTempFromCelsius(adjTempC, false)}&deg;C&nbsp;${getDisplayTempFromCelsius(adjTempC, true)}&deg;F</span>`;

    }
    else {
        console.error('invalid indexTempC: ' + indexMap);
        tooltip.innerHTML = `X: ${posX}, Y: ${posY}<br/>`;
    }
}

function pointerMove(offsetX, offsetY, pageX, pageY, isTouchEvent, isLeftMouseDown) {
    if (isLeftMouseDown) {
        processScreenTouchCoordinates(offsetX, offsetY, true);

    }
    placeMagnifier(offsetX, offsetY, pageX, pageY, isTouchEvent, isLeftMouseDown);
}



function getAdjustedTempInCelsius(temperatureInCelsius, ambientTemperatureInCelsius, distanceMeters, emissivity) {
    const cameraFixedEmissivity = .95;
    const cameraFixedDistanceMeters = .25;
    const cameraFixedAmbientTemperatureInCelsius = 25;

    //The lower the emissivity the more we need to raise the temperature;
    //we shouldn't let them use an emissivity less than .5 as it can't be reliably measured.
    //20C * (.95/.95) = 20C
    ///20C * (.95/.5) = 40C
    let adjEmissivityTemp = temperatureInCelsius * (cameraFixedEmissivity / emissivity);


    //increase the temperature the longer the distance
    //1.0 meters = 0.00510204081632653
    //5 meters = 0.12755102040816327
    //10 meters = 0.510204081632653
    //100 meters = 51.0204081632653
    //1 meter 37C + 37C * 0.005 = 37.185C
    //5 meters 37C + 37C * 0.127 = 41.399C
    //10 meters 37C + 37C * 0.51 = 55.87C
    let adjDistanceTemp = adjEmissivityTemp + (adjEmissivityTemp * Math.pow((distanceMeters / 14), 2));

    return adjDistanceTemp;
}



function isTouchEventWithElement(element, e) {

    const item = e.changedTouches.item(0);
    if (element === null || item === null) return false;
    return element.getBoundingClientRect().right > item.clientX &&
        element.getBoundingClientRect().left < item.clientX &&
        element.getBoundingClientRect().top < item.clientY &&
        element.getBoundingClientRect().bottom > item.clientY;
}

function getEmptyRegionEditor() {
    return {
        "imageAlarmThresh": { "loPriority": 1, "hiPriority": 1, "loTempC": null, "hiTempC": null },
        "imageRotation": 0,
        "imageFilter": "none",
        "imageMirrorHorizontally": false,
        "maxNameLength": 16,
        "imageNativeWidth": 256,
        "imageNativeHeight": 192,
        "imageWidth": 256,
        "imageHeight": 192,
        "imageScale": 1.0,
        "regions": [],
        "selectedRegionIndex": -1
    };
}

let doEditing = false;
function go() {
    hideEverything();
    setupEvents();
    let image = document.getElementById('regionEditorImageRef');
    image.onload = function () {
        cameraChangedImageLoaded(cameraEditor.selectedCameraIndex, doEditing);
    };
    refreshCameras();


}

function refreshCameras() {
    hideEverything();
    let strUrl = '/test_api_calls/test_getCams.json';
    let urlPrefix = '';
    //check if the site is on github pages, if so, we need to prefix the url with the github repo name.
    if (location.href.indexOf('github.io') > -1) {
        //when hosted on github pages, we have to make json calls and image calls with this prefix.
        urlPrefix = 'https://raw.githubusercontent.com/ie-corp/ThermalDemo/main';
    }
    console.log('fetching cameras from: ' + urlPrefix + strUrl);
    fetch(urlPrefix + strUrl)
        .then(response => {
            if (!response.ok) {
                //console.log('not found');
                this.apiGetCamerasReceived(urlPrefix, { "cameras": [] });
            }
            return response.json();
        })
        .then(json => {

            this.apiGetCamerasReceived(urlPrefix, json);
        })
        .catch(function () {
            //console.error('catch fetch');
            this.apiGetCamerasReceived(urlPrefix, { "cameras": [] });
        })
}

function apiGetCamerasReceived(urlPrefix, jsonResult) {
    console.log('loading cameras')
    hideEverything();
    document.getElementById('mainEditor').style.display = 'block';
    let cameras = [];
    if (jsonResult != null && jsonResult.cameras != null) {
        for (let i = 0; i < jsonResult.cameras.length; i++) {
            let camera = jsonResult.cameras[i];
            let newCamera = {
                "usbId": camera.usbId,
                "name": ((camera.name ?? unknownCameraName).trim()),
                "rotation": camera.rotation,
                "url": (camera.url != null && camera.url != "") ? (urlPrefix + camera.url) : null,
                "isOnline": camera.isOnline,
                "isKnown": camera.isKnown,
                "config": null
            };
            cameras.push(newCamera);
        }
    }
    cameraEditor.cameras = cameras;
    changeCamera(cameraEditor.selectedCameraIndex, false);
}

function hideUI() {
    document.getElementById('cameraTools').style.display = 'none';
    document.getElementById('cameraEditTools').style.display = 'none';
    document.getElementById('imageTools').style.display = 'none';
    document.getElementById('rowRegionTools').style.display = 'none';
    document.getElementById('rowMaterialTools').style.display = 'none';
    document.getElementById('rowDistanceTools').style.display = 'none';
    document.getElementById('touchTools').style.display = 'none';
    document.getElementById('threshwindow').style.display = 'none';

}

function showUI() {
    if (cameraEditor.isEditing) {
        document.getElementById('cameraEditTools').style.display = '';
    }
    else {
        document.getElementById('cameraTools').style.display = '';
    }
    document.getElementById('imageTools').style.display = '';
    document.getElementById('touchTools').style.display = '';



}

function deleteCamera() {
    //todo prompt for confirm or tap again to confirm

    cameraEditor.cameras[cameraEditor.selectedCameraIndex].name = unknownCameraName;
    cameraEditor.cameras[cameraEditor.selectedCameraIndex].isSpecified = false;
    changeCamera(cameraEditor.selectedCameraIndex, false);
}

function cancelCameraEdit() {
    //todo prompt for confirm or tap again to confirm

    changeCamera(cameraEditor.selectedCameraIndex, false);
}



function saveCamera() {
    let cameraIndex = cameraEditor.selectedCameraIndex;
    //todo get staged name
    if (stagedUpdateCameraName != null) {
        cameraEditor.cameras[cameraEditor.selectedCameraIndex].name = stagedUpdateCameraName;
        stagedUpdateCameraName = null;
    }
    else {
        if (cameraEditor.cameras[cameraEditor.selectedCameraIndex].name == unknownCameraName || cameraEditor.cameras[cameraEditor.selectedCameraIndex].name == null) {
            alert('Please rename the camera before saving it.');
            return;
        }
    }
    cameraEditor.cameras[cameraEditor.selectedCameraIndex].config = JSON.parse(JSON.stringify(regionEditor));
    changeCamera(cameraIndex, false);
}

let stagedUpdateCameraName = null;
function renameCamera(cameraIndex) {
    cameraEditor.selectedCameraIndex = cameraIndex;
    let oldCamName = cameraEditor.cameras[cameraEditor.selectedCameraIndex].name;
    if (oldCamName == null || oldCamName.indexOf("-") > -1) {
        oldCamName = "";
    }
    let newName = prompt("Please enter a new camera name with maximum length of " + regionEditor.maxNameLength + " characters consisting only of letters, numbers and underscores.", oldCamName);
    if (newName != null && newName.trim() != "") {
        newName = newName.trim();
        if (oldCamName == newName) {
            return;
        }

        if (newName.length > regionEditor.maxNameLength) {
            alert('name too long, max ' + regionEditor.maxNameLength + ' characters');
            return;
        }
        for (let i = 0; i < newName.length; i++) {
            let c = newName.charAt(i);
            if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= 9) || c == '_')) {
                alert('Invalid character in name: ' + c + ', only a-z, A-Z, 0-9 and _ are allowed.');
                return;
            }
        }
        //is the name already in use?
        for (let i = 0; i < cameraEditor.cameras.length; i++) {
            if (i == cameraIndex) {
                continue;
            }
            if ((cameraEditor.cameras[i].name + "").toLocaleLowerCase() == newName) {
                alert('The camera name is already in use');
                return;
            }
        }
        stagedUpdateCameraName = newName;
        let elmName = document.getElementById('valCam' + cameraIndex.toString().padStart(2, '0') + 'Name');
        elmName.innerHTML = newName;
        elmName.style.color = 'yellow';
    }

}



function changeCamera(cameraIndex, editing) {

    activeTool = 'look';
    //activeLayer = 'Region';
    stagedUpdateCameraName = null;
    doEditing = editing;
    cameraEditor.isEditing = false;//will flip if camera index is found
    hideUI();
    hideTips();
    if (cameraEditor.cameras.length > 0) {
        cameraEditor.selectedCameraIndex = Math.max(0, Math.min(cameraIndex, cameraEditor.cameras.length - 1));
        let src = cameraEditor.cameras[cameraEditor.selectedCameraIndex].url;
        let xhr = new XMLHttpRequest();
        xhr.open("GET", src);
        xhr.responseType = "arraybuffer";
        xhr.onload = imgLoaded;
        xhr.send();
    }
    else {
        //they need to see no cameras and a refresh button.
        console.log('no cameras detected or configured');
        cameraChangedImageLoaded(-1, editing)

    }
}

function refreshImage() {
    let src = cameraEditor.cameras[cameraEditor.selectedCameraIndex].url;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", src);
    xhr.responseType = "arraybuffer";
    xhr.onload = imgLoaded;
    xhr.send();
}

function imgLoaded(e) {
    changeCamera
    //37510 User Comment
    var ifds = UTIF.decode(e.target.response);
    //console.log(JSON.stringify(ifds));
    //return;
    UTIF.decodeImage(e.target.response, ifds[0])
    var rgba = UTIF.toRGBA8(ifds[0]);  // Uint8Array with RGBA pixels
    //console.log(ifds[0].width, ifds[0].height);
    let tags = ifds[0];//, ifds[0]);
    let exifIFD = tags.exifIFD;
    let userCommentTagID = "t37510";
    let userComment = exifIFD[userCommentTagID];
    //console.log(userComment);
    let thermalData = JSON.parse(userComment);
    //console.log(userComment);
    let dateCaptured = thermalData.DateCaptured;
    let temperaturesInCelsius = thermalData.TemperaturesInCelsius;
    //let imageDescription = thermalData.ImageDescription;
    //console.log('TemperaturesInCelsius:' + temperaturesInCelsius.length);


    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    canvas.width = ifds[0].width;
    canvas.height = ifds[0].height;
    let imageData = ctx.createImageData(ifds[0].width, ifds[0].height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);
    //document.getElementById("holder").appendChild(canvas);

    let image = document.getElementById('regionEditorImageRef');
    image.src = canvas.toDataURL();


    tempsCelsius = thermalData.TemperaturesInCelsius;
    if (!cameraEditor.isEditing) {
        //Todo these needs to be assigned what they are in the config.
        distanceMap = new Array(49152);
        materialMap = new Array(49152);
    }
    clearStoredImageData();


}

function cameraChangedImageLoaded(cameraIndex, editing) {

    clearStoredImageData();
    showUI();

    if (cameraEditor.cameras.length > 0) {

        cameraEditor.selectedCameraIndex = cameraIndex;
        if (regionEditor != null) {

            if (historyStack != null && historyStack.length > 1) {
                //todo save changes?
            }
            historyStack = [];
            //tempsCelsius = [];
            historyIndex = -1;

            let oldImageScale = regionEditor.imageScale;
            let oldImageFilter = regionEditor.imageFilter;
            if (cameraEditor.cameras[cameraEditor.selectedCameraIndex].config != null) {
                regionEditor = JSON.parse(JSON.stringify(cameraEditor.cameras[cameraEditor.selectedCameraIndex].config));
                regionEditor.imageScale = oldImageScale;
                regionEditor.imageFilter = oldImageFilter;
            }
            else {
                regionEditor = getEmptyRegionEditor();
                regionEditor.imageScale = oldImageScale;
                regionEditor.imageFilter = oldImageFilter;
            }

        }
        else {
            if (cameraEditor.cameras[cameraEditor.selectedCameraIndex].config != null) {
                regionEditor = JSON.parse(JSON.stringify(cameraEditor.cameras[cameraEditor.selectedCameraIndex].config));
            }
            else {
                regionEditor = getEmptyRegionEditor();
                regionEditor.imageScale = 3.0;
            }
        }
    }

    let cameraTools = document.getElementById('cameraTools');
    cameraTools.innerHTML = '';
    if (editing) {
        document.getElementById('cameraEditTools').style.display = '';
        cameraTools.style.display = 'none';
    }
    else {
        document.getElementById('cameraEditTools').style.display = 'none';
        cameraTools.style.display = '';
    }
    let sb = '';
    if (cameraEditor.cameras.length > 0) {


        for (let i = 0; i < cameraEditor.cameras.length; i++) {
            let strIndex = i.toString().padStart(2, '0');
            let camera = cameraEditor.cameras[i];

            if (i == cameraIndex) {
                if (editing) {
                    cameraEditor.isEditing = true;
                    let elmCamStatus = document.getElementById('valCamStatus');
                    elmCamStatus.style.color = camera.isOnline ? "green" : "red";
                    elmCamStatus.innerHTML = camera.isOnline ? "Online" : "Offline";

                    let elmCamName = document.getElementById('valCamName');
                    elmCamName.innerHTML = camera.name;
                    elmCamName.style.color = camera.name == unknownCameraName ? "red" : "white";

                    let elmCamIssues = document.getElementById('valCamIssues');
                    elmCamIssues.innerHTML = "0";

                    break;
                }
                else {
                    sb += '<button id="btnCam' + strIndex + '" onclick="changeCamera(' + i + ',true)" class="resizebutton2" style="border-color:white">';
                    sb += '<div style="line-height: 14px;">';
                    if (!camera.isOnline) {
                        sb += '<div id="valCam' + strIndex + 'Status" style="color:red;margin-top:3px" class="regionditortextsub3">Offline</div>';
                    }
                    else {
                        sb += '<div id="valCam' + strIndex + 'Status" style="color:green;margin-top:3px" class="regionditortextsub3">Online</div>';
                    }
                    sb += '<div class="regioneditortext" style="margin-top:-12px">Tap To Edit</div>';
                    //camera names were already sanitized
                    sb += '<div id="valCam' + strIndex + 'View" style="margin-top:-6px" class="regionditortextsub3">Viewing</div>';
                    let strStyle = '';
                    if (camera.name == unknownCameraName) {
                        strStyle = ' style="color:red"';
                    }
                    sb += '<div id="valCam' + strIndex + 'Name" class="regionditortextsub3"' + strStyle + '>' + camera.name + '</div>';
                    sb += '</div>';
                    sb += '</button>';
                }

            }
            else if (!editing) {
                sb += '<button id="btnCam' + strIndex + '" onclick="changeCamera(' + i + ',false)" class="resizebutton2">';

                sb += '<div style="line-height: 20px;">';
                if (!camera.isOnline) {
                    sb += '<div id="valCam' + strIndex + 'Status" style="color:red;margin-top:-4px" class="regionditortextsub3">Offline</div>';
                }
                else {
                    sb += '<div id="valCam' + strIndex + 'Status" style="color:green;margin-top:-4px" class="regionditortextsub3">Online</div>';
                }
                sb += '<div class="regioneditortext" style="margin-top:-15px">View Camera</div>';
                //camera names were already sanitized
                let strStyle = '';
                if (camera.name == unknownCameraName) {
                    strStyle = ' style="color:red"';
                }
                sb += '<div id="valCam' + strIndex + 'Name" class="regionditortextsub3"' + strStyle + '>' + camera.name + '</div>';

                sb += '</div>';
                sb += '</button>';
            }

        }
    }
    else {
        //No Cameras and No configured Cameras
        sb += '<button id="btnNoCameras" disabled class="resizebutton2" style="background-color: black;">';
        sb += '<div style="line-height: 17px;">';
        sb += '<div class="regionditortextsub3">No Cameras</div>';
        sb += '<div class="regionditortextsub3">Found</div>';
        sb += '<div class="regionditortextsub3">Check Devices</div>';
        sb += '</div>';
        sb += '</button>';
    }
    if (!editing) {
        sb += '<button id="btnRefreshCameras" onclick="refreshCameras()" class="resizebutton">';
        sb += '<div style="line-height: 19px;">';
        sb += '<div style="margin-top:4px;margin-bottom:14px" class="regioneditortext2">Refresh</div>';
        sb += '<div style="margin-bottom:14px" class="regioneditortext2">Camera</div>'
        sb += '<div class="regioneditortext2">List</div>';
        sb += '</div>';
        sb += '</button>';


    }
    cameraTools.innerHTML = sb;
    if (cameraEditor.cameras.length > 0) {
        goRegionEditor();
    }
    else {
        hideUI();
        document.getElementById('cameraTools').style.display = '';
    }
}

function setupEvents() {
    const image = document.querySelector('#regionEditorImage');
    const border = document.querySelector('#regionEditorBorder');
    const tooltip = document.getElementById('tooltip');
    const tipmagnifier = document.getElementById('tipmagnifier');
    const tiptarget = document.getElementById('tiptarget');

    [border, image].forEach(function (elem) {
        elem.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if ("buttons" in e) {
                if (e.buttons == 1) {
                    let minY = image.offsetTop;
                    let maxY = image.offsetTop + image.offsetHeight - 1;
                    let minX = image.offsetLeft;
                    let maxX = image.offsetLeft + image.offsetWidth - 1;
                    let pageX = Math.max(Math.min(e.pageX, maxX), minX);
                    let pageY = Math.max(Math.min(e.pageY, maxY), minY);
                    let offsetX = pageX - image.offsetLeft - 1;
                    let offsetY = pageY - image.offsetTop - 1;
                    processScreenTouchCoordinates(offsetX, offsetY, false);
                }
            }

        });
    });


    [border, image].forEach(function (elem) {
        elem.addEventListener('touchstart', (e) => {

            e.stopPropagation();
            e.preventDefault();//stop mouse down event from firing
            if (regionEditor == null) {
                return;
            }
            tiptarget.style.display = 'block';
            tipmagnifier.style.display = 'block';
            tooltip.style.display = 'block';

            let pageX = 0;
            let pageY = 0;
            for (let i = 0; i < e.changedTouches.length; i++) {
                pageX = e.changedTouches[i].pageX;
                pageY = e.changedTouches[i].pageY;
                break;
            }

            let minY = image.offsetTop;
            let maxY = image.offsetTop + image.offsetHeight - 1;
            let minX = image.offsetLeft;
            let maxX = image.offsetLeft + image.offsetWidth - 1;
            pageX = Math.max(Math.min(pageX, maxX), minX);
            pageY = Math.max(Math.min(pageY, maxY), minY);
            let offsetX = pageX - image.offsetLeft - 1;
            let offsetY = pageY - image.offsetTop - 1;


            processScreenTouchCoordinates(offsetX, offsetY, false);
            pointerMove(offsetX, offsetY, pageX, pageY, false, false);


        });
    });

    [border, image].forEach(function (elem) {

        elem.addEventListener('touchmove', (e) => {
            e.stopPropagation();
            e.preventDefault();//stop scrolling of the page
            if (regionEditor == null) {
                return;
            }
            if (!isTouchEventWithElement(elem, e)) {
                return;
            }
            tiptarget.style.display = 'block';
            tipmagnifier.style.display = 'block';
            tooltip.style.display = 'block';

            let pageX = 0;
            let pageY = 0;
            for (let i = 0; i < e.changedTouches.length; i++) {
                pageX = e.changedTouches[i].pageX;
                pageY = e.changedTouches[i].pageY;
                break;
            }

            let minY = image.offsetTop;
            let maxY = image.offsetTop + image.offsetHeight - 1;
            let minX = image.offsetLeft;
            let maxX = image.offsetLeft + image.offsetWidth - 1;
            pageX = Math.max(Math.min(pageX, maxX), minX);
            pageY = Math.max(Math.min(pageY, maxY), minY);
            let offsetX = pageX - image.offsetLeft - 1;
            let offsetY = pageY - image.offsetTop - 1;
            pointerMove(offsetX, offsetY, pageX, pageY, true, true);

        });
    });

    [border, image].forEach(function (elem) {
        elem.addEventListener('mouseover', (e) => {
            e.stopPropagation();
            if (regionEditor == null) {
                return;
            }
            tiptarget.style.display = 'block';
            tipmagnifier.style.display = 'block';
            tooltip.style.display = 'block';
        });
    });


    //image.addEventListener('mouseout', () => {
    //tooltip.style.display = 'none';
    //});



    [border, image].forEach(function (elem) {

        elem.addEventListener('mousemove', (e) => {
            e.stopPropagation();
            if (regionEditor == null) {
                return;
            }
            let isLeftMouseClick = false;
            if ("buttons" in e) {
                if (e.buttons == 1) {
                    isLeftMouseClick = true;
                }
            }


            //adjust offset relative to the image contained within the border


            let minY = image.offsetTop;
            let maxY = image.offsetTop + image.offsetHeight - 1;
            let minX = image.offsetLeft;
            let maxX = image.offsetLeft + image.offsetWidth - 1;
            let pageX = Math.max(Math.min(e.pageX, maxX), minX);
            let pageY = Math.max(Math.min(e.pageY, maxY), minY);
            let offsetX = pageX - image.offsetLeft - 1;
            let offsetY = pageY - image.offsetTop - 1;
            pointerMove(offsetX, offsetY, pageX, pageY, false, isLeftMouseClick);

        }

        );
    });

}

function goRegionEditor() {
    historyStack = [];
    historyIndex = -1;
    metaHistoryStack = [];
    metaHistoryIndex = -1;
    recalcEditor();
    if(activeLayer == 'Region'){
        addRegionHistory('Initial ' + activeLayer + ' State', null, true);
    }
    else{
        addMetaHistory('Initial ' + activeLayer + ' State', true);
    }
    setButtons();
    displayImageTemps();
}

function zoomRegionEditor(scale) {
    hideTips();
    let value = regionEditor.imageScale + scale;
    if (value < 1) {
        value = 5;
    }
    else if (value > 5) {
        value = 1;
    }

    regionEditor.imageScale = value;
    recalcEditor();
    addRegionHistory('zoom image', null, false);//I don't think this needs a undo.
}

function addRegion(regionType) {

    if (regionTypes.indexOf(regionType) == -1) {
        console.error('unsupported region type: ' + regionType);
        return;
    }

    if (regionEditor.regions.length >= 99) {
        console.error('You have reached the maximum number of regions allowed.');
        return;
    }

    let colorToUse = regionColors[Math.floor(Math.random() * regionColors.length)];

    let regionPrefix = regionType;
    let regionName = '';
    let regionNameIndex = 0;
    //create a unique region name
    while (true) {
        regionNameIndex++;
        if (regionNameIndex < 10) {
            regionName = regionPrefix + '0' + regionNameIndex;
        }
        else {
            regionName = regionPrefix + regionNameIndex;
        }
        let res = regionEditor.regions.findIndex(item => regionName.toLowerCase() === item.name.toLowerCase());
        if (res == -1) {
            break;
        }
    }
    let regionX = Math.round(regionType == 'point' ? regionEditor.imageNativeWidth / 2 : regionEditor.imageNativeWidth / 3);
    let regionY = Math.round(regionType == 'point' ? regionEditor.imageNativeHeight / 2 : regionEditor.imageNativeHeight / 3);
    let regionWidth = Math.round(regionType == 'point' ? 1 : regionEditor.imageNativeWidth / 4);
    let regionHeight = Math.round(regionType == 'point' ? 1 : regionEditor.imageNativeHeight / 4);
    let regionPoints = null;
    let regionAngle = 0.0;

    if (regionEditor.regions.length > 0) {
        let lastRegion = null;
        let lastResIndex = regionEditor.regions.findLastIndex(item => regionType === item.type);
        if (lastResIndex != -1) {
            //console.log('found last region of type ' + regionType + ' at index ' + lastResIndex);
            lastRegion = regionEditor.regions[lastResIndex];
            regionWidth = lastRegion.width;
            regionHeight = lastRegion.height;
            regionAngle = lastRegion.angle;
            regionX = lastRegion.x + 10;
            regionY = lastRegion.y + 10;
            //this code copied the last polygon shape, but it was not intuitive to the user.
            /*if (lastRegion.points != null && lastRegion.points.length > 0) {
                regionPoints = [];
                for (let q = 0; q < lastRegion.points.length; q++) {
                    regionPoints.push({ "x": (lastRegion.points[q].x + 10), "y": (lastRegion.points[q].y + 10) });
                }
            }*/

        }
        else {
            //console.log('did not find last region of type ' + regionType);
            lastRegion = regionEditor.regions[regionEditor.regions.length - 1];



        }
    }

    if (regionType == 'polygon' && (regionPoints == null || regionPoints.length == 0)) {
        let x = regionX;
        let y = regionY;
        let myWidth = 40;
        let myHeight = 40
        regionPoints = [{ "x": x, "y": y }, { "x": myWidth + x, "y": y }, { "x": myWidth + x, "y": myHeight + y }, { "x": x, "y": myHeight + y }];
        let bounds = getPolygonBounds(regionPoints);
        regionX = bounds.x;
        regionY = bounds.y;
        regionWidth = bounds.width;
        regionHeight = bounds.height;

        selectedPointIndex = 0;
    }
    let region = {
        "name": regionName,
        "alarmThresh": { "loPriority": 1, "hiPriority": 1, "loTempC": null, "hiTempC": null },
        "type": regionType,
        "color": colorToUse,
        "x": regionX,
        "y": regionY,
        "width": regionWidth,
        "height": regionHeight,
        "angle": regionAngle,
        "points": regionPoints
    };

    fixRegionOutOfBounds(region);
    regionEditor.regions.push(region);
    regionEditor.selectedRegionIndex = regionEditor.regions.length - 1;
    activeTool = 'move';//this makes the most sense to me.
    recalcEditor();
    addRegionHistory('new ' + regionType, regionEditor.selectedRegionIndex, true);
}
