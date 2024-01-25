"use strict";
var CamManager;
(function (CamManager) {
    const cameraFixedEmissivity = .95;
    const cameraFixedDistanceMeters = .25;
    const unknownCameraName = 'Unknown';
    let comparingImageDirectionIsUp = true;
    let compareDividerPosition = 0;
    let materialMap = [];
    let distanceMap = [];
    let rawTiffImageData = null; //this is what we need to send on the save service call.
    //let eventMap = [];
    let selectedEventIndex = -1;
    let cameraEditor = {
        "selectedCameraIndex": 0,
        "isViewingCelsius": true,
        "showHotspotNumbers": false,
        "isEditing": false,
        "isWatchingLive": false,
        "isRetaining": false,
        "minZoomLevel": 1,
        "maxZoomLevel": 7,
        "defaultZoomLevel": 3,
        "cameras": [],
        "tags": [],
    };
    let hasEdited = false;
    let regionEditor = null; //the active region.
    const regionColors = ["Salmon", "Crimson", "Red", "DarkRed", "Pink", "DeepPink", "Coral", "Tomato", "Orange", "Gold", "Yellow", "Khaki", "Thistle", "Plum", "Violet", "Magenta", "Purple", "Indigo", "Lime", "SeaGreen", "Green", "Olive", "Teal", "Cyan", "SkyBlue", "Blue", "Navy", "Tan", "Brown", "Maroon"];
    let tempRanges = { "highCelsius": 250.0, "lowCelsius": 0 };
    const regionTypes = ['point', 'polygon'];
    const touchTools = ['look', 'select', 'move', 'pointadd', 'pointmove', 'pointdelete', 'sample', 'fill', 'change', 'paintround', 'paintsquare', 'eraseround', 'erasesquare'];
    const cameraLayers = ['Spots', 'Matl', 'Dist'];
    let activeTool = touchTools[0];
    let activeLayer = cameraLayers[0];
    const maxHistoryStackEntries = 50;
    let historyStack = [];
    let historyIndex = -1;
    const maxMetaHistoryStackEntries = 10; //material and distance are huge!
    let metaHistoryStack = []; //material and distance.
    let metaHistoryIndex = -1;
    let tempsCelsius = [];
    let selectedSpotIndex = -1;
    let paintBrushSize = 10;
    let eraseBrushSize = 10;
    let selectedDistance = 1.0;
    let fillRange = 1.0;
    let escapeElm = null;
    function isAutoComparingImages() {
        return isDemo() && !cameraEditor.isEditing && activeLayer == 'Spots';
    }
    function escapeHTML(html) {
        if (html == null || html.trim() == '') {
            return '';
        }
        if (escapeElm == null) {
            escapeElm = document.createElement('textarea');
        }
        escapeElm.textContent = html;
        return escapeElm.innerHTML;
    }
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
    Give me the results as a javascript array in the following format:let knownMaterials =  [{"name":"material name", "emissivity":.95}]
    */
    const knownMaterials = [
        { "category": "Ignore", "name": "Out Of Bounds", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Not Interested", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Dead Zone", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Too Far", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Bad Reading", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Dead Pixel", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Mirror", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Reflection", "emissivity": 0.00 },
        { "category": "Ignore", "name": "Glass", "emissivity": 0.00 },
        { "category": "Metal", "name": "Polished Silver", "emissivity": 0.02 },
        { "category": "Tape", "name": "Black Electrical Tape", "emissivity": 0.95 },
        { "category": "Metal", "name": "Aluminum Sheet", "emissivity": 0.09 },
        { "category": "Plastic", "name": "Plastic Housing", "emissivity": 0.93 },
        { "category": "Metal", "name": "Stainless Steel", "emissivity": 0.07 },
        { "category": "Wiring", "name": "Copper Wire", "emissivity": 0.03 },
        { "category": "Metal", "name": "Steel Enclosure", "emissivity": 0.85 },
        { "category": "Plastic", "name": "Wire Insulation", "emissivity": 0.94 },
        { "category": "Connector", "name": "Metal Connector", "emissivity": 0.75 },
        { "category": "Painted Surface", "name": "Painted Steel Surface", "emissivity": 0.85 },
        { "category": "Wiring", "name": "Aluminum Wire", "emissivity": 0.1 },
        { "category": "Metal", "name": "Copper Busbar", "emissivity": 0.04 },
        { "category": "Tape", "name": "Electrical Insulation Tape", "emissivity": 0.93 },
        { "category": "Connector", "name": "Plastic Connector", "emissivity": 0.92 },
        { "category": "Plastic", "name": "Cable Tie", "emissivity": 0.93 },
        { "category": "Metal", "name": "Brass Screw", "emissivity": 0.05 },
        { "category": "Wiring", "name": "Copper Bus Wire", "emissivity": 0.04 },
        { "category": "Wiring", "name": "Aluminum Bus Wire", "emissivity": 0.1 },
        { "category": "Connector", "name": "Modular Connector", "emissivity": 0.85 },
        { "category": "Painted Surface", "name": "Label", "emissivity": 0.88 },
        { "category": "Painted Surface", "name": "Sticker", "emissivity": 0.87 },
        { "category": "Metal", "name": "Steel Screw", "emissivity": 0.85 },
        { "category": "Indicator", "name": "Indicator Light", "emissivity": 0.85 },
        { "category": "Wiring", "name": "Aluminum Cable", "emissivity": 0.12 },
        { "category": "Connector", "name": "Cord Grip", "emissivity": 0.92 },
        { "category": "Plastic", "name": "Nylon Spacer", "emissivity": 0.91 },
        { "category": "Metal", "name": "Copper Foil", "emissivity": 0.03 },
        { "category": "Tape", "name": "White Electrical Tape", "emissivity": 0.93 },
        { "category": "Metal", "name": "Bronze Terminal", "emissivity": 0.05 },
        { "category": "Painted Surface", "name": "Metallic Label", "emissivity": 0.87 },
        { "category": "Wiring", "name": "Silver Wire", "emissivity": 0.02 },
        { "category": "Plastic", "name": "Polycarbonate Sheet", "emissivity": 0.93 },
        { "category": "Connector", "name": "Screw Terminal", "emissivity": 0.87 },
        { "category": "Metal", "name": "Steel Washer", "emissivity": 0.85 },
        { "category": "Wiring", "name": "Aluminum Busbar", "emissivity": 0.12 },
        { "category": "Tape", "name": "Transparent Tape", "emissivity": 0.92 },
        { "category": "Painted Surface", "name": "Colorful Label", "emissivity": 0.88 },
        { "category": "Plastic", "name": "PVC Conduit", "emissivity": 0.91 },
        { "category": "Metal", "name": "Galvanized Steel", "emissivity": 0.6 },
        { "category": "Connector", "name": "Twist on Wire Connector", "emissivity": 0.93 },
        { "category": "Wiring", "name": "Tinned Copper Wire", "emissivity": 0.04 },
        { "category": "Tape", "name": "Duct Tape", "emissivity": 0.94 },
        { "category": "Metal", "name": "Steel Bracket", "emissivity": 0.85 },
        { "category": "Painted Surface", "name": "Engraved Panel", "emissivity": 0.88 },
        { "category": "Plastic", "name": "ABS Enclosure", "emissivity": 0.92 },
        { "category": "Connector", "name": "Terminal Block", "emissivity": 0.86 },
        { "category": "Metal", "name": "Copper Foil Tape", "emissivity": 0.03 },
        { "category": "Wiring", "name": "Aluminum Conductor", "emissivity": 0.12 },
        { "category": "Tape", "name": "Heat Shrink Tape", "emissivity": 0.93 },
        { "category": "Plastic", "name": "Nylon Cable Clamp", "emissivity": 0.91 },
        { "category": "Connector", "name": "Grounding Lug", "emissivity": 0.95 },
        { "category": "Metal", "name": "Brass Terminal Block", "emissivity": 0.05 },
        { "category": "Painted Surface", "name": "Metallic Panel", "emissivity": 0.87 },
        { "category": "Wiring", "name": "Copper Foil Conductor", "emissivity": 0.03 },
        { "category": "Plastic", "name": "Polypropylene Insulator", "emissivity": 0.92 },
        { "category": "Connector", "name": "Cable Connector", "emissivity": 0.93 },
        { "category": "Metal", "name": "Bronze Grounding Rod", "emissivity": 0.05 },
        { "category": "Tape", "name": "Electrical Shielding Tape", "emissivity": 0.93 },
        { "category": "Wiring", "name": "Aluminum Ground Wire", "emissivity": 0.12 },
        { "category": "Plastic", "name": "ABS Junction Box", "emissivity": 0.92 },
        { "category": "Metal", "name": "Stainless Steel Fastener", "emissivity": 0.07 },
        { "category": "Connector", "name": "Spring Terminal", "emissivity": 0.85 },
        { "category": "Painted Surface", "name": "Laminated Label", "emissivity": 0.88 },
        { "category": "Wiring", "name": "Copper Shielding", "emissivity": 0.03 },
        { "category": "Tape", "name": "Vinyl Electrical Tape", "emissivity": 0.93 },
        { "category": "Metal", "name": "Zinc Coated Steel", "emissivity": 0.6 },
        { "category": "Plastic", "name": "Nylon Cable Tie", "emissivity": 0.91 },
        { "category": "Connector", "name": "Crimp Terminal", "emissivity": 0.85 },
        { "category": "Wiring", "name": "Aluminum Grounding Conductor", "emissivity": 0.12 },
        { "category": "Tape", "name": "Foil Tape", "emissivity": 0.04 },
        { "category": "Metal", "name": "Brass Bolt", "emissivity": 0.05 },
        { "category": "Wiring", "name": "Silver-Coated Copper Wire", "emissivity": 0.02 },
        { "category": "Connector", "name": "Threaded Terminal", "emissivity": 0.05 },
        { "category": "Plastic", "name": "Polyethylene Insulation", "emissivity": 0.94 },
        { "category": "Metal", "name": "Zinc-Plated Screw", "emissivity": 0.6 },
        { "category": "Tape", "name": "Heat Resistant Tape", "emissivity": 0.93 },
        { "category": "Wiring", "name": "Nickel-Coated Copper Wire", "emissivity": 0.03 },
        { "category": "Connector", "name": "Barrel Connector", "emissivity": 0.85 },
        { "category": "Plastic", "name": "Nylon Standoff", "emissivity": 0.91 },
        { "category": "Metal", "name": "Stainless Steel Bracket", "emissivity": 0.07 },
        { "category": "Tape", "name": "High Voltage Tape", "emissivity": 0.93 },
        { "category": "Wiring", "name": "Tinned Copper Busbar", "emissivity": 0.04 },
        { "category": "Connector", "name": "Quick Disconnect Terminal", "emissivity": 0.85 },
        { "category": "Plastic", "name": "Polycarbonate Junction Box", "emissivity": 0.92 },
        { "category": "Metal", "name": "Copper Fastener", "emissivity": 0.03 },
        { "category": "Tape", "name": "Glass Cloth Tape", "emissivity": 0.93 },
        { "category": "Wiring", "name": "Tinned Copper Conductor", "emissivity": 0.04 },
        { "category": "Connector", "name": "Coaxial Connector", "emissivity": 0.87 },
        { "category": "Plastic", "name": "Acrylic Spacer", "emissivity": 0.92 },
        { "category": "Metal", "name": "Steel Panel Mount", "emissivity": 0.85 },
        { "category": "Tape", "name": "Kapton Tape", "emissivity": 0.94 },
        { "category": "Wiring", "name": "Tinned Copper Bus Wire", "emissivity": 0.04 },
        { "category": "Connector", "name": "Solderless Terminal", "emissivity": 0.86 },
        { "category": "Plastic", "name": "PVC Cable Grommet", "emissivity": 0.92 },
        { "category": "Painted Surface", "name": "Enamel-Painted Steel Panel", "emissivity": 0.88 },
        { "category": "Painted Surface", "name": "Epoxy-Coated Metal Enclosure", "emissivity": 0.89 },
        { "category": "Painted Surface", "name": "Powder-Coated Aluminum Frame", "emissivity": 0.86 },
        { "category": "Painted Surface", "name": "Acrylic-Painted Plastic Cover", "emissivity": 0.91 },
        { "category": "Painted Surface", "name": "Oil-Based Painted Bracket", "emissivity": 0.87 },
        { "category": "Painted Surface", "name": "Polyurethane-Coated Label", "emissivity": 0.88 },
        { "category": "Painted Surface", "name": "Enamel-Painted Metal Plate", "emissivity": 0.88 },
        { "category": "Painted Surface", "name": "Laminated Metal Panel", "emissivity": 0.87 },
        { "category": "Painted Surface", "name": "Epoxy-Coated Connector", "emissivity": 0.89 },
        { "category": "Painted Surface", "name": "Powder-Coated Steel Housing", "emissivity": 0.86 },
        { "category": "Painted Surface", "name": "Acrylic-Painted Plastic Spacer", "emissivity": 0.91 },
        { "category": "Painted Surface", "name": "Oil-Based Painted Metal Bracket", "emissivity": 0.87 },
        { "category": "Painted Surface", "name": "Polyurethane-Coated Metal Label", "emissivity": 0.88 },
        { "category": "Painted Surface", "name": "Enamel-Painted Steel Bracket", "emissivity": 0.88 },
        { "category": "Painted Surface", "name": "Laminated Metal Tag", "emissivity": 0.87 },
        { "category": "Indicator", "name": "LED Light", "emissivity": 0.85 },
        { "category": "Metal", "name": "Door Hinge", "emissivity": 0.85 },
        { "category": "Connector", "name": "Terminal Block", "emissivity": 0.86 },
    ];
    let selectedMaterial = knownMaterials[15];
    let storedImageData = null;
    let storedImageRotation = null;
    let storedImageWidth = null;
    let storedImageHeight = null;
    let storedImageMirrorHorizontally = null;
    let activeFunc = null;
    let waiterTime = 100;
    const imageFilters = ['none', 'inferno', 'bluered', 'light', 'dark'];
    let imageFilter = imageFilters[1];
    let imageScale = cameraEditor.defaultZoomLevel;
    function changeLayerNext(doNext) {
        let index = cameraLayers.indexOf(activeLayer);
        if (doNext) {
            index++;
        }
        else {
            index--;
        }
        if (index < 0) {
            index = cameraLayers.length - 1;
        }
        else if (index >= cameraLayers.length) {
            index = 0;
        }
        setActiveLayer(cameraLayers[index]);
        //changing layers clears the history stack;
        hideTips();
        goRegionEditor();
    }
    CamManager.changeLayerNext = changeLayerNext;
    function setActiveLayer(layer) {
        if (cameraLayers.indexOf(layer) == -1) {
            console.error('invalid layer: ' + layer);
            return;
        }
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
    CamManager.changeBrushSizeBy = changeBrushSizeBy;
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
    CamManager.changeFillRangeBy = changeFillRangeBy;
    function selectRegionEditorTool(toolName) {
        hideTips();
        if (toolName == 'erase') {
            if (activeTool.indexOf('erase') > -1) { //already active
                toolName = document.getElementById('shapeEraseRound').style.display == 'none' ? 'eraseround' : 'erasesquare';
            }
            else {
                toolName = document.getElementById('shapeEraseRound').style.display == 'none' ? 'erasesquare' : 'eraseround';
            }
            document.getElementById('shapeEraseRound').style.display = toolName == 'eraseround' ? '' : 'none';
            document.getElementById('shapeEraseSquare').style.display = toolName == 'erasesquare' ? '' : 'none';
        }
        else if (toolName == 'paint') {
            if (activeTool.indexOf('paint') > -1) { //already painting so flip the tool
                toolName = document.getElementById('shapePaintRound').style.display == 'none' ? 'paintround' : 'paintsquare';
            }
            else { //keep the current tool
                toolName = document.getElementById('shapePaintRound').style.display == 'none' ? 'paintsquare' : 'paintround';
            }
            document.getElementById('shapePaintRound').style.display = toolName == 'paintround' ? '' : 'none';
            document.getElementById('shapePaintSquare').style.display = toolName == 'paintsquare' ? '' : 'none';
        }
        if (touchTools.indexOf(toolName) == -1) {
            console.error('invalid tool name: ' + toolName);
            recalcEditor();
            return;
        }
        let oldActiveTool = activeTool;
        //put some logic here
        activeTool = toolName;
        recalcEditor();
    }
    CamManager.selectRegionEditorTool = selectRegionEditorTool;
    function reviewIssues() {
        showAlertDialog(null, 'Review Issues', 'There are no issues.', true);
    }
    CamManager.reviewIssues = reviewIssues;
    function redoMetaHistory() {
        if (metaHistoryIndex < 0 || metaHistoryStack.length <= 1) {
            //console.log('nothing to redo');
            return;
        }
        if (metaHistoryIndex < metaHistoryStack.length - 1) {
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
    CamManager.redoMetaHistory = redoMetaHistory;
    function undoMetaHistory() {
        if (metaHistoryStack.length <= 1) { //first entry is initial state
            //console.log('nothing to undo');
            return;
        }
        if (metaHistoryIndex < 0 || metaHistoryIndex >= metaHistoryStack.length) {
            //console.log('adjusting out of bounds history index to last entry');
            metaHistoryIndex = metaHistoryStack.length - 1;
        }
        if (metaHistoryIndex >= 1) {
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
    CamManager.undoMetaHistory = undoMetaHistory;
    function addMetaHistory(historyType, force) {
        if (!cameraEditor.isEditing) {
            setButtons();
            return;
        }
        let time = new Date().getTime();
        let historyEntry = { "historyType": historyType, "time": time, "materialMap": null, "distanceMap": null };
        if (activeLayer == 'Matl') {
            historyEntry.materialMap = [...materialMap];
        }
        else if (activeLayer == 'Dist') {
            historyEntry.distanceMap = [...distanceMap];
        }
        else {
            console.error('invalid layer: ' + activeLayer);
            return;
        }
        let lastHistoryEntry = null;
        if (metaHistoryStack.length > 0) {
            hasEdited = true;
            //console.log('evaluating new history entry of ' + historyEntry.historyType);
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
                //console.log('force add history entry of ' + historyEntry.historyType)
                metaHistoryStack.splice(metaHistoryIndex + 1, 0, historyEntry);
                metaHistoryStack.length = metaHistoryIndex + 2; //new action clears redo stack
            }
            else {
                if (historyEntry.historyType == lastHistoryEntry.historyType && (historyEntry.time - lastHistoryEntry.time) < 250) {
                    //just replace if there hasn't been a break in editing.
                    //console.log('replace existing history entry of' + historyEntry.historyType);
                    metaHistoryStack[metaHistoryIndex] = historyEntry;
                    setButtons();
                    return;
                }
                else {
                    //console.log('add history entry of ' + historyEntry.historyType);
                    metaHistoryStack.splice(metaHistoryIndex + 1, 0, historyEntry);
                    metaHistoryStack.length = metaHistoryIndex + 2; //new action clears redo stack
                }
            }
        }
        else {
            //console.log('add initial history entry of ' + historyEntry.historyType)
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
    CamManager.redoRegionEditor = redoRegionEditor;
    function undoRegionEditor() {
        if (historyStack.length <= 1) { //first entry is initial state
            //console.log('nothing to undo');
            return;
        }
        if (historyIndex < 0 || historyIndex >= historyStack.length) {
            //console.log('adjusting out of bounds history index to last entry');
            historyIndex = historyStack.length - 1;
        }
        if (historyIndex >= 1) {
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
    CamManager.undoRegionEditor = undoRegionEditor;
    function addRegionHistory(historyType, selectedIndex, force) {
        if (!cameraEditor.isEditing) {
            setButtons();
            return;
        }
        let historyEntry = { "historyType": historyType, "selectedIndex": selectedIndex, "regionEditor": JSON.stringify(regionEditor) };
        let lastHistoryEntry = null;
        if (historyStack.length > 0) {
            hasEdited = true;
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
                historyStack.length = historyIndex + 2; //new action clears redo stack
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
                    historyStack.length = historyIndex + 2; //new action clears redo stack
                }
            }
        }
        else {
            console.log('add initial history entry of ' + historyEntry.historyType);
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
    function getDomButton(id) {
        let btn = document.getElementById(id);
        return btn;
    }
    function setButtons() {
        let camera = null;
        if (cameraEditor.cameras != null && cameraEditor.selectedCameraIndex > -1 && cameraEditor.selectedCameraIndex < cameraEditor.cameras.length) {
            camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        }
        getDomButton("btnUndoRegionEdit").disabled = historyStack.length <= 1 || historyIndex <= 0;
        getDomButton("btnUndoRegionEdit").style.display = cameraEditor.isEditing ? '' : 'none';
        getDomButton("btnRedoRegionEdit").disabled = historyStack.length <= 1 || historyIndex >= historyStack.length - 1;
        getDomButton("btnRedoRegionEdit").style.display = cameraEditor.isEditing ? '' : 'none';
        let hasActiveItem = false;
        let canSize = false;
        let canRotate = false;
        let polygonSelected = false;
        let region = null;
        if (regionEditor != null && regionEditor.selectedRegionIndex >= 0 && regionEditor.selectedRegionIndex < regionEditor.regions.length) {
            region = regionEditor.regions[regionEditor.selectedRegionIndex];
            hasActiveItem = true;
            canSize = region.type != 'point' && region.type != 'polygon';
            polygonSelected = region.type == 'polygon';
        }
        const activeToolColor = 'orange';
        const inactiveToolColor = 'white';
        document.getElementById("rowSpotTools").style.display = (activeLayer != 'Spots' ? 'none' : '');
        if (activeLayer == 'Spots') {
            getDomButton("btnToggleTemps").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            getDomButton("btnImageHighTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            getDomButton("btnImageAverageTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            getDomButton("btnImageLowTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            getDomButton("btnRegionHighTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            getDomButton("btnRegionAverageTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            getDomButton("btnRegionLowTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
        }
        document.getElementById("rowMaterialTools").style.display = (activeLayer != 'Matl' ? 'none' : '');
        document.getElementById("rowDistanceTools").style.display = (activeLayer != 'Dist' ? 'none' : '');
        if (cameraEditor.isEditing) {
            if (selectedMaterial != null && selectedMaterial.name != null && selectedMaterial.emissivity != null) {
                document.getElementById('valMaterialName').innerHTML = selectedMaterial.name;
                document.getElementById('valMaterialEmissivity').innerHTML = selectedMaterial.emissivity <= 0 ? '0.00 Ignored' : selectedMaterial.emissivity.toFixed(2);
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
        getDomButton("btnRenameCamera").disabled = (!cameraEditor.isEditing || camera == null || !camera.canRenameCamera);
        getDomButton("btnRotateImage").disabled = (!cameraEditor.isEditing || camera == null || !camera.canEditRotation);
        getDomButton("btnMirrorImageHorizontally").disabled = (!cameraEditor.isEditing || camera == null || !camera.canEditMirror);
        getDomButton('btnSaveCamera').disabled = (!cameraEditor.isEditing || camera == null || !camera.canEdit);
        getDomButton('btnSaveCamera').style.backgroundColor = (!cameraEditor.isEditing || camera == null || !camera.canEdit) ? 'gray' : 'rgb(0,255,0,.4)';
        getDomButton('btnDeleteCamera').disabled = (!cameraEditor.isEditing || camera == null || !camera.canDeleteCamera || !camera.isKnown);
        getDomButton('btnDeleteCamera').style.backgroundColor = (!cameraEditor.isEditing || camera == null || !camera.canDeleteCamera || !camera.isKnown) ? 'gray' : 'rgb(255,0,0,.4)';
        getDomButton('btnRefreshLiveImage').disabled = (!cameraEditor.isEditing || camera == null || camera.usbIndex == null || camera.api == null);
        getDomButton("btnChangeMaterial").style.display = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) ? '' : 'none';
        getDomButton("btnSetDefaultMaterial").style.display = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) ? '' : 'none';
        getDomButton("btnSampleMaterial").style.color = (activeTool == 'sample' ? activeToolColor : inactiveToolColor);
        getDomButton("btnSampleMaterial").style.display = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) ? '' : 'none';
        getDomButton("btnClearMaterial").style.display = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) ? '' : 'none';
        getDomButton("btnUndoMaterialEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex <= 0;
        getDomButton("btnUndoMaterialEdit").style.display = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) ? '' : 'none';
        getDomButton("btnRedoMaterialEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex >= metaHistoryStack.length - 1;
        getDomButton("btnRedoMaterialEdit").style.display = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) ? '' : 'none';
        getDomButton("btnDistance").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnChangeDistanceLess").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnChangeDistanceMore").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnClearDistance").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnSetDefaultDistance").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnSampleDistance").style.color = (activeTool == 'sample' ? activeToolColor : inactiveToolColor);
        getDomButton("btnSampleDistance").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnUndoDistanceEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex <= 0;
        getDomButton("btnUndoDistanceEdit").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnRedoDistanceEdit").disabled = metaHistoryStack.length <= 1 || metaHistoryIndex >= metaHistoryStack.length - 1;
        getDomButton("btnRedoDistanceEdit").style.display = (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer) ? '' : 'none';
        getDomButton("btnPolygonAdd").style.display = (activeLayer == 'Spots' && cameraEditor.isEditing && camera != null && camera.canAddPolygonSpot && camera.canMoveSpots) ? '' : 'none';
        getDomButton("btnPointAdd").style.display = (activeLayer == 'Spots' && cameraEditor.isEditing && camera != null && camera.canAddPointSpot && camera.canMoveSpots) ? '' : 'none';
        getDomButton("btnRegionToolLook").disabled = false;
        getDomButton("btnRegionToolLook").style.color = (activeTool == 'look' ? activeToolColor : inactiveToolColor);
        getDomButton("btnRegionToolSelect").style.display = (activeLayer != 'Spots' ? 'none' : '');
        getDomButton("btnRegionToolSelect").disabled = regionEditor.regions.length <= 1;
        getDomButton("btnRegionToolSelect").style.color = (activeTool == 'select' ? activeToolColor : inactiveToolColor);
        getDomButton("btnRegionToolMove").style.display = (activeLayer == 'Spots' && cameraEditor.isEditing && camera != null && camera.canMoveSpots ? '' : 'none');
        getDomButton("btnRegionToolMove").disabled = !hasActiveItem;
        getDomButton("btnRegionToolMove").style.color = (activeTool == 'move' ? activeToolColor : inactiveToolColor);
        getDomButton("btnRegionToolPointAdd").style.display = (activeLayer == 'Spots' && polygonSelected && cameraEditor.isEditing && camera != null && camera.canMoveSpots) ? '' : 'none';
        getDomButton("btnRegionToolPointAdd").disabled = !polygonSelected;
        getDomButton("btnRegionToolPointAdd").style.color = (activeTool == 'pointadd' ? activeToolColor : inactiveToolColor);
        getDomButton("btnRegionToolPointMove").style.display = (activeLayer == 'Spots' && polygonSelected && cameraEditor.isEditing && camera != null && camera.canMoveSpots) ? '' : 'none';
        getDomButton("btnRegionToolPointMove").disabled = !polygonSelected;
        getDomButton("btnRegionToolPointMove").style.color = (activeTool == 'pointmove' ? activeToolColor : inactiveToolColor);
        getDomButton("btnRegionToolPointDelete").style.display = (activeLayer == 'Spots' && polygonSelected && cameraEditor.isEditing && camera != null && camera.canMoveSpots) ? '' : 'none';
        getDomButton("btnRegionToolPointDelete").disabled = !polygonSelected || (region != null && region.points.length <= 3);
        getDomButton("btnRegionToolPointDelete").style.color = (activeTool == 'pointdelete' ? activeToolColor : inactiveToolColor);
        let fillSelected = activeLayer != 'Spots' && cameraEditor.isEditing && (activeTool.indexOf('fill') > -1);
        let showMaterialOrDistanceEditTools = (activeLayer == 'Matl' && cameraEditor.isEditing && camera != null && camera.canEditMaterialLayer) || (activeLayer == 'Dist' && cameraEditor.isEditing && camera != null && camera.canEditDistanceLayer);
        getDomButton("btnRegionToolFill").style.display = (showMaterialOrDistanceEditTools ? '' : 'none');
        getDomButton("btnRegionToolFill").style.color = (fillSelected ? activeToolColor : inactiveToolColor);
        getDomButton("btnChangeFillRangeInfo").style.display = (!fillSelected ? 'none' : '');
        getDomButton("btnChangeFillRangeLess").style.display = (!fillSelected ? 'none' : '');
        getDomButton("btnChangeFillRangeLess").disabled = !fillSelected;
        getDomButton("btnChangeFillRangeMore").style.display = (!fillSelected ? 'none' : '');
        getDomButton("btnChangeFillRangeMore").disabled = !fillSelected;
        getDomButton("btnRegionToolChange").style.display = (showMaterialOrDistanceEditTools ? '' : 'none');
        getDomButton("btnRegionToolChange").style.color = (activeTool == 'change' ? activeToolColor : inactiveToolColor);
        getDomButton("btnRegionToolPaint").style.display = (showMaterialOrDistanceEditTools ? '' : 'none');
        getDomButton("btnRegionToolPaint").style.color = (activeTool.indexOf('paint') > -1 ? activeToolColor : inactiveToolColor);
        let paintSelected = activeLayer != 'Spots' && (activeTool.indexOf('paint') > -1);
        getDomButton("btnChangePaintSizeInfo").style.display = (!paintSelected ? 'none' : '');
        getDomButton("btnChangePaintSizeLess").style.display = (!paintSelected ? 'none' : '');
        getDomButton("btnChangePaintSizeLess").disabled = !paintSelected;
        getDomButton("btnChangePaintSizeMore").style.display = (!paintSelected ? 'none' : '');
        getDomButton("btnChangePaintSizeMore").disabled = !paintSelected;
        getDomButton("btnRegionToolErase").style.display = (showMaterialOrDistanceEditTools ? '' : 'none');
        getDomButton("btnRegionToolErase").style.color = (activeTool.indexOf('erase') > -1 ? activeToolColor : inactiveToolColor);
        let eraseSelected = activeLayer != 'Spots' && (activeTool.indexOf('erase') > -1);
        getDomButton("btnChangeEraseSizeInfo").style.display = (!eraseSelected ? 'none' : '');
        getDomButton("btnChangeEraseSizeLess").style.display = (!eraseSelected ? 'none' : '');
        getDomButton("btnChangeEraseSizeLess").disabled = !eraseSelected;
        getDomButton("btnChangeEraseSizeMore").style.display = (!eraseSelected ? 'none' : '');
        getDomButton("btnChangeEraseSizeMore").disabled = !eraseSelected;
        getDomButton("btnShowRetained").style.display = ((cameraEditor.isRetaining || cameraEditor.isEditing || camera == null || !camera.isKnown) ? 'none' : '');
        getDomButton("btnWatchLive").style.display = ((cameraEditor.isRetaining || cameraEditor.isWatchingLive || cameraEditor.isEditing || camera == null || camera.usbIndex == null || camera.api == null) ? 'none' : '');
        getDomButton("btnRetainLive").style.display = ((!cameraEditor.isRetaining && cameraEditor.isWatchingLive) ? '' : 'none');
        getDomButton("btnDeleteRegion").disabled = !hasActiveItem || camera == null || !camera.canDeleteSpots;
        getDomButton("btnDeleteRegion").style.visibility = cameraEditor.isEditing ? 'visible' : 'hidden';
        getDomButton("btnChangeRegion").disabled = !hasActiveItem;
        getDomButton("btnChangeRegionName").disabled = !hasActiveItem || !cameraEditor.isEditing || camera == null || !camera.canRenameSpots;
        getDomButton("btnChangeColor").disabled = !hasActiveItem || !cameraEditor.isEditing || camera == null || !camera.canChangeSpotColor;
    }
    function changeDistanceBy(amount) {
        if (selectedDistance == null) {
            changeDistance(1.00);
        }
        else {
            changeDistance(selectedDistance + amount);
        }
    }
    CamManager.changeDistanceBy = changeDistanceBy;
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
    CamManager.changeDistance = changeDistance;
    function metersToInches(meters) {
        let fixed = parseFloat(meters.toFixed(2)); //convert on what they see on the screen
        return meters * 39.3701;
    }
    function clearDistanceMap() {
        hideTips();
        distanceMap = new Array(49152);
        recalcEditor();
        addMetaHistory('clear distance', false); //prevent double click
    }
    CamManager.clearDistanceMap = clearDistanceMap;
    function hideEverything() {
        hideTips();
        document.getElementById('mainEditor').style.display = 'none';
        document.getElementById('dialogDistance').style.display = 'none';
        document.getElementById('dialogMaterials').style.display = 'none';
    }
    function cancelEventDialog() {
        hideEverything();
        document.getElementById('mainEditor').style.display = 'block';
    }
    CamManager.cancelEventDialog = cancelEventDialog;
    function cancelMaterial() {
        hideEverything();
        document.getElementById('mainEditor').style.display = 'block';
    }
    function pickMaterial() {
        selectedMaterialCategory = null; //clear the filter
        hideEverything();
        changeMaterialEmissivityFilter(true, 0);
        changeMaterialEmissivityFilter(false, 1);
        document.getElementById('dialogMaterials').style.display = 'block';
        //list the materials in use.
        let maxAssignable = regionEditor.imageNativeHeight * regionEditor.imageNativeWidth;
        let notAssignedCount = maxAssignable;
        let existingMaterials = [];
        if (materialMap != null && materialMap.length > 0) {
            for (let i = 0; i < materialMap.length; i++) {
                let material = materialMap[i];
                if (material != null) {
                    notAssignedCount--;
                    let foundExisting = false;
                    for (let j = 0; j < existingMaterials.length; j++) {
                        let existingMaterial = existingMaterials[j];
                        if (existingMaterial.name.toLowerCase() == material.name.toLowerCase() && existingMaterial.emissivity == material.emissivity) {
                            existingMaterial.count++;
                            foundExisting = true;
                            break;
                        }
                    }
                    if (!foundExisting) {
                        let lastMaterial = { "count": 1, "name": material.name, "emissivity": material.emissivity };
                        existingMaterials.push(lastMaterial);
                        console.log('Added material' + material.name + ' to existing material list');
                    }
                }
            }
        }
        else {
            console.log('materialMap is empty');
        }
        let sb = '';
        if (notAssignedCount == maxAssignable) {
            sb += '<div style="color:orange">No Materials Assigned.</div>';
        }
        else {
            if (notAssignedCount > 0) {
                let strPercentNotAssigned = ((notAssignedCount / maxAssignable) * 100).toFixed(2) + '&percnt;';
                sb += `<div style="color:red">${strPercentNotAssigned} of pixels are not assigned.</div>`;
            }
            else {
                sb += '<div style="color:green">100% of pixels assigned to a material</div>';
            }
            //sort the materials.
            if (existingMaterials.length > 0) {
                existingMaterials.sort(function (a, b) { return a.count - b.count; });
                sb += '<div>';
                for (let i = 0; i < existingMaterials.length; i++) {
                    let material = existingMaterials[i];
                    let strEmissivity = '0.00 Ignored';
                    if (material.emissivity != null && material.emissivity > 0) {
                        strEmissivity = material.emissivity.toFixed(2);
                    }
                    let strPercent = ((material.count / maxAssignable) * 100).toFixed(2) + '&percnt;';
                    sb += '<button class="resizebutton2" onclick="CamManager.changeMaterial(\'' + material.name + '\',' + material.emissivity + ')">';
                    sb += '<div style="line-height: 17px;">';
                    sb += '<div  class="regioneditortext2">' + strPercent + '</div>';
                    sb += '<div style="padding-top:2px" class="regionditortextsub4">' + escapeHTML(material.name) + '</div>';
                    sb += '<div class="regionditortextsub3">' + strEmissivity + '</div>';
                    sb += '</div>';
                    sb += '</button>';
                }
                sb += '</div>';
            }
        }
        document.getElementById('materialInUseList').innerHTML = sb;
    }
    CamManager.pickMaterial = pickMaterial;
    let selectedMaterialCategory = null;
    function filterMaterials(minEmissivity, maxEmissivity) {
        let materialList = document.getElementById('materialList');
        let materialCategoryList = document.getElementById('materialCategoryList');
        let sbm = '';
        let sbc = '';
        let cats = [];
        let catsLower = [];
        if (knownMaterials != null && knownMaterials.length > 0) {
            let sortedMaterials = [...knownMaterials];
            sortedMaterials.sort(function (a, b) {
                if (a.category > b.category) {
                    return 1;
                }
                else if (a.category < b.category) {
                    return -1;
                }
                else {
                    if (a.name > b.name) {
                        return 1;
                    }
                    else if (a.name < b.name) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }
            });
            for (let i = 0; i < sortedMaterials.length; i++) {
                let material = sortedMaterials[i];
                if (catsLower.indexOf(material.category.toLowerCase()) == -1) {
                    catsLower.push(material.category.toLowerCase());
                    cats.push(material.category);
                }
                if ((selectedMaterialCategory == null || selectedMaterialCategory.toLowerCase() == material.category.toLowerCase()) &&
                    ((material.emissivity >= minEmissivity && material.emissivity <= maxEmissivity) ||
                        (selectedMaterialCategory != null && selectedMaterialCategory.toLowerCase() == 'ignore'))) {
                    let strEmissivity = '0.00 Ignored';
                    if (material.emissivity != null && material.emissivity > 0) {
                        strEmissivity = material.emissivity.toFixed(2);
                    }
                    sbm += '<button class="resizebutton2" onclick="CamManager.changeMaterial(\'' + material.name + '\',' + material.emissivity + ')">';
                    sbm += '<div style="line-height: 17px;">';
                    sbm += '<div  class="regioneditortext2">' + escapeHTML(material.category) + '</div>';
                    sbm += '<div style="padding-top:2px" class="regionditortextsub4">' + escapeHTML(material.name) + '</div>';
                    sbm += '<div class="regionditortextsub3">' + strEmissivity + '</div>';
                    sbm += '</div>';
                    sbm += '</button>';
                }
            }
            if (sbm.length == 0) {
                if (selectedMaterialCategory == null || selectedMaterialCategory == '') {
                    sbm = '<div style="color:red">No Materials In Emissivity Range</div>';
                    console.log('no materials in emissivity range ' + minEmissivity + ' to ' + maxEmissivity + ' for category ' + selectedMaterialCategory + '');
                }
                else {
                    sbm = '<div style="color:red">No Materials in "' + escapeHTML(selectedMaterialCategory) + '" Category For Emissivity Range</div>';
                }
            }
        }
        else {
            sbm = '<div style="color:red">No Materials Loaded</div>';
            sbc = '';
        }
        let allStyle = selectedMaterialCategory == null || selectedMaterialCategory.trim().length == 0 ? 'border-color:white;' : '';
        sbc += '<button style="' + allStyle + '" class="resizebutton2" onclick="CamManager.changeMaterialCategory(null)">';
        sbc += '<div style="line-height: 17px;">';
        sbc += '<div class="regioneditortext2">All</div>';
        sbc += '</div>';
        sbc += '</button>';
        if (cats.length > 0) {
            let sortedCats = [...cats].sort();
            for (let i = 0; i < sortedCats.length; i++) {
                let categoryName = sortedCats[i];
                let style = selectedMaterialCategory != null && selectedMaterialCategory.toLowerCase() == categoryName.toLowerCase() ? 'border-color:white;' : '';
                sbc += '<button style="' + style + '" class="resizebutton2" onclick="CamManager.changeMaterialCategory(\'' + categoryName + '\')">';
                sbc += '<div style="line-height: 17px;">';
                sbc += '<div class="regioneditortext2">' + escapeHTML(categoryName) + '</div>';
                sbc += '</div>';
                sbc += '</button>';
            }
        }
        materialCategoryList.innerHTML = sbc;
        materialList.innerHTML = sbm;
    }
    function changeMaterialCategory(categoryName) {
        let fromMaterialSlider = document.getElementById('fromMaterialSlider');
        selectedMaterialCategory = categoryName;
        let frmValue = parseFloat(fromMaterialSlider.value.toString());
        //let toValue = parseFloat(toMaterialSlider.value.toString());
        changeMaterialEmissivityFilter(true, frmValue.toString());
    }
    CamManager.changeMaterialCategory = changeMaterialCategory;
    function changeMaterialEmissivityFilter(isFrom, value) {
        let fromMaterialSlider = document.getElementById('fromMaterialSlider');
        let toMaterialSlider = document.getElementById('toMaterialSlider');
        let fromMaterialInput = document.getElementById('fromMaterialInput');
        let toMaterialInput = document.getElementById('toMaterialInput');
        let fltValue = parseFloat(value.toString());
        let frmValue = parseFloat(fromMaterialSlider.value.toString());
        let toValue = parseFloat(toMaterialSlider.value.toString());
        //logic.
        if (isFrom) {
            frmValue = fltValue;
            if (frmValue > toValue) {
                toValue = frmValue;
            }
        }
        else {
            if (frmValue > toValue) {
                frmValue = toValue;
            }
        }
        fromMaterialSlider.value = frmValue.toString();
        toMaterialSlider.value = toValue.toString();
        fromMaterialInput.value = frmValue.toFixed(2);
        toMaterialInput.value = toValue.toFixed(2);
        filterMaterials(frmValue, toValue);
    }
    CamManager.changeMaterialEmissivityFilter = changeMaterialEmissivityFilter;
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
        // regular expression that only allows mixed case letters, whole numbers, spaces and commas and dashes.
        let regex = /^[a-zA-Z0-9 ,-]*$/;
        if (!regex.test(materialName)) {
            console.error('invalid material name characters');
            return;
        }
        //round emissivity to 2 decimal places
        emissivity = parseFloat(emissivity.toFixed(2));
        if (emissivity > 1.00) {
            console.error('invalid emissivity');
            return;
        }
        if (emissivity <= 0.00) {
            emissivity = 0.00;
        }
        console.log('old material: ' + selectedMaterial.name + ' with emissivity ' + selectedMaterial.emissivity.toFixed(2) + '');
        selectedMaterial = { "name": materialName, "emissivity": emissivity };
        console.log('changed material to: ' + selectedMaterial.name + ' with emissivity ' + selectedMaterial.emissivity.toFixed(2) + '');
        document.getElementById('valMaterialName').innerHTML = selectedMaterial.name;
        document.getElementById('valMaterialEmissivity').innerHTML = selectedMaterial.emissivity <= 0 ? '0.00 Ignored' : selectedMaterial.emissivity.toFixed(2);
        cancelMaterial();
    }
    CamManager.changeMaterial = changeMaterial;
    function clearMaterialMap() {
        hideTips();
        materialMap = new Array(49152);
        recalcEditor();
        addMetaHistory('clear material', false); //prevent double click
    }
    CamManager.clearMaterialMap = clearMaterialMap;
    function clearFunc() {
        activeFunc = null;
        waiterTime = 1000;
    }
    CamManager.clearFunc = clearFunc;
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
    CamManager.repeatFunc = repeatFunc;
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
        if (regionEditor == null) {
            return;
        }
        if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
            regionEditor.imageWidth = regionEditor.imageNativeWidth * imageScale;
            regionEditor.imageHeight = regionEditor.imageNativeHeight * imageScale;
        }
        else {
            regionEditor.imageWidth = regionEditor.imageNativeHeight * imageScale;
            regionEditor.imageHeight = regionEditor.imageNativeWidth * imageScale;
        }
        document.getElementById("valToggleTempC").style.color = cameraEditor.isViewingCelsius ? 'white' : 'grey';
        document.getElementById("valToggleTempF").style.color = !cameraEditor.isViewingCelsius ? 'white' : 'grey';
        document.getElementById("valActiveLayerEdit").innerHTML = activeLayer;
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
            document.getElementById('valMaterialEmissivity').innerHTML = selectedMaterial.emissivity <= 0 ? '0.00 Ignored' : selectedMaterial.emissivity.toFixed(2);
        }
        else {
            document.getElementById('valMaterialName').innerHTML = "--";
            document.getElementById('valMaterialEmissivity').innerHTML = "--";
        }
        let valueZoom = document.getElementById("valueZoom");
        valueZoom.innerHTML = Math.round(imageScale * 100) + "%";
        document.getElementById("valueFilter").innerHTML = imageFilter;
        document.getElementById("valueImageMirrorHorizontally").innerHTML = regionEditor.imageMirrorHorizontally ? 'On' : 'Off';
        let valImageRotation = document.getElementById("valImageRotation");
        valImageRotation.innerHTML = regionEditor.imageRotation + "&deg;";
        drawRegions();
        setButtons();
        updateMagnifierIfShown();
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
        return [(h - y - 1), x];
    }
    function rotateRegions90(regions, originalRotation, imageNativeWidth, imageNativeHeight) {
        if (regions.length > 0) {
            //rotate all regions by 90 degrees. move x and y accordingly
            let destRotation = originalRotation + 90;
            if (destRotation > 270) {
                destRotation = 0;
            }
            for (let i = 0; i < regions.length; i++) {
                let region = regions[i];
                let pts = [region.x, region.y];
                if (originalRotation == 0 || originalRotation == 180) {
                    if (region.type == 'point') {
                        pts = rotate90(imageNativeWidth, imageNativeHeight, region.x, region.y);
                    }
                    else if (region.type == 'polygon') {
                        for (let index = 0; index < region.points.length; index++) {
                            let point = region.points[index];
                            pts = rotate90(imageNativeWidth, imageNativeHeight, point.x, point.y);
                            point.x = pts[0];
                            point.y = pts[1];
                        }
                        region.x = region.points[0].x;
                        region.y = region.points[0].y;
                        fixRegionOutOfBounds(region, destRotation); //recalcs width and height.
                    }
                    else {
                        pts = rotate90(imageNativeWidth, imageNativeHeight, region.x, region.y);
                        let nX = pts[0]; //85  //80
                        let nY = pts[1]; //64  //84
                        //console.log('rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                        nX = nX - region.height;
                        //console.log('adjusted rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                        pts[0] = nX;
                        pts[1] = nY;
                    }
                }
                else {
                    if (region.type == 'point') {
                        pts = rotate90(imageNativeHeight, imageNativeWidth, region.x, region.y);
                    }
                    else if (region.type == 'polygon') {
                        for (let index = 0; index < region.points.length; index++) {
                            let point = region.points[index];
                            pts = rotate90(imageNativeHeight, imageNativeWidth, point.x, point.y);
                            point.x = pts[0];
                            point.y = pts[1];
                        }
                        region.x = region.points[0].x;
                        region.y = region.points[0].y;
                        fixRegionOutOfBounds(region, destRotation); //recalcs width and height.
                    }
                    else {
                        pts = rotate90(imageNativeHeight, imageNativeWidth, region.x, region.y);
                        let nX = pts[0]; //85  //80
                        let nY = pts[1]; //64  //84
                        //console.log('rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                        nX = nX - region.height;
                        //console.log('adjusted rotating: ' + region.x + ',' + region.y + ' to ' + nX + ',' + nY);
                        pts[0] = nX;
                        pts[1] = nY;
                    }
                }
                let originalWidth = region.width;
                let originalHeight = region.height;
                if (region.type == 'point') {
                    let newX = pts[0];
                    let newY = pts[1];
                    region.x = newX;
                    region.y = newY;
                }
                region.width = originalHeight;
                region.height = originalWidth;
            }
        }
    }
    function rotateImage() {
        hideTips();
        let originalRotation = regionEditor.imageRotation;
        regionEditor.imageRotation += 90;
        if (regionEditor.imageRotation >= 360) {
            regionEditor.imageRotation = 0;
        }
        rotateRegions90(regionEditor.regions, originalRotation, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
        recalcEditor();
        addRegionHistory('rotate image', null, false); //I don't think this needs a undo.
    }
    CamManager.rotateImage = rotateImage;
    function positionAnnotationsLayer() {
        //this may need to get called as things get scrolled or dialogs are shown.
        let annotationsCanvas = document.getElementById('regionEditorAnnotations');
        let regionEditorImageCanvas = document.getElementById('regionEditorImageCanvas');
        annotationsCanvas.style.top = `${regionEditorImageCanvas.offsetTop}px`;
        annotationsCanvas.style.left = `${regionEditorImageCanvas.offsetLeft}px`;
    }
    let lastRedrawDate = null;
    let waitingRedraw = false;
    function drawRegions() {
        if (regionEditor == null) {
            return;
        }
        if (isAutoComparingImages()) {
            //nothing to do here
        }
        else {
            if (lastRedrawDate != null) {
                let now = new Date();
                let diff = now.valueOf() - lastRedrawDate.valueOf();
                if (diff < 100) {
                    if (!waitingRedraw) {
                        waitingRedraw = true;
                        window.setTimeout(drawRegions, 100); //when they are painting with a brush updates are too fast.
                    }
                    return;
                }
            }
        }
        waitingRedraw = false;
        lastRedrawDate = new Date();
        let regionEditorImageCanvas = document.getElementById("regionEditorImageCanvas");
        let regionEditorBaseImage = document.getElementById("regionEditorBaseImage");
        let canvasBottomLayer = document.createElement("canvas");
        canvasBottomLayer.width = regionEditor.imageWidth;
        canvasBottomLayer.height = regionEditor.imageHeight;
        let canvasTopLayer = document.createElement("canvas");
        canvasTopLayer.width = regionEditor.imageWidth;
        canvasTopLayer.height = regionEditor.imageHeight;
        let ctxBottomLayer = canvasBottomLayer.getContext("2d");
        let ctxTopLayer = canvasTopLayer.getContext("2d");
        resetSelectedRegionAttributes();
        let rotation = regionEditor.imageRotation * Math.PI / 180;
        let strFilter = imageFilter == 'none' ? '' : 'url(#' + imageFilter + ')';
        regionEditorImageCanvas.style.filter = strFilter;
        //canvas.style.filter = strFilter;
        let scale = imageScale;
        ctxBottomLayer.save();
        // translate context to center of canvas
        ctxBottomLayer.translate(canvasBottomLayer.width / 2, canvasBottomLayer.height / 2);
        ctxBottomLayer.rotate(rotation);
        if (regionEditor.imageMirrorHorizontally) {
            ctxBottomLayer.scale(-1, 1);
        }
        // draw image
        ctxBottomLayer.scale(scale, scale);
        let dx = (-regionEditor.imageNativeWidth / 2);
        let dy = (-regionEditor.imageNativeHeight / 2);
        ctxBottomLayer.drawImage(regionEditorBaseImage, dx, dy, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
        if (isAutoComparingImages() && compareDividerPosition >= 1) {
            let regionEditorCompareImage = document.getElementById("regionEditorCompareImage");
            let testCanvas = document.createElement("canvas");
            let testCtx = testCanvas.getContext("2d");
            testCanvas.width = regionEditor.imageNativeWidth;
            testCanvas.height = regionEditor.imageNativeHeight;
            ctxBottomLayer.drawImage(regionEditorBaseImage, dx, dy, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
            testCtx.fillStyle = 'rgba(0,0,0,.3)';
            testCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
            regionEditorCompareImage.src = testCanvas.toDataURL();
            ctxBottomLayer.lineWidth = 1;
            ctxBottomLayer.strokeStyle = 'rgba(255,255,255,1)';
            if (rotation == 0 || rotation == 180) {
                ctxBottomLayer.drawImage(regionEditorCompareImage, dx, dy, compareDividerPosition, regionEditor.imageNativeHeight);
                ctxBottomLayer.beginPath();
                ctxBottomLayer.moveTo(compareDividerPosition + dx, dy);
                ctxBottomLayer.lineTo(compareDividerPosition + dx, dy + regionEditor.imageNativeHeight);
                // Draw the Path
                ctxBottomLayer.stroke();
            }
            else {
                ctxBottomLayer.drawImage(regionEditorCompareImage, dx, dy, regionEditor.imageNativeWidth, compareDividerPosition);
                ctxBottomLayer.beginPath();
                ctxBottomLayer.moveTo(dx, compareDividerPosition + dy);
                ctxBottomLayer.lineTo(dx + regionEditor.imageNativeWidth, compareDividerPosition + dy);
                // Draw the Path
                ctxBottomLayer.stroke();
            }
        }
        ctxBottomLayer.scale(1 / scale, 1 / scale);
        ctxBottomLayer.rotate(-rotation);
        ctxBottomLayer.translate(-canvasBottomLayer.width / 2, -canvasBottomLayer.height / 2);
        ctxBottomLayer.restore();
        if (activeLayer == 'Matl') {
            drawMaterialMap(ctxBottomLayer, scale);
        }
        else if (activeLayer == 'Dist') {
            drawDistanceMap(ctxBottomLayer, scale);
        }
        else {
            drawRegionMap(ctxBottomLayer, scale, false); //can check alignment
            drawRegionMap(ctxTopLayer, scale, true);
            if (!cameraEditor.isEditing) {
                drawNumbers(ctxTopLayer, scale);
            }
        }
        let ctxRegionEditorImageCanvas = regionEditorImageCanvas.getContext("2d");
        regionEditorImageCanvas.width = canvasBottomLayer.width;
        regionEditorImageCanvas.height = canvasBottomLayer.height;
        ctxRegionEditorImageCanvas.clearRect(0, 0, regionEditorImageCanvas.width, regionEditorImageCanvas.height);
        ctxRegionEditorImageCanvas.drawImage(canvasBottomLayer, 0, 0, regionEditorImageCanvas.width, regionEditorImageCanvas.height);
        let annotationsCanvas = document.getElementById('regionEditorAnnotations');
        let ctxAnnotations = annotationsCanvas.getContext("2d");
        annotationsCanvas.width = canvasTopLayer.width;
        annotationsCanvas.height = canvasTopLayer.height;
        ctxAnnotations.clearRect(0, 0, annotationsCanvas.width, annotationsCanvas.height);
        ctxAnnotations.drawImage(canvasTopLayer, 0, 0, annotationsCanvas.width, annotationsCanvas.height);
        positionAnnotationsLayer();
        if (isAutoComparingImages()) {
            //console.log('drawing compare image:' + compareDividerPosition);
            if (comparingImageDirectionIsUp) {
                compareDividerPosition++;
                if (rotation == 0 || rotation == 180) {
                    if (compareDividerPosition >= regionEditor.imageNativeWidth) {
                        compareDividerPosition = regionEditor.imageNativeWidth + 5;
                        comparingImageDirectionIsUp = false;
                    }
                }
                else if (compareDividerPosition >= regionEditor.imageNativeHeight) {
                    compareDividerPosition = regionEditor.imageNativeHeight + 5;
                    comparingImageDirectionIsUp = false;
                }
            }
            else {
                compareDividerPosition--;
                if (compareDividerPosition <= 0) {
                    compareDividerPosition = -5;
                    comparingImageDirectionIsUp = true;
                }
            }
            clearStoredImageData();
            window.requestAnimationFrame(nextCompareStep);
        }
    }
    function nextCompareStep() {
        drawRegions();
        updateMagnifierIfShown();
    }
    function getColorRampValueRGBA(min, max, num, alpha, rgbColors) {
        // Check if the parameters are valid
        if (min > max || num < min || num > max || rgbColors.length < 2) {
            return ''; // Invalid input, return null
        }
        if (min == max) {
            //return the first item in the array
            return 'rgba(' +
                Math.round(rgbColors[0][0]) + ',' + // Red
                Math.round(rgbColors[0][1]) + ',' + // Green
                Math.round(rgbColors[0][2]) + ',' + //Blue
                alpha + ')'; // Alpha
            console.log('min == max');
        }
        // Calculate the relative position of the number in the range [0, 1]
        let position = (num - min) / (max - min);
        // Find the index of the lower color in the array
        let index = Math.floor(position * (rgbColors.length - 1));
        // Find the fraction of the position between the lower and upper colors
        let fraction = position * (rgbColors.length - 1) - index;
        // Get the lower and upper colors as RGB arrays
        let lower = rgbColors[index];
        let upper = rgbColors[index + 1];
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
            let pts = rotateFillPoint(regionEditor.imageRotation, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageMirrorHorizontally, x, y);
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
            let pts = rotateFillPoint(regionEditor.imageRotation, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageMirrorHorizontally, x, y);
            x = pts[0];
            y = pts[1];
            ctx.fillRect(x * scale, y * scale, scale, scale);
        }
        document.getElementById("valMinEmissivity").innerHTML = (min == 999 ? '--' : (min.toFixed(2)));
        document.getElementById("valMinEmissivityColor").style.backgroundColor = (min == max ? 'rgb(255,0,0)' : 'rgb(255,0,0)');
        document.getElementById("valMaxEmissivity").innerHTML = (max == -999 ? '--' : (max.toFixed(2)));
        document.getElementById("valMaxEmissivityColor").style.backgroundColor = (min == max ? 'rgb(255,0,0)' : 'rgb(0,0,255)');
    }
    function drawRegionMap(ctx, scale, drawShading) {
        for (let i = 0; i < regionEditor.regions.length; i++) {
            let region = regionEditor.regions[i];
            let isSelected = false;
            let drawControls = false;
            if (activeLayer == 'Spots') {
                isSelected = i == regionEditor.selectedRegionIndex;
                drawControls = isSelected && region.type == 'polygon' && activeTool.indexOf('point') > -1;
                if (drawControls) {
                    if (region.points.length <= 3 && activeTool == 'pointdelete') {
                        drawControls = false;
                    }
                }
            }
            drawRegion(ctx, scale, region, isSelected, region.color, null, drawControls, drawShading);
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
            let cel = Math.round(celsius * 10) / 10; //need to round first as this is what they see for on screen conversion
            let valF = (cel * 9 / 5) + 32;
            return (Math.round(valF * 10) / 10).toString();
        }
    }
    function changeRegionNext(nextRegion) {
        if (regionEditor.regions.length <= 1) {
            return;
        }
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
    CamManager.changeRegionNext = changeRegionNext;
    function setRegionIndex(regionIndex) {
        if (regionIndex < 0 || regionIndex >= regionEditor.regions.length) {
            console.error('invalid region index: ' + regionIndex);
            return;
        }
        if (regionIndex != regionEditor.selectedRegionIndex) {
            let region = regionEditor.regions[regionIndex];
            if (region.type == 'polygon') {
                if (selectedSpotIndex < 0 || selectedSpotIndex >= region.points.length) {
                    selectedSpotIndex = 0;
                }
            }
            else {
                selectedSpotIndex = -1;
            }
        }
        regionEditor.selectedRegionIndex = regionIndex;
        activeTool = 'select';
        recalcEditor();
        //I don't think this needs a undo.
    }
    function getRegionPointsOnCanvas(region, imageRotation, imageMirrorHorizontally, outlineOnly) {
        if (region.type == 'point') {
            return [{ "x": region.x, "y": region.y }]; //only one point
        }
        let canvas = document.createElement("canvas");
        if (imageRotation == 0 || imageRotation == 180) {
            canvas.width = regionEditor.imageNativeWidth;
            canvas.height = regionEditor.imageNativeHeight;
        }
        else {
            canvas.width = regionEditor.imageNativeHeight;
            canvas.height = regionEditor.imageNativeWidth;
        }
        let ctx = canvas.getContext("2d");
        let fillColor = outlineOnly ? null : 'black';
        drawRegion(ctx, 1, region, false, 'black', fillColor, false, false);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        let points = [];
        for (let i = 0; i < data.length; i += 4) {
            //i==R i+1==G i+2==B i+3==A
            if (data[i + 3] > 0) {
                let x = (i / 4) % canvas.width;
                let y = Math.floor((i / 4) / canvas.width);
                points.push({ "x": x, "y": y });
            }
        }
        //console.log('length ' + data.length / 4 + ' points: ' + points.length);
        return points;
    }
    function getCalcTempsFromPointsOnCanvas(points) {
        let lowCelsius = null;
        let highCelsius = null;
        let lowX = null;
        let lowY = null;
        let highX = null;
        let highY = null;
        let allCelsius = [];
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let index = getIndexOfMapFromXY(point.x, point.y, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally);
            if (index > -1) {
                let temp = (tempsCelsius != null && index < tempsCelsius.length) ? tempsCelsius[index] : null;
                if (temp != null) {
                    if (materialMap != null && index >= 0 && index < materialMap.length) {
                        let material = materialMap[index];
                        if (material != null) {
                            if (material.emissivity != null && material.emissivity > 0) {
                                let distanceMeters = cameraFixedDistanceMeters;
                                if (distanceMap != null && index >= 0 && index < distanceMap.length && distanceMap[index] != null) {
                                    distanceMeters = distanceMap[index];
                                }
                                let ambientTempC = temp; //todo this should be from an outside source.
                                temp = getAdjustedTempInCelsius(temp, ambientTempC, distanceMeters, material.emissivity);
                            }
                        }
                    }
                    if (temp != null) {
                        allCelsius.push(temp);
                        if (lowCelsius == null || temp < lowCelsius) {
                            lowCelsius = temp;
                            lowX = point.x;
                            lowY = point.y;
                        }
                        if (highCelsius == null || temp > highCelsius) {
                            highCelsius = temp;
                            highX = point.x;
                            highY = point.y;
                        }
                    }
                }
            }
            else {
                console.error("temp index out of bounds:" + index + "Length is: " + tempsCelsius.length + " point: " + point.x + "," + point.y + "");
                console.error('regionEditor.imageNativeWidth' + regionEditor.imageNativeWidth + ' regionEditor.imageNativeHeight' + regionEditor.imageNativeHeight);
            }
        }
        let avgCelsius = null;
        if (allCelsius.length > 0) {
            let totalCelsius = 0;
            for (let i = 0; i < allCelsius.length; i++) {
                totalCelsius += allCelsius[i];
            }
            avgCelsius = totalCelsius / allCelsius.length;
        }
        let regionTemps = { "avgCelsius": avgCelsius, "lowCelsius": lowCelsius, "highCelsius": highCelsius, "lowX": lowX, "lowY": lowY, "highX": highX, "highY": highY };
        //console.log('region temps: ' + JSON.stringify(regionTemps));
        return regionTemps;
    }
    function getRegionTemps(region) {
        //console.log('getting region temps')
        let points = getRegionPointsOnCanvas(region, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally, false); //This will return only points that are in bounds!
        return getCalcTempsFromPointsOnCanvas(points);
    }
    function updateSelectedRegionAttributes(region) {
        resetSelectedRegionAttributes();
        document.getElementById("valRegionIndex").innerHTML = "0 of 0";
        if (regionEditor.selectedRegionIndex > -1 && regionEditor.regions.length > 0) {
            document.getElementById("valRegionIndex").innerHTML = (regionEditor.selectedRegionIndex + 1) + " of " + regionEditor.regions.length;
        }
        let regionTemps = getRegionTemps(region);
        //console.log('region:' + JSON.stringify(region));
        //console.log('regionTemps: ' + JSON.stringify(regionTemps));
        document.getElementById("valRegionHighTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionHighTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, false) + '&deg;C';
        document.getElementById("valRegionHighTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionHighTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, true) + '&deg;F';
        document.getElementById("valRegionAverageTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionAverageTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.avgCelsius, false) + '&deg;C';
        document.getElementById("valRegionAverageTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionAverageTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.avgCelsius, true) + '&deg;F';
        document.getElementById("valRegionLowTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionLowTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, false) + '&deg;C';
        document.getElementById("valRegionLowTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionLowTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, true) + '&deg;F';
        document.getElementById("valToggleTempC").style.color = cameraEditor.isViewingCelsius ? 'white' : 'grey';
        document.getElementById("valToggleTempF").style.color = !cameraEditor.isViewingCelsius ? 'white' : 'grey';
        document.getElementById("valRegionName").innerHTML = region.name;
        document.getElementById("valRegionColor").innerHTML = region.color;
        document.getElementById("valRegionColorDemo").style.backgroundColor = region.color;
    }
    function resetSelectedRegionAttributes() {
        document.getElementById("valRegionIndex").innerHTML = "0 of 0";
        document.getElementById("valRegionHighTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionHighTempC").innerHTML = "--&deg;C";
        document.getElementById("valRegionHighTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionHighTempF").innerHTML = "--&deg;F";
        document.getElementById("valRegionAverageTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionAverageTempC").innerHTML = "--&deg;C";
        document.getElementById("valRegionAverageTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionAverageTempF").innerHTML = "--&deg;F";
        document.getElementById("valRegionLowTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionLowTempC").innerHTML = "--&deg;C";
        document.getElementById("valRegionLowTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valRegionLowTempF").innerHTML = "--&deg;F";
        document.getElementById("valRegionName").innerHTML = "--";
        document.getElementById("valRegionColor").innerHTML = "--";
        document.getElementById("valRegionColorDemo").style.backgroundColor = "grey";
    }
    function deleteRegionEditor() {
        if (regionEditor != null && regionEditor.selectedRegionIndex >= 0) {
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
    CamManager.deleteRegionEditor = deleteRegionEditor;
    function mirrorRegions(regions) {
        if (regions == null || regions.length == 0) {
            return;
        }
        for (let i = 0; i < regions.length; i++) {
            let region = regions[i];
            if (region.type == 'point') {
                if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
                    region.x = regionEditor.imageNativeWidth - region.x;
                }
                else {
                    region.y = regionEditor.imageNativeWidth - region.y; //mirror is always on horizontal axis
                }
            }
            else if (region.type == 'polygon') {
                for (let j = 0; j < region.points.length; j++) {
                    let point = region.points[j];
                    if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
                        point.x = regionEditor.imageNativeWidth - point.x;
                    }
                    else {
                        point.y = regionEditor.imageNativeWidth - point.y; //mirror is always on horizontal axis
                    }
                }
                region.x = region.points[0].x;
                region.y = region.points[0].y;
                fixRegionOutOfBounds(region, regionEditor.imageRotation); //recalcs width and height.
            }
            else {
                console.error('cannot mirror, unknown region type: ' + region.type);
            }
        }
    }
    function changeImageMirror() {
        regionEditor.imageMirrorHorizontally = !regionEditor.imageMirrorHorizontally;
        mirrorRegions(regionEditor.regions);
        hideTips();
        addRegionHistory('image mirror horizontally', null, false);
        recalcEditor();
    }
    CamManager.changeImageMirror = changeImageMirror;
    function changeImageFilterNext(nextFilter) {
        hideTips();
        let defaultImageFilter = imageFilters[0];
        let imageFilterIndex = 0;
        if (imageFilter != null) {
            imageFilterIndex = imageFilters.indexOf(imageFilter);
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
        recalcEditor();
        //filter is not part of history
    }
    CamManager.changeImageFilterNext = changeImageFilterNext;
    function changeRegionName() {
        if (regionEditor.selectedRegionIndex >= 0) {
            let region = regionEditor.regions[regionEditor.selectedRegionIndex];
            showPromptDialog(changeRegionNameCallback, "Spot Name", "Please enter a new spot name with maximum length of " + regionEditor.maxNameLength + " characters consisting only of letters, numbers and spaces.", region.name);
        }
    }
    CamManager.changeRegionName = changeRegionName;
    function changeRegionNameCallback(newName) {
        if (regionEditor != null && regionEditor.selectedRegionIndex >= 0) {
            let region = regionEditor.regions[regionEditor.selectedRegionIndex];
            if (newName != null && newName.trim() != "") {
                newName = newName.trim();
                if (newName.length > regionEditor.maxNameLength) {
                    showAlertDialog(null, 'Rename Spot', 'Name too long, max ' + regionEditor.maxNameLength + ' characters', true);
                    return;
                }
                else if (newName.toLowerCase() == 'image') {
                    showAlertDialog(null, 'Rename Spot', 'Name cannot be image', true);
                    return;
                }
                for (let i = 0; i < newName.length; i++) {
                    let c = newName.charAt(i);
                    if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == ' ')) {
                        showAlertDialog(null, 'Rename Spot', 'Invalid character in name: ' + c + ', only a-z, A-Z, 0-9 and spaces are allowed.', true);
                        return;
                    }
                }
                for (let i = 0; i < regionEditor.regions.length; i++) {
                    if (i == regionEditor.selectedRegionIndex) {
                        continue;
                    }
                    let region2 = regionEditor.regions[i];
                    if (region2.name.toLowerCase() == newName.toLowerCase()) {
                        showAlertDialog(null, 'Rename Spot', 'Name already exists.', true);
                        return;
                    }
                }
                region.name = newName;
                recalcEditor();
                addRegionHistory('change ' + region.type + ' name', regionEditor.selectedRegionIndex, true);
            }
        }
    }
    function drawNumbers(ctx, scale) {
        if (regionEditor != null && regionEditor.regions != null) {
            for (let i = 0; i < regionEditor.regions.length; i++) {
                let region = regionEditor.regions[i];
                drawNumber(ctx, scale, region, (i + 1));
            }
        }
    }
    function drawNumber(ctx, scale, region, number) {
        let fontScale = scale;
        let plotX = -1;
        let plotY = -1;
        if (scale < 2) {
            fontScale = 2;
            console.log('set font scale to:' + fontScale);
        }
        let strNumber = number <= 9 ? "0" + number.toString() : number.toString();
        ctx.setLineDash([]);
        ctx.lineWidth = 1 * scale;
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'grey';
        if (region.type == 'point') {
            plotX = region.x * scale;
            plotY = region.y * scale;
        }
        else {
            if (region.points != null && region.points.length > 1) {
                let bounds = getPolygonBounds(region.points);
                plotX = (((bounds.maxX * scale) - (bounds.minX * scale)) / 2) + (bounds.minX * scale);
                plotY = (((bounds.maxY * scale) - (bounds.minY * scale)) / 2) + (bounds.minY * scale);
            }
            else {
                return;
            }
        }
        ctx.beginPath();
        ctx.arc((plotX), (plotY), (4 * fontScale), 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = region.color;
        ctx.font = (Math.round(6 * fontScale)).toString() + 'px Tahoma, Verdana, Geneva,  sans-serif';
        let textX = (plotX) - fontScale * 3;
        let textY = (plotY) + fontScale * 2;
        ctx.fillText(strNumber, textX, textY);
    }
    function drawRegion(ctx, scale, region, isSelected, strokeColor, fillColor, drawControls, drawShading) {
        // Reset transformation matrix to the identity matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (region.type == "polygon") {
            if (region.points != null && region.points.length > 0) {
                ctx.beginPath();
                // we don't have a rotation angle
                //console.log('drawing polygon: ' + JSON.stringify(region.points));
                for (let i = 0; i < 2; i++) {
                    //0=draw a black line under as it helps it pop.
                    if ((i == 0 && !drawShading) || (i == 0 && fillColor != null)) {
                        continue; //do not draw if filling.
                    }
                    let myStrokeColor = i < 1 ? 'black' : strokeColor; //shading is black
                    ctx.moveTo((region.points[0].x * scale), (region.points[0].y * scale));
                    for (let i = 1; i < region.points.length; i++) {
                        ctx.lineTo((region.points[i].x * scale), (region.points[i].y * scale));
                    }
                    ctx.closePath();
                    if (isSelected && i > 0) {
                        ctx.setLineDash([4]);
                    }
                    else {
                        ctx.setLineDash([]);
                    }
                    ctx.lineWidth = 1 * scale;
                    ctx.strokeStyle = myStrokeColor;
                    ctx.stroke();
                    ctx.closePath();
                    if (fillColor != null) {
                        ctx.fillStyle = fillColor;
                        ctx.fill();
                    }
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
                            if ((i == selectedSpotIndex || activeTool == 'pointmove')) {
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
            for (let i = 0; i < 2; i++) {
                //0=draw a black line under as it helps it pop.
                if ((i == 0 && !drawShading) || (i == 0 && fillColor != null)) {
                    continue; //do not draw if filling.
                }
                let myStrokeColor = i < 1 ? 'black' : strokeColor; //shading is black
                //console.log('drawing point: ' + region.x + ',' + region.y);
                ctx.setLineDash([]);
                ctx.lineWidth = 1 * scale;
                ctx.strokeStyle = myStrokeColor;
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
            }
            if (isSelected) {
                ctx.beginPath();
                ctx.setLineDash([4]);
                ctx.strokeStyle = strokeColor;
                ctx.arc((region.x * scale), (region.y * scale), (8 * scale), 0, 2 * Math.PI);
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
            let point = points[index];
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }
        let bounds = { "minX": minX, "minY": minY, "maxX": maxX, "maxY": maxY, "width": maxX - minX, "height": maxY - minY, "x": minX, "y": minY };
        return bounds;
    }
    function fixRegionOutOfBounds(region, imageRotation) {
        if (region.type == 'point') {
            region.x = Math.max(region.x, 0);
            region.y = Math.max(region.y, 0);
            if (imageRotation == 0 || imageRotation == 180) {
                region.x = Math.min(region.x, regionEditor.imageNativeWidth - 1);
                region.y = Math.min(region.y, regionEditor.imageNativeHeight - 1);
            }
            else {
                region.x = Math.min(region.x, regionEditor.imageNativeHeight - 1);
                region.y = Math.min(region.y, regionEditor.imageNativeWidth - 1);
            }
        }
        else if (region.type == 'polygon') {
            //we need to adjust x and  y.
            let bounds = getPolygonBounds(region.points);
            region.angle = 0; //cannot rotate polygon.
            region.width = bounds.width;
            region.height = bounds.height;
            let moveX = 0;
            let moveY = 0;
            if (bounds.minX < 0) {
                moveX = 0 - bounds.minX;
            }
            else if ((imageRotation == 0 || imageRotation == 180) && bounds.maxX >= regionEditor.imageNativeWidth) {
                moveX = regionEditor.imageNativeWidth - bounds.maxX - 1;
            }
            else if ((imageRotation == 90 || imageRotation == 270) && bounds.maxX >= regionEditor.imageNativeHeight) {
                moveX = regionEditor.imageNativeHeight - bounds.maxX - 1;
            }
            if (bounds.minY < 0) {
                moveY = 0 - bounds.minY;
            }
            else if ((imageRotation == 0 || imageRotation == 180) && bounds.maxY > regionEditor.imageNativeHeight) {
                moveY = regionEditor.imageNativeHeight - bounds.maxY;
            }
            else if ((imageRotation == 90 || imageRotation == 270) && bounds.maxY > regionEditor.imageNativeWidth) {
                moveY = regionEditor.imageNativeWidth - bounds.maxY;
            }
            if (moveX != 0 || moveY != 0) {
                for (let index = 0; index < region.points.length; index++) {
                    region.points[index].x += moveX;
                    region.points[index].y += moveY;
                }
                bounds = getPolygonBounds(region.points);
            }
            region.x = bounds.x;
            region.y = bounds.y;
        }
        else {
            console.error('unknown region type: ' + region.type);
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
            fixRegionOutOfBounds(region, regionEditor.imageRotation);
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
            let region = regionEditor.regions[regionEditor.selectedRegionIndex];
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
            fixRegionOutOfBounds(region, regionEditor.imageRotation);
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
    CamManager.moveRegionBy = moveRegionBy;
    function resizeRegionBy(w, h) {
        if (w == 0 && h == 0) {
            return;
        }
        if (regionEditor != null && regionEditor.selectedRegionIndex >= 0) {
            let region = regionEditor.regions[regionEditor.selectedRegionIndex];
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
            fixRegionOutOfBounds(region, regionEditor.imageRotation);
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
    CamManager.resizeRegionBy = resizeRegionBy;
    function changeRegionColorNext(goNext) {
        if (regionEditor != null && regionEditor.selectedRegionIndex >= 0) {
            let region = regionEditor.regions[regionEditor.selectedRegionIndex];
            let currentIndex = regionColors.indexOf(region.color);
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
    CamManager.changeRegionColorNext = changeRegionColorNext;
    function getPointFromIndex(index, width, height) {
        let calcY = index % height;
        let calcX = Math.floor(index / height);
        return [calcX, calcY];
    }
    function getIndexOfMapFromXY(posX, posY, pointRotation, imageMirrorHorizontally) {
        let indexTempC = -1;
        let myX = posX;
        let myY = posY;
        if (regionEditor == null) {
            return -1;
        }
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
        if (regionEditor == null || regionEditor.regions.length == 0) {
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
            let points = getRegionPointsOnCanvas(region, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally, true);
            let index = findIndexOfClosestPoint(x, y, points, null);
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
        if (regionEditor == null || regionEditor.selectedRegionIndex < 0 || regionEditor.selectedRegionIndex >= regionEditor.regions.length) {
            return;
        }
        let region = regionEditor.regions[regionEditor.selectedRegionIndex];
        let dragX = Math.max(-200, Math.round(offsetX / imageScale));
        let dragY = Math.max(-200, Math.round(offsetY / imageScale));
        if (activeTool == 'look') {
            return; //nothing to do
        }
        else if (!isMouseMoveEvent && activeTool == 'select') {
            if (regionEditor.regions.length == 2) {
                changeRegionNext(true);
            }
            else if (regionEditor.regions.length > 2) {
                //todo find closest region that isn't this one.
                let indexOfClosestRegion = findIndexOfClosestRegion(dragX, dragY, [regionEditor.selectedRegionIndex]); //ignore the current region.
                if (indexOfClosestRegion == -1) {
                    console.log('no other regions found');
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
                    selectedSpotIndex = insertIndex;
                    activeTool = 'pointmove';
                    recalcEditor();
                    addRegionHistory('add point to ' + region.type, regionEditor.selectedRegionIndex, true); //force this
                }
            }
            else if (!isMouseMoveEvent && activeTool == 'pointdelete') {
                if (region.points.length > 3) {
                    let indexOfClosestPoint = findIndexOfClosestPoint(dragX, dragY, region.points, []);
                    if (indexOfClosestPoint > -1) {
                        region.points.splice(indexOfClosestPoint, 1);
                        recalcEditor();
                        addRegionHistory('remove point from ' + region.type, regionEditor.selectedRegionIndex, true); //force this
                    }
                }
            }
            else if (activeTool == 'pointmove') {
                if (!isMouseMoveEvent) {
                    let indexOfClosestPoint = findIndexOfClosestPoint(dragX, dragY, region.points, []);
                    if (indexOfClosestPoint > -1) {
                        selectedSpotIndex = indexOfClosestPoint;
                    }
                    else {
                        return;
                    }
                }
                if (selectedSpotIndex > -1 && selectedSpotIndex < region.points.length) {
                    region.points[selectedSpotIndex].x = dragX;
                    region.points[selectedSpotIndex].y = dragY;
                    recalcEditor();
                    addRegionHistory('move point in ' + region.type + 'pt:' + selectedSpotIndex, regionEditor.selectedRegionIndex, false);
                }
            }
        }
    }
    function setDefaultDistance() {
        if (selectedDistance == null) {
            return;
        }
        console.log('setting default distance to: ' + selectedDistance + ' for all null values. distanceMap.length: ' + distanceMap.length);
        for (let i = 0; i < distanceMap.length; i++) {
            if (distanceMap[i] == null) {
                distanceMap[i] = selectedDistance;
            }
        }
        activeTool = 'look';
        hideTips();
        recalcEditor();
        addMetaHistory('set default distance ' + selectedDistance, false);
    }
    CamManager.setDefaultDistance = setDefaultDistance;
    function processDistanceMouseEvent(offsetX, offsetY, isMouseMoveEvent) {
        if (regionEditor == null) {
            return;
        }
        if (activeTool == 'sample') {
            if (!isMouseMoveEvent) {
                let pts = getNativePoint(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally);
                if (pts == null) {
                    return;
                }
                let realX = pts[0];
                let realY = pts[1];
                let myIndex = getIndexOfMapFromXY(realX, realY, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally);
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
            let pts = getNativePoint(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally);
            if (pts == null) {
                return;
            }
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
            let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally, false, 1);
            if (indexes == null) {
                return;
            }
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
            let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, paintBrushSize);
            if (indexes == null) {
                return;
            }
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
            let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, eraseBrushSize);
            if (indexes == null) {
                return;
            }
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
        activeTool = 'look';
        hideTips();
        recalcEditor();
        addMetaHistory('set default material ' + JSON.stringify(selectedMaterial), false);
    }
    CamManager.setDefaultMaterial = setDefaultMaterial;
    function processMaterialMouseEvent(offsetX, offsetY, isMouseMoveEvent) {
        if (regionEditor == null) {
            return;
        }
        if (activeTool == 'sample') {
            if (!isMouseMoveEvent) {
                let pts = getNativePoint(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally);
                if (pts == null) {
                    return;
                }
                let realX = pts[0];
                let realY = pts[1];
                let myIndex = getIndexOfMapFromXY(realX, realY, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally);
                if (myIndex >= 0 && myIndex < materialMap.length) {
                    let material = materialMap[myIndex];
                    if (material != null) {
                        changeMaterial(material.name, material.emissivity);
                        return;
                    }
                }
                console.log('no material found at Index: ' + myIndex);
            }
        }
        else if (activeTool == 'fill') {
            if (selectedMaterial == null) {
                return;
            }
            let pts = getNativePoint(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally);
            if (pts == null) {
                return;
            }
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
            let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally, false, 1);
            if (indexes == null) {
                return;
            }
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
            let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, paintBrushSize);
            if (indexes == null) {
                return;
            }
            for (let i = 0; i < indexes.length; i++) {
                let index = indexes[i];
                if (index < materialMap.length && index >= 0) {
                    if (selectedMaterial == null) {
                        materialMap[index] = null;
                    }
                    else {
                        materialMap[index] = { "name": selectedMaterial.name, "emissivity": selectedMaterial.emissivity }; //todo this should be the current material
                    }
                }
            }
            recalcEditor();
            addMetaHistory(activeTool + ' material', false);
        }
        else if (activeTool == 'eraseround' || activeTool == 'erasesquare') {
            let indexes = getPaintIndexes(offsetX, offsetY, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight, regionEditor.imageRotation, imageScale, regionEditor.imageMirrorHorizontally, activeTool.indexOf('round') > -1, eraseBrushSize);
            if (indexes == null) {
                return;
            }
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
        if (regionEditor == null) {
            return;
        }
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
            let distance = Math.sqrt(
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
                if (currentX > 0) { // && newPixels[currentX - 1][currentY] != newColor) {
                    // Left
                    let checkX = currentX - 1;
                    let checkY = currentY;
                    let indexOfAdjacent = getIndexOfMapFromXY(checkX, checkY, 0, false);
                    if (newPixels[indexOfAdjacent] != newPixel && JSON.stringify(map2[indexOfAdjacent]) == existingStringifiedItem) {
                        if (checked.indexOf(indexOfAdjacent) == -1) {
                            checked.push(indexOfAdjacent);
                            queue.push(indexOfAdjacent);
                        }
                    }
                }
                if (currentX < width - 1) { // && newPixels[currentX + 1][currentY] != newColor) {
                    // Right
                    let indexOfAdjacent = getIndexOfMapFromXY(currentX + 1, currentY, 0, false);
                    if (newPixels[indexOfAdjacent] != newPixel && JSON.stringify(map2[indexOfAdjacent]) == existingStringifiedItem) {
                        if (checked.indexOf(indexOfAdjacent) == -1) {
                            checked.push(indexOfAdjacent);
                            queue.push(indexOfAdjacent);
                        }
                    }
                }
                if (currentY > 0) { // && newPixels[currentX][currentY - 1] != newColor) {
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
        if (pts == null) {
            return;
        }
        let realX = pts[0];
        let realY = pts[1];
        let myRotation = 0;
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
        if (activeLayer == 'Spots') {
            processRegionMouseEvent(offsetX, offsetY, isMouseMoveEvent);
        }
        else if (activeLayer == 'Dist') {
            processDistanceMouseEvent(offsetX, offsetY, isMouseMoveEvent);
        }
        else if (activeLayer == 'Matl') {
            processMaterialMouseEvent(offsetX, offsetY, isMouseMoveEvent);
        }
    }
    function getImageTemps() {
        if (regionEditor == null) {
            return;
        }
        let arraySize = (regionEditor.imageNativeHeight * regionEditor.imageNativeWidth);
        let points = new Array(arraySize);
        let index = -1;
        let myWidth = regionEditor.imageNativeWidth;
        let myHeight = regionEditor.imageNativeHeight;
        if (regionEditor.imageRotation == 90 || regionEditor.imageRotation == 270) {
            myWidth = regionEditor.imageNativeHeight;
            myHeight = regionEditor.imageNativeWidth;
        }
        for (let x = 0; x < myWidth; x++) {
            for (let y = 0; y < myHeight; y++) {
                index++;
                points[index] = { "x": x, "y": y };
            }
        }
        return getCalcTempsFromPointsOnCanvas(points);
    }
    function displayImageTemps() {
        let regionTemps = getImageTemps();
        if (regionTemps == null) {
            return;
        }
        document.getElementById("valImageHighTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valImageHighTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, false) + '&deg;C';
        document.getElementById("valImageHighTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valImageHighTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.highCelsius, true) + '&deg;F';
        document.getElementById("valImageAverageTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valImageAverageTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.avgCelsius, false) + '&deg;C';
        document.getElementById("valImageAverageTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valImageAverageTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.avgCelsius, true) + '&deg;F';
        document.getElementById("valImageLowTempC").style.visibility = cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valImageLowTempC").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, false) + '&deg;C';
        document.getElementById("valImageLowTempF").style.visibility = !cameraEditor.isViewingCelsius ? 'visible' : 'hidden';
        document.getElementById("valImageLowTempF").innerHTML = getDisplayTempFromCelsius(regionTemps.lowCelsius, true) + '&deg;F';
        tempRanges.highCelsius = regionTemps.highCelsius;
        tempRanges.lowCelsius = regionTemps.lowCelsius;
    }
    function toggleTemps() {
        if (cameraEditor.isEditing) {
            hasEdited = true;
        }
        hideTips();
        cameraEditor.isViewingCelsius = !cameraEditor.isViewingCelsius;
        hideTips();
        displayImageTemps();
        recalcEditor();
    }
    CamManager.toggleTemps = toggleTemps;
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
    }
    function drawTipMagnifier(x, y) {
        if (regionEditor == null) {
            return;
        }
        let regionEditorImageCanvas = document.getElementById('regionEditorImageCanvas');
        //const tipmagnifier = document.getElementById('tipmagnifier')!;
        const magnifierCanvas = document.getElementById('magnifierCanvas');
        if (storedImageData == null || storedImageRotation != regionEditor.imageRotation || storedImageMirrorHorizontally != regionEditor.imageMirrorHorizontally) {
            //console.log('Drawing A new magnifier with new image');
            let dummyCanvas = document.createElement('canvas');
            let ctxSource = dummyCanvas.getContext('2d'); //, {willReadFrequently: true});
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
            ctxSource.drawImage(regionEditorImageCanvas, 0, 0, dummyCanvas.width, dummyCanvas.height);
            //@ts-ignore
            storedImageData = ctxSource.getImageData(0, 0, dummyCanvas.width, dummyCanvas.height).data;
            storedImageRotation = regionEditor.imageRotation;
        }
        let ctx = magnifierCanvas.getContext('2d');
        ctx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'white';
        ctx.ellipse(100, 100, 75, 75, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        let pixelList = [];
        let pixelDist = 9;
        if (storedImageHeight == null || storedImageWidth == null) {
            return;
        }
        for (let pointx = x - pixelDist; pointx < x + pixelDist; pointx++) {
            for (let pointy = y - pixelDist; pointy < y + pixelDist; pointy++) {
                let rgba = "white";
                if (pointx < 0 || pointy < 0 || pointx > storedImageWidth - 1 || pointy > storedImageHeight - 1) {
                    rgba = "white";
                }
                else {
                    //90 90 is the center pixel of the magnifier.
                    //@ts-ignore
                    rgba = getRGBAFromCanvasData(storedImageData, storedImageWidth, pointx, pointy);
                    //console.log('pointx:' + pointx + ' pointy:' + pointy + ' rgba:' + rgba);
                }
                let magX = 90 + ((pointx - x) * 10);
                let magY = 90 + ((pointy - y) * 10);
                let pixel = { "x": magX, "y": magY, "color": rgba };
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
            { "x": 0, "y": 170, "length": 120 }, //some reason this wasn't clipping this one so reduced the length
        ], false); //horizontal
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
        ], true); //horizontal 
        drawLines(ctx, 1, "gold", [{ "x": 0, "y": 100, "length": 200 }], false); //horizontal
        drawLines(ctx, 1, "gold", [{ "x": 100, "y": 0, "length": 200 }], true); //vertical
        drawHotSpot(ctx, 90, 90, 10, 2);
        showTips();
    }
    function drawHotSpot(ctx, x, y, width, lineWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = lineWidth;
        ctx.rect(x, y, width, width); //, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        //draw a black border
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = lineWidth;
        ctx.rect(x - lineWidth, y - lineWidth, width + (lineWidth * 2), width + (lineWidth * 2));
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
    let lastMagnifierSettings = null;
    function updateMagnifierIfShown() {
        if (lastMagnifierSettings != null) {
            const tooltip = document.getElementById('tooltip');
            if (tooltip.style.display == 'block') {
                placeMagnifier(lastMagnifierSettings);
            }
        }
    }
    function placeMagnifier(magnifierSettings) {
        if (regionEditor == null) {
            return;
        }
        lastMagnifierSettings = magnifierSettings;
        //const image = document.querySelector('#regionEditorImage');
        const tooltip = document.getElementById('tooltip');
        const tipmagnifier = document.getElementById('tipmagnifier');
        const tiptarget = document.getElementById('tiptarget');
        let x = Math.max(0, Math.round(magnifierSettings.offsetX / imageScale));
        let y = Math.max(0, Math.round(magnifierSettings.offsetY / imageScale));
        let indexMap = -1;
        let posX = -1;
        let posY = -1;
        let placementOffsetX = 0;
        let placementOffsetY = 0;
        let magOffsetX = magnifierSettings.pageX - 100;
        let magOffsetY = magnifierSettings.pageY - 100;
        if (imageScale > 2 && magnifierSettings.offsetX > regionEditor.imageWidth / 2) {
            placementOffsetX -= 256; //bottom left x
            magOffsetX -= 340;
        }
        else {
            placementOffsetX += 50; //left side
            magOffsetX += 340;
        }
        if (magnifierSettings.offsetY > regionEditor.imageHeight / 2) {
            placementOffsetY -= 200;
            magOffsetY -= 160;
        }
        else {
            placementOffsetY += 100;
            magOffsetY += 140;
        }
        if (activeTool == 'paintsquare' || activeTool == 'erasesquare') {
            let myBrushSize = activeTool == 'paintsquare' ? paintBrushSize : eraseBrushSize;
            let width = (myBrushSize * imageScale) * 2;
            let posOffSetX = (myBrushSize * imageScale);
            let posOffSetY = (myBrushSize * imageScale);
            if (myBrushSize == 1) {
                posOffSetY += 8;
            }
            tiptarget.innerHTML = `<svg width="${width + 2}" height="${width + 2}" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width}" height="${width}" stroke="red" stroke-width="2" /></svg>`;
            tiptarget.style.top = `${magnifierSettings.pageY - posOffSetY}px`;
            tiptarget.style.left = `${magnifierSettings.pageX - posOffSetX}px`;
        }
        else if (activeTool == 'paintround' || activeTool == 'eraseround') {
            let myBrushSize = activeTool == 'paintround' ? paintBrushSize : eraseBrushSize;
            let width = (myBrushSize * imageScale) * 2;
            let posOffSetX = (myBrushSize * imageScale);
            let posOffSetY = (myBrushSize * imageScale);
            if (myBrushSize == 1) {
                posOffSetY += 8;
            }
            tiptarget.innerHTML = `<svg width="${width + 2}" height="${width + 2}" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="${width / 2 + 1}" cy="${width / 2 + 1}" r="${width / 2}" stroke="red" stroke-width="2" /></svg>`;
            tiptarget.style.top = `${magnifierSettings.pageY - posOffSetY}px`;
            tiptarget.style.left = `${magnifierSettings.pageX - posOffSetX}px`;
        }
        else {
            tiptarget.innerHTML = `<svg width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="16" height="16" stroke="black" stroke-width="2" /><rect x="7" y="7" width="12" height="12" stroke="red" stroke-width="2" /></svg>`;
            tiptarget.style.top = `${magnifierSettings.pageY - 12}px`;
            tiptarget.style.left = `${magnifierSettings.pageX - 12}px`;
        }
        tooltip.style.top = `${magnifierSettings.pageY + placementOffsetY}px`;
        tooltip.style.left = `${magnifierSettings.pageX + placementOffsetX}px`;
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
        indexMap = getIndexOfMapFromXY(posX, posY, regionEditor.imageRotation, regionEditor.imageMirrorHorizontally); //this is x and y of the image rotated
        //Emissivity is defined as the ratio of the energy radiated from a material's surface to that radiated from a perfect emitter, 
        //known as a blackbody, at the same temperature and wavelength and under the same viewing conditions. 
        //It is a dimensionless number between 0 (for a perfect reflector) and 1 (for a perfect emitter).
        let distanceText = "Not Defined";
        let materialText = "Not Defined";
        let emissivityText = "Not Defined";
        let distanceMeters = cameraFixedDistanceMeters;
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
        let material = null;
        if (indexMap >= 0 && indexMap < materialMap.length) {
            material = materialMap[indexMap];
            if (material != null) {
                materialEmissivity = material.emissivity;
                materialText = material.name;
                emissivityText = material.emissivity == null || material.emissivity <= 0 ? '0.00 Ignored' : material.emissivity.toFixed(2);
            }
        }
        else {
            console.error('material index out of bounds');
        }
        if (indexMap > -1) {
            let tempC = (tempsCelsius != null && indexMap < tempsCelsius.length) ? tempsCelsius[indexMap] : null;
            let ambientTempC = tempC;
            adjTempC = tempC;
            let strDBTempC = '--';
            let strDBTempF = '--';
            if (tempC != null && distanceMeters != null && materialEmissivity != null && materialEmissivity > 0) {
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
            if (material != null && (material.emissivity == null || material.emissivity <= 0)) {
                strDBTempC = 'Ignored';
                strDBTempF = '';
            }
            else {
                strDBTempC = getDisplayTempFromCelsius(adjTempC, false) + '&deg;C&nbsp;&nbsp;';
                strDBTempF = getDisplayTempFromCelsius(adjTempC, true) + '&deg;F';
            }
            let strAmbientTemp = cameraEditor.isViewingCelsius ? `${getDisplayTempFromCelsius(ambientTempC, false)}&deg;C` : `${getDisplayTempFromCelsius(ambientTempC, true)}&deg;F`;
            let strPixelTemp = cameraEditor.isViewingCelsius ? `${getDisplayTempFromCelsius(tempC, false)}&deg;C` : `${getDisplayTempFromCelsius(tempC, true)}&deg;F`;
            let strFinalTemp = cameraEditor.isViewingCelsius ? `${strDBTempC}` : `${strDBTempF}`;
            //index:${indexMap}
            let camera = null;
            let isThermalCamera = false;
            if (cameraEditor != null && cameraEditor.cameras != null && cameraEditor.selectedCameraIndex > -1 && cameraEditor.selectedCameraIndex < cameraEditor.cameras.length) {
                camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
                isThermalCamera = camera.isThermalCamera;
            }
            let sb = '';
            sb += `<span style="white-space:nowrap;font-size:13px;color:gray">X: ${posX}, Y: ${posY}</span><br/>`;
            if (isThermalCamera) {
                sb += `<span style="white-space:nowrap;font-size:13px;color:gray">Ambient Temp:&nbsp;${strAmbientTemp}</span><br/>`;
                sb += `<span style="white-space:nowrap;font-size:13px;color:gray">Pixel Temp:&nbsp;${strPixelTemp}</span><br/>`;
            }
            sb += `<span style="white-space:nowrap;font-size:13px;color:${strDistanceColor}">Distance:&nbsp;${distanceText}</span><br/>`;
            sb += `<span style="white-space:nowrap;font-size:13px;color:${strMaterialColor}">Matl:&nbsp;</span><span style="white-space:nowrap;font-size:12px;width:100px;text-overflow: ellipsis;overflow: hidden;color:${strMaterialColor}">${materialText}</span><br/>`;
            if (isThermalCamera) {
                sb += `<span style="white-space:nowrap;font-size:13px;color:${strMaterialColor}">Emissivity:&nbsp;${emissivityText}</span><br/>`;
                sb += `<span style="white-space:nowrap;font-size:13px;color:orange">Temp:&nbsp;${strFinalTemp}</span>`;
            }
            tooltip.innerHTML = sb;
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
        let magnifierSettings = { "offsetX": offsetX, "offsetY": offsetY, "pageX": pageX, "pageY": pageY };
        placeMagnifier(magnifierSettings);
    }
    function getAdjustedTempInCelsius(temperatureInCelsius, ambientTemperatureInCelsius, distanceMeters, emissivity) {
        if (emissivity <= 0) {
            return temperatureInCelsius;
        }
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
        if (element === null || item === null)
            return false;
        return element.getBoundingClientRect().right > item.clientX &&
            element.getBoundingClientRect().left < item.clientX &&
            element.getBoundingClientRect().top < item.clientY &&
            element.getBoundingClientRect().bottom > item.clientY;
    }
    function getEmptyRegionEditor() {
        return {
            "imageRotation": 0,
            "imageMirrorHorizontally": false,
            "maxNameLength": 15,
            "imageNativeWidth": 256,
            "imageNativeHeight": 192,
            "imageWidth": 256,
            "imageHeight": 192,
            "regions": [],
            "selectedRegionIndex": -1
        };
    }
    let doEditing = false;
    function go() {
        hideEverything();
        setupMouseEvents();
        let regionEditorBaseImage = document.getElementById('regionEditorBaseImage');
        regionEditorBaseImage.onload = function () {
            cameraChangedImageLoaded(cameraEditor.selectedCameraIndex, doEditing);
        };
        refreshCameras();
    }
    CamManager.go = go;
    function getApiSettings() {
        if (location.href.indexOf('github.io') > -1) {
            //when hosted on github pages, we have to make json calls and image calls with this prefix.
            return { "isDemo": true, "isPost": false, "url": "https://raw.githubusercontent.com/ie-corp/ThermalDemo/main", "rootUrl": "https://raw.githubusercontent.com/ie-corp/ThermalDemo/main" };
        }
        else if (false && location.href.indexOf('5500') > -1) {
            return { "isDemo": true, "isPost": false, "url": "", "rootUrl": "" }; //running locally
        }
        else {
            return { "isDemo": false, "isPost": true, "url": "http://localhost:81/jsonproxy.ashx", "rootUrl": "http://localhost:81" }; //running embedded
        }
    }
    function getFetch(scriptName, apiParams) {
        let apiSettings = getApiSettings();
        let myParms = null;
        if (apiParams != null && Object.keys(apiParams).length > 0) {
            myParms = JSON.stringify(apiParams);
        }
        if (apiSettings.isPost) {
            return fetch(apiSettings.url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "Ticket": null, "ScriptName": scriptName, "Parameters": myParms })
            });
        }
        else {
            return fetch(apiSettings.url + '/test_api_calls/' + scriptName + '.json');
        }
    }
    function showBusy(showSpinner) {
        document.getElementById('busyLayer').style.visibility = '';
        document.getElementById('busySpinner').style.visibility = showSpinner ? '' : 'hidden';
    }
    function hideBusy() {
        document.getElementById('busyLayer').style.visibility = 'hidden';
        document.getElementById('busySpinner').style.visibility = 'hidden';
    }
    function refreshCameras() {
        cameraEditor.isWatchingLive = false; //shut this off if it was on.
        showBusy(true);
        let apiSettings = getApiSettings();
        let camPrefix = apiSettings.rootUrl;
        let scriptName = 'rse_thermalcameras_get';
        getFetch(scriptName, {})
            .then(response => {
            if (!response.ok) {
                CamManager.showAlertDialog(() => {
                    CamManager.apiGetCamerasReceived(camPrefix, { "cameras": [] });
                }, 'Network Error', 'Network Error refreshing cameras.', true);
            }
            return response.json();
        })
            .then(json => {
            //console.log('response ok');
            let scriptReturnValue = json.ScriptReturnValue;
            if (typeof scriptReturnValue == 'string') {
                scriptReturnValue = JSON.parse(scriptReturnValue);
            }
            CamManager.apiGetCamerasReceived(camPrefix, scriptReturnValue);
        })
            .catch(error => {
            CamManager.showAlertDialog(() => {
                CamManager.apiGetCamerasReceived(camPrefix, { "cameras": [] });
            }, 'Network Error', 'Network Error refreshing cameras.', true);
        });
    }
    CamManager.refreshCameras = refreshCameras;
    function apiGetCamerasReceived(urlPrefix, jsonResult) {
        hideEverything();
        hideBusy();
        document.getElementById('mainEditor').style.display = 'block';
        let cameras = [];
        if (jsonResult != null && jsonResult.cameras != null) {
            let sortedArray = [...jsonResult.cameras];
            //sort these by name.
            sortedArray.sort((a, b) => {
                let nameA = (a.name ?? unknownCameraName).trim().toLowerCase();
                let nameB = (b.name ?? unknownCameraName).trim().toLowerCase();
                if (nameA < nameB) {
                    return -1;
                }
                else if (nameA > nameB) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
            for (let i = 0; i < sortedArray.length; i++) {
                let camera = sortedArray[i];
                let newCamera = {
                    "usbIndex": camera.usbIndex,
                    "api": camera.api,
                    "name": ((camera.name ?? unknownCameraName).trim()),
                    "existingName": (camera.isKnown ? camera.name : null),
                    "url": (camera.url != null && camera.url != "") ? (urlPrefix + camera.url) : null,
                    "isOnline": camera.isOnline,
                    "isThermalCamera": camera.isThermalCamera,
                    "isKnown": camera.isKnown,
                    "canEdit": camera.canEdit,
                    "materialMap": null,
                    "distanceMap": null,
                    "canDeleteCamera": camera.canDeleteCamera,
                    "canRenameCamera": camera.canRenameCamera,
                    "canEditRotation": camera.canEditRotation,
                    "canEditMirror": camera.canEditMirror,
                    "canDeleteSpots": camera.canDeleteSpots,
                    "canAddPointSpot": camera.canAddPointSpot,
                    "canAddPolygonSpot": camera.canAddPolygonSpot,
                    "canMoveSpots": camera.canMoveSpots,
                    "canRenameSpots": camera.canRenameSpots,
                    "canChangeSpotColor": camera.canChangeSpotColor,
                    "canEditDistanceLayer": camera.canEditDistanceLayer,
                    "canEditMaterialLayer": camera.canEditMaterialLayer
                };
                cameras.push(newCamera);
            }
        }
        cameraEditor.cameras = cameras;
        changeCamera(cameraEditor.selectedCameraIndex, false, false);
    }
    CamManager.apiGetCamerasReceived = apiGetCamerasReceived;
    function hideUI() {
        hideTips();
        document.getElementById('dialogAlert').style.display = 'none';
        document.getElementById('dialogConfirm').style.display = 'none';
        document.getElementById('dialogPrompt').style.display = 'none';
        document.getElementById('dialogRetention').style.display = 'none';
        document.getElementById('cameraTools').style.display = 'none';
        document.getElementById('cameraAssignLiveButtons').style.display = 'none';
        document.getElementById('cameraEditTools').style.display = 'none';
        document.getElementById('rowSpotTools').style.display = 'none';
        document.getElementById('rowMaterialTools').style.display = 'none';
        document.getElementById('rowDistanceTools').style.display = 'none';
        document.getElementById('touchTools').style.display = 'none';
        document.getElementById('regionEditorAnnotations').style.display = 'none';
    }
    function setStatusText(text, color, encode) {
        document.getElementById('statusText').innerHTML = encode ? escapeHTML(text) : text;
        document.getElementById('statusText').style.color = color;
    }
    function assignLiveCameraToSavedCamera(camIndex, liveIndex) {
        if (camIndex > -1 &&
            camIndex < cameraEditor.cameras.length &&
            liveIndex > -1 &&
            liveIndex < cameraEditor.cameras.length
            && camIndex != liveIndex) {
            let liveCam = cameraEditor.cameras[liveIndex];
            let cam = cameraEditor.cameras[camIndex];
            if (liveCam != null && cam != null
                && !liveCam.isKnown && cam.isKnown && (liveCam.usbIndex != null && liveCam.api != null)) {
                cam.usbIndex = liveCam.usbIndex;
                cam.api = liveCam.api;
                changeCamera(camIndex, true, true);
            }
        }
    }
    CamManager.assignLiveCameraToSavedCamera = assignLiveCameraToSavedCamera;
    function showAssignableCameras() {
        //if there are configured cameras but they aren't linked to a usbid because no match found
        //the camera can be relinked by viewing a live camera and clicking the assign button.
        var elm = document.getElementById('cameraAssignLiveButtons');
        let sb = '';
        let foundAssignableCamera = false;
        if (cameraEditor != null &&
            cameraEditor.cameras != null &&
            cameraEditor.cameras.length > 0 &&
            cameraEditor.selectedCameraIndex > -1 &&
            cameraEditor.selectedCameraIndex < cameraEditor.cameras.length) {
            let liveCamera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
            if (!liveCamera.isKnown && liveCamera.usbIndex != null && liveCamera.api != null) {
                let liveIndex = cameraEditor.selectedCameraIndex;
                for (let i = 0; i < cameraEditor.cameras.length; i++) {
                    let camera = cameraEditor.cameras[i];
                    //we want the buttons to line up beneath the existing buttons so hide the buttons if
                    //is a camera that can't be assignd.
                    let strButtonStyle = ' style="visibility:hidden" ';
                    if (camera.isKnown && camera.canEdit && (camera.usbIndex == null || camera.api == null) && camera.isThermalCamera == liveCamera.isThermalCamera) {
                        strButtonStyle = '';
                        foundAssignableCamera = true;
                    }
                    let strIndex = i.toString().padStart(2, '0');
                    sb += '<button ' + strButtonStyle + ' id="btnAssignCam' + strIndex + '" onclick="CamManager.assignLiveCameraToSavedCamera(' + i + ',' + liveIndex + ')" class="resizebutton2">';
                    sb += '<div style="line-height: 26px;">';
                    if (!camera.isOnline) {
                        sb += '<div id="valCam' + strIndex + 'Status" style="color:red;margin-top:-4px" class="regionditortextsub3">Offline</div>';
                    }
                    else {
                        sb += '<div id="valCam' + strIndex + 'Status" style="color:green;margin-top:-4px" class="regionditortextsub3">Online</div>';
                    }
                    sb += '<div class="regioneditortext" style="margin-top:-15px">Assign Image To</div>';
                    //camera names were already sanitized
                    let strStyle = '';
                    if (camera.name == unknownCameraName) {
                        strStyle = ' style="color:red"';
                    }
                    sb += '<div id="valCamAssign' + strIndex + 'Name" class="regionditortextsub3"' + strStyle + '>' + escapeHTML(camera.name) + '</div>';
                    sb += '</div>';
                    sb += '</button>';
                }
            }
        }
        if (foundAssignableCamera) {
            elm.innerHTML = sb;
            elm.style.display = '';
        }
        else {
            elm.innerHTML = '';
            elm.style.display = 'none';
        }
    }
    CamManager.showAssignableCameras = showAssignableCameras;
    function showUI() {
        if (cameraEditor.isEditing) {
            document.getElementById('cameraEditTools').style.display = '';
        }
        else {
            document.getElementById('cameraTools').style.display = '';
        }
        document.getElementById('cameraList').style.display = cameraEditor.isRetaining ? 'none' : '';
        getDomButton('btnRefreshCameras').style.display = cameraEditor.isRetaining ? 'none' : '';
        if (cameraEditor.selectedCameraIndex > -1) {
            if (!cameraEditor.isRetaining) {
                showAssignableCameras();
            }
            let camera = null;
            if (cameraEditor.cameras != null && cameraEditor.selectedCameraIndex > -1 && cameraEditor.selectedCameraIndex < cameraEditor.cameras.length) {
                camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
            }
            document.getElementById("rowSpotTools").style.display = (activeLayer != 'Spots' ? 'none' : '');
            if (activeLayer == 'Spots') {
                getDomButton("btnToggleTemps").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
                getDomButton("btnImageHighTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
                getDomButton("btnImageAverageTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
                getDomButton("btnImageLowTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
                getDomButton("btnRegionHighTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
                getDomButton("btnRegionAverageTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
                getDomButton("btnRegionLowTemp").style.display = (camera == null || !camera.isThermalCamera || activeLayer != 'Spots' ? 'none' : '');
            }
            document.getElementById("rowMaterialTools").style.display = (activeLayer != 'Matl' ? 'none' : '');
            document.getElementById("rowDistanceTools").style.display = (activeLayer != 'Dist' ? 'none' : '');
            document.getElementById("regionEditorAnnotations").style.display = '';
            document.getElementById('touchTools').style.display = '';
            positionAnnotationsLayer();
        }
    }
    function deleteCamera() {
        if (isDemo()) {
            showAlertDialog(null, 'Demo', 'This is a demo. Camera cannot be deleted.', true);
            return;
        }
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        let cameraName = camera.existingName;
        showConfirmDialog(deleteCameraCallback, "Delete Camera?", "Are you sure you want to delete the camera?");
    }
    CamManager.deleteCamera = deleteCamera;
    function deleteCameraCallback() {
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        let cameraName = camera.existingName;
        callDeleteCameras([cameraName]);
    }
    function callDeleteCameras(cameraNamesToDelete) {
        hideEverything();
        let apiSettings = getApiSettings();
        let camPrefix = apiSettings.rootUrl;
        let scriptName = 'rse_thermalcameras_delete';
        showBusy(true);
        getFetch(scriptName, { "cameraNamesToDelete": cameraNamesToDelete })
            .then(response => {
            if (!response.ok) {
                console.error('response not ok');
                CamManager.apicamerasDeletedReceived();
            }
            return response.json();
        })
            .then(json => {
            //console.log('response ok');
            let scriptReturnValue = json.ScriptReturnValue;
            if (typeof scriptReturnValue == 'string') {
                scriptReturnValue = JSON.parse(scriptReturnValue);
            }
            console.log('camera(s) deleted:' + JSON.stringify(cameraNamesToDelete));
            CamManager.apicamerasDeletedReceived();
        })
            .catch(error => {
            console.error('catch fetch deleteCamera', error);
            CamManager.apicamerasDeletedReceived();
        });
    }
    function apicamerasDeletedReceived() {
        hideBusy();
        cameraEditor.selectedCameraIndex = -1;
        cameraEditor.cameras = [];
        refreshCameras();
    }
    CamManager.apicamerasDeletedReceived = apicamerasDeletedReceived;
    function cancelCameraEdit() {
        if (!hasEdited) { //only confirm if there have been changes made.
            refreshCameras();
        }
        else {
            showConfirmDialog(cancelCameraCallback, "Discard Changes?", "Are you sure you want to discard your changes for the camera?");
        }
    }
    CamManager.cancelCameraEdit = cancelCameraEdit;
    function cancelCameraCallback() {
        refreshCameras();
    }
    function showRetained() {
        showAlertDialog(null, 'Retained', 'Retained Images are not supported yet', true);
    }
    CamManager.showRetained = showRetained;
    function retainSave() {
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        if (camera == null || lastRetentionFields == null) {
            return;
        }
        let myFields = JSON.parse(JSON.stringify(lastRetentionFields));
        //validate the fields.
        for (let i = 0; i < myFields.length; i++) {
            let field = myFields[i];
            let value = getDomInputValue(field.FormID, field.Values);
            if (field.Required && (value == null || value == '')) {
                showAlertDialog(() => { document.getElementById('dialogRetention').style.display = ''; positionAnnotationsLayer(); }, 'Error', `${field.DisplayName} is required.`, true);
                return;
            }
            if (field.Values == null) {
                if (field.MaximumLength > 0 && value != null && value.length > field.MaximumLength) {
                    showAlertDialog(() => { document.getElementById('dialogRetention').style.display = ''; positionAnnotationsLayer(); }, 'Error', `${field.DisplayName} cannot be longer than ${field.MaximumLength} characters.`, true);
                    return;
                }
                if (field.MinimumLength > 0 && value != null && value.length < field.MinimumLength) {
                    showAlertDialog(() => { document.getElementById('dialogRetention').style.display = ''; positionAnnotationsLayer(); }, 'Error', `${field.DisplayName} cannot be shorter than ${field.MinimumLength} characters.`, true);
                    return;
                }
            }
            field.Value = value;
        }
        cameraEditor.isRetaining = false;
        callSaveCameras(camera, true, myFields);
    }
    CamManager.retainSave = retainSave;
    function getDomInputValue(id, values) {
        if (values != null && values.length > 0) {
            let strValue = '';
            for (let i = 0; i < values.length; i++) {
                let value = values[i];
                let elm = document.getElementById(id + i.toString());
                if (elm != null && elm.checked) {
                    strValue = value;
                    break;
                }
            }
            return strValue.trim();
        }
        else {
            let elm = document.getElementById(id);
            if (elm == null) {
                return '';
            }
            return elm.value.trim();
        }
    }
    function retainLive() {
        if (!cameraEditor.isWatchingLive) {
            return;
        }
        cameraEditor.isRetaining = true;
        cameraEditor.isWatchingLive = false;
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        if (camera == null) {
            return;
        }
        getRetentionFields(camera);
    }
    CamManager.retainLive = retainLive;
    let lastRetentionFields = null;
    function RetentionFieldsReceived(camera, success, fields) {
        lastRetentionFields = fields;
        hideBusy();
        if (!success || fields == null || fields.length == 0) {
            return;
        }
        hideBusy();
        hideUI();
        let messageTitle = camera.name + ' Retention';
        document.getElementById('dialogRetentionTitle').innerHTML = escapeHTML(messageTitle);
        document.getElementById('dialogRetentionBody').innerHTML = 'Loading';
        document.getElementById('dialogRetention').style.display = '';
        let sb = '';
        for (let i = 0; i < fields.length; i++) {
            let field = fields[i];
            let strRequired = field.Required ? '*' : '';
            sb += `<div>${field.DisplayName}${strRequired}</div>`;
            sb += `<div style="margin-bottom:15px">`;
            switch (field.FieldType) {
                case 'datetime-local':
                    sb += `<input class="thermalFormField" type="datetime-local" id="${field.FormID}" name="${field.FormID}" value="${field.Value}" style="width:100%">`;
                    break;
                case 'text':
                    sb += `<input class="thermalFormField" type="text" id="${field.FormID}" name="${field.FormID}" value="${field.Value}" maxlength="${field.MaximumLength}" style="width:100%">`;
                    break;
                case 'textarea':
                    sb += `<textarea class="thermalFormField" style="resize:none;width:100%" rows="5" id="${field.FormID}" name="${field.FormID}">${field.Value}</textarea>`;
                    break;
                case 'radio':
                    if (field.Values != null && field.Values.length > 0) {
                        for (let j = 0; j < field.Values.length; j++) {
                            let strValue = field.Values[j];
                            sb += `<input class="thermalFormField" type="radio" id="${field.FormID + j.toString()}" name="${field.FormID}" value="${strValue}">`;
                            sb += `<label class="thermalFormField" for="${field.FormID + j.toString()}">${escapeHTML(strValue)}</label>`;
                            sb += '<br>';
                        }
                    }
                    break;
                default:
                    break;
            }
            sb += `</div>`;
        }
        document.getElementById('dialogRetentionBody').innerHTML = sb;
        showUI(); //let them see the form
    }
    CamManager.RetentionFieldsReceived = RetentionFieldsReceived;
    function getRetentionFields(camera) {
        showBusy(true);
        let scriptName = "rse_themalcameras_retention_config_get";
        getFetch(scriptName, { "isThermalCamera": camera.isThermalCamera })
            .then(response => {
            if (!response.ok) {
                console.error('getRetentionFields response not ok');
                CamManager.RetentionFieldsReceived(camera, false, null);
            }
            return response.json();
        })
            .then(json => {
            let scriptReturnValue = json.ScriptReturnValue;
            if (typeof scriptReturnValue == 'string') {
                scriptReturnValue = JSON.parse(scriptReturnValue);
            }
            CamManager.RetentionFieldsReceived(camera, true, scriptReturnValue.fields);
        })
            .catch(error => {
            console.error('catch fetch getRetentionFields', error);
            CamManager.RetentionFieldsReceived(camera, false, null);
        });
    }
    function watchLive() {
        cameraEditor.isWatchingLive = true;
        getLive();
    }
    CamManager.watchLive = watchLive;
    function getLive() {
        if (!cameraEditor.isWatchingLive) {
            return;
        }
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        if (camera == null || camera.usbIndex == null || camera.api == null) {
            return;
        }
        getDomButton('btnWatchLive').style.display = 'none';
        setStatusText('Fetching Live ' + camera.name + ' Camera...', 'white', true);
        let usbIndex = camera.usbIndex;
        let api = camera.api;
        getLiveCameraImage(api, usbIndex, null);
    }
    CamManager.getLive = getLive;
    /*
        export function showStreamed() {
            cameraEditor.isWatchingLive = false;
            let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
            showStreamedDialog(camera.name, camera.name + ' Stream');
        }
    
        function showStreamedDialog(cameraName: string, messageTitle: string) {
            hideBusy();
            hideUI();
            document.getElementById('dialogRetentionTitle')!.innerHTML = escapeHTML(messageTitle);
            document.getElementById('dialogRetentionBody')!.innerHTML = 'Loading';
            document.getElementById('dialogRetention')!.style.display = '';
            getStreamCameraImage(cameraName, Number.MAX_SAFE_INTEGER - 10000, false);
        }
    
        function showStreamGraph(scriptReturnValue: any) {
            if (scriptReturnValue == null) {
                hideBusy();
                hideUI();
                showUI();
                showAlertDialog(null, 'Error', 'Error loading history.', true);
                return;
            }
            else {
                let frameCount = scriptReturnValue.frameCount;
                let strMessage = `There are ${frameCount} historical images available.`;
                hideBusy();
                hideUI();
                showUI();
                showAlertDialog(null, 'Stream', strMessage, true);
                return;
            }
        }
        
    
        function getStreamCameraImage(cameraName: string, timeStamp: number, showImage: boolean) {
    
            showBusy(true);
            let scriptName = 'rse_thermalcamerasstream_get';
            getFetch(scriptName, { "cameraName": cameraName, "timeStamp": timeStamp })
                .then(response => {
                    if (!response.ok) {
                        console.error('response not ok');
                        showStreamGraph(null);
    
                    }
                    return response.json();
                })
                .then(json => {
                    console.log('response ok');
                    let scriptReturnValue = json.ScriptReturnValue;
                    if (typeof scriptReturnValue == 'string') {
                        scriptReturnValue = JSON.parse(scriptReturnValue);
                    }
                    if (showImage) {
                        CamManager.apiLiveCameraReceived(scriptReturnValue);
                    }
                    showStreamGraph(scriptReturnValue);
    
                })
                .catch(error => {
                    console.error('catch fetch getLiveImage', error);
                    showStreamGraph(null);
                })
    
        }
        */
    function closeThermalDialogAndRefresh() {
        cameraEditor.isRetaining = false;
        hideUI();
        showUI();
        CamManager.refreshCameras();
    }
    CamManager.closeThermalDialogAndRefresh = closeThermalDialogAndRefresh;
    let alertCallback = null;
    function showAlertDialog(callback, messageTitle, messageBody, escapeBody) {
        hideBusy();
        alertCallback = callback;
        hideUI();
        document.getElementById('dialogAlertTitle').innerHTML = escapeHTML(messageTitle);
        document.getElementById('dialogAlertBody').innerHTML = escapeBody ? escapeHTML(messageBody) : messageBody;
        document.getElementById('dialogAlert').style.display = '';
    }
    CamManager.showAlertDialog = showAlertDialog;
    function closeAlertDialog() {
        hideUI();
        showUI();
        if (alertCallback != null) {
            alertCallback();
        }
    }
    CamManager.closeAlertDialog = closeAlertDialog;
    let promptCallback = null;
    function showPromptDialog(callback, promptTitle, promptBody, promptValue) {
        promptCallback = callback;
        hideUI();
        document.getElementById('dialogPromptTitle').innerHTML = escapeHTML(promptTitle);
        document.getElementById('dialogPromptBody').innerHTML = escapeHTML(promptBody);
        document.getElementById('dialogPromptValue').value = promptValue;
        document.getElementById('dialogPrompt').style.display = '';
    }
    function closePromptDialog(isYes) {
        hideUI();
        showUI();
        if (isYes && promptCallback != null) {
            let value = document.getElementById('dialogPromptValue').value;
            promptCallback(value);
        }
    }
    CamManager.closePromptDialog = closePromptDialog;
    let confirmCallback = null;
    function showConfirmDialog(callback, confirmTitle, confirmBody) {
        confirmCallback = callback;
        hideUI();
        document.getElementById('dialogConfirmTitle').innerHTML = escapeHTML(confirmTitle);
        document.getElementById('dialogConfirmBody').innerHTML = escapeHTML(confirmBody);
        document.getElementById('dialogConfirm').style.display = '';
    }
    function closeConfirmDialog(isYes) {
        hideUI();
        showUI();
        if (isYes && confirmCallback != null) {
            confirmCallback();
        }
    }
    CamManager.closeConfirmDialog = closeConfirmDialog;
    function isDemo() {
        let settings = getApiSettings();
        return settings.isDemo;
    }
    function saveCamera() {
        if (isDemo()) {
            showAlertDialog(null, 'Demo', 'This is a demo. Changes cannot be saved.', true);
            return;
        }
        if (stagedUpdateCameraName != null) {
            cameraEditor.cameras[cameraEditor.selectedCameraIndex].name = stagedUpdateCameraName;
            stagedUpdateCameraName = null;
        }
        else {
            if (cameraEditor.cameras[cameraEditor.selectedCameraIndex].name == unknownCameraName || cameraEditor.cameras[cameraEditor.selectedCameraIndex].name == null) {
                showAlertDialog(null, 'Rename Camera', 'Please rename the camera before saving it.', true);
                return;
            }
        }
        callSaveCameras(cameraEditor.cameras[cameraEditor.selectedCameraIndex], false, null);
    }
    CamManager.saveCamera = saveCamera;
    function adjustRegions(sourceRegions, imageMirrorHorizontally, desiredMirrorHorizontally, originalRotation, desiredRotation, imageNativeWidth, imageNativeHeight) {
        if (sourceRegions == null || sourceRegions.length == 0) {
            return [];
        }
        let retRegions = JSON.parse(JSON.stringify(sourceRegions));
        if (imageMirrorHorizontally == desiredMirrorHorizontally && originalRotation == desiredRotation) {
            return retRegions;
        }
        if (imageMirrorHorizontally != desiredMirrorHorizontally) {
            mirrorRegions(retRegions);
        }
        let validRotations = [0, 90, 180, 270];
        if (originalRotation != desiredRotation && validRotations.includes(originalRotation) && validRotations.includes(desiredRotation)) {
            let currentRotation = originalRotation;
            while (currentRotation != desiredRotation) {
                rotateRegions90(retRegions, currentRotation, imageNativeWidth, imageNativeHeight);
                currentRotation += 90;
                if (currentRotation > 270) {
                    currentRotation = 0;
                }
            }
        }
        return retRegions;
    }
    function assignRegionsMapIndexes(regions, imageRotation, imageMirrorHorizontally) {
        if (regions != null && regions.length > 0) {
            for (let i = 0; i < regions.length; i++) {
                let region = regions[i];
                let tempPoints = getRegionPointsOnCanvas(region, imageRotation, imageMirrorHorizontally, false); //This will return only points that are in bounds!
                let indexes = [];
                for (let j = 0; j < tempPoints.length; j++) {
                    let point = tempPoints[j];
                    let index = getIndexOfMapFromXY(point.x, point.y, imageRotation, imageMirrorHorizontally);
                    if (index >= 0) {
                        if (index < tempsCelsius.length) {
                            indexes.push(index);
                        }
                        else {
                            console.error('region map index out of bounds: ' + index);
                        }
                    }
                    else {
                        console.error('region point could not find map index' + point.x + ',' + point.y);
                    }
                }
                if (indexes.length == 0) {
                    console.error('region has no valid map indexes');
                }
                else {
                    indexes.sort(function (a, b) { return a - b; });
                }
                region.mapIndexes = indexes;
            }
        }
    }
    function callSaveCameras(camera, isRetention, retentionFields = null) {
        if (regionEditor == null) {
            return;
        }
        hideEverything();
        let scriptName = isRetention ? 'rse_themalcameras_retention_save' : 'rse_thermalcameras_save';
        let saveRegions = JSON.parse(JSON.stringify(regionEditor.regions));
        //the editor rotates the regions. We must unrotate unmirror them. when saving.
        saveRegions = adjustRegions(saveRegions, regionEditor.imageMirrorHorizontally, false, regionEditor.imageRotation, 0, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
        //our regions are at rotation of 0 and not mirrored.
        assignRegionsMapIndexes(saveRegions, 0, false);
        //order the regions.
        saveRegions.sort(function (a, b) { return a.name.localeCompare(b.name); });
        /*
        if(saveRegions.length > 0){
            let lastRegion = saveRegions[saveRegions.length - 1];
            console.log('index test:' + lastRegion.mapIndexes[0]);
        }
        */
        let myParms = {
            "saveInfo": {
                existingName: camera.existingName,
                usbIndex: camera.usbIndex,
                api: camera.api,
                image: rawTiffImageData,
                configuration: {
                    "displayTemperatureInFahrenheit": !cameraEditor.isViewingCelsius,
                    "temperaturesInCelsius": tempsCelsius,
                    "dateCaptured": null,
                    "rawThermalData": null,
                    "imageDescription": null,
                    "name": camera.name,
                    "materialMap": materialMap,
                    "distanceMap": distanceMap,
                    "regions": saveRegions,
                    "imageNativeWidth": regionEditor.imageNativeWidth,
                    "imageNativeHeight": regionEditor.imageNativeHeight,
                    "imageRotation": regionEditor.imageRotation,
                    "imageMirrorHorizontally": regionEditor.imageMirrorHorizontally,
                    "imageScale": imageScale,
                    "retentionFields": retentionFields
                }
            }
        };
        showBusy(true);
        getFetch(scriptName, myParms)
            .then(response => {
            if (!response.ok) {
                console.error('response not ok');
                let message = 'There was an error saving the camera.';
                CamManager.apicamerasSaveReceived('Error Saving', message, true);
            }
            return response.json();
        })
            .then(json => {
            //console.log('response ok');
            let scriptReturnValue = json.ScriptReturnValue;
            if (typeof scriptReturnValue == 'string') {
                scriptReturnValue = JSON.parse(scriptReturnValue);
            }
            if (scriptReturnValue != null && scriptReturnValue.errorMessage != null && scriptReturnValue.errorMessage != "") {
                CamManager.apicamerasSaveReceived('Error Saving', scriptReturnValue.errorMessage, true);
            }
            else {
                let sb = '';
                if (!isRetention && (scriptReturnValue != null && scriptReturnValue.paths != null && scriptReturnValue.paths.length > 0)) {
                    sb += '<h3>A system reboot will be needed for the sensors to be monitored.</h3>';
                    sb += '<div>The following sensors were created:</div>';
                    sb += '<ol>';
                    for (let i = 0; i < scriptReturnValue.paths.length; i++) {
                        let path = scriptReturnValue.paths[i];
                        sb += '<li>';
                        if (path.MeasurementName != null && path.MeasurementName != '') {
                            sb += escapeHTML(path.Path) + '&nbsp;-&nbsp;' + escapeHTML(path.MeasurementName);
                        }
                        else {
                            sb += escapeHTML(path.Path);
                        }
                        sb += '</li>';
                    }
                    sb += '</ol>';
                }
                CamManager.apicamerasSaveReceived('Saved Successfully', sb, false);
            }
        })
            .catch(error => {
            CamManager.apicamerasSaveReceived('Error Saving', 'There was an error saving the camera.', false);
        });
    }
    function apicamerasSaveReceived(title, message, escapeBody) {
        hideBusy();
        showAlertDialog(saveOKDialog, title, message, escapeBody);
    }
    CamManager.apicamerasSaveReceived = apicamerasSaveReceived;
    function saveOKDialog() {
        cameraEditor.selectedCameraIndex = -1;
        cameraEditor.cameras = [];
        refreshCameras();
    }
    function renameCamera() {
        if (regionEditor == null) {
            return;
        }
        let cameraIndex = cameraEditor.selectedCameraIndex;
        let oldCamName = cameraEditor.cameras[cameraIndex].name;
        if (oldCamName == null || oldCamName.indexOf("-") > -1) {
            oldCamName = "";
        }
        let showName = oldCamName;
        showPromptDialog(renameCameraCallback, "Camera Name", "Please enter a new camera name with maximum length of " + regionEditor.maxNameLength + " characters consisting only of letters, numbers and spaces.", showName);
    }
    CamManager.renameCamera = renameCamera;
    let stagedUpdateCameraName = null;
    function renameCameraCallback(newName) {
        if (regionEditor == null) {
            return;
        }
        let cameraIndex = cameraEditor.selectedCameraIndex;
        let oldCamName = cameraEditor.cameras[cameraEditor.selectedCameraIndex].name;
        if (oldCamName == null || oldCamName.indexOf("-") > -1) {
            oldCamName = "";
        }
        if (newName != null && newName.trim() != "") {
            newName = newName.trim();
            if (oldCamName == newName) {
                return;
            }
            if (newName.length > regionEditor.maxNameLength) {
                showAlertDialog(null, 'Rename Camera', 'name too long, max ' + regionEditor.maxNameLength + ' characters', true);
                return;
            }
            for (let i = 0; i < newName.length; i++) {
                let c = newName.charAt(i);
                if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == ' ')) {
                    showAlertDialog(null, 'Rename Camera', 'Invalid character in name: ' + c + ', only a-z, A-Z, 0-9 and spaces are allowed.', true);
                    return;
                }
            }
            //is the name already in use?
            for (let i = 0; i < cameraEditor.cameras.length; i++) {
                if (i == cameraIndex) {
                    continue;
                }
                if ((cameraEditor.cameras[i].existingName + "").toLowerCase() == newName.toLowerCase()) {
                    showAlertDialog(null, 'Rename Camera', 'The camera name is already in use', true);
                    return;
                }
            }
            hasEdited = true;
            stagedUpdateCameraName = newName;
            setButtons();
            let elmName = document.getElementById('valCamName');
            elmName.innerHTML = newName;
            elmName.style.color = 'orange';
            setStatusText('Editing ' + newName + ' Camera', 'white', true);
        }
    }
    function getLiveCameraImage(api, usbIndex, url) {
        if (!cameraEditor.isWatchingLive) {
            showBusy(true);
        }
        let scriptName = 'rse_thermalcameraslive_get';
        getFetch(scriptName, { "api": api, "usbIndex": usbIndex, "url": url })
            .then(response => {
            if (!response.ok) {
                console.error('response not ok');
                CamManager.apiLiveCameraReceived({ "liveCamera": null });
            }
            return response.json();
        })
            .then(json => {
            //console.log('response ok');
            let scriptReturnValue = json.ScriptReturnValue;
            if (typeof scriptReturnValue == 'string') {
                scriptReturnValue = JSON.parse(scriptReturnValue);
            }
            CamManager.showAssignableCameras();
            CamManager.apiLiveCameraReceived(scriptReturnValue);
            if (cameraEditor.isWatchingLive) {
                let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
                if (camera == null || camera.usbIndex == null || camera.api == null) {
                    return;
                }
                getDomButton('btnWatchLive').style.display = 'none';
                setStatusText('Live ' + camera.name + ' Camera', 'white', true);
                setTimeout(() => {
                    CamManager.getLive(); //call ourself
                }, 100);
            }
        })
            .catch(error => {
            console.error('catch fetch getLiveImage', error);
            CamManager.apiLiveCameraReceived({ "liveCamera": null });
        });
    }
    //function base64ToArrayBuffer(base64) {
    //    return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    //}
    function base64ToArray(base64) {
        return Array.from(atob(base64), c => c.charCodeAt(0));
    }
    function apiLiveCameraReceived(jsonResult) {
        hideBusy();
        if (jsonResult == null || jsonResult.liveCamera == null) {
            let message = 'There was an error locating the camera image file.';
            if (jsonResult != null && jsonResult.errorMessage != null && jsonResult.errorMessage != "") {
                message = jsonResult.errorMessage;
            }
            showAlertDialog(null, 'Camera Error', message, true);
            return;
        }
        let liveCamera = jsonResult.liveCamera;
        if (jsonResult.isSavedImage) {
            getDomButton('btnRefreshLiveImage').style.borderColor = '';
            getDomButton('btnRefreshSavedImage').style.borderColor = 'white';
        }
        else {
            getDomButton('btnRefreshLiveImage').style.borderColor = 'white';
            getDomButton('btnRefreshSavedImage').style.borderColor = '';
        }
        //brgImageData is a byte[] that get converted to a base64 string by the c# Serializer
        //if they are viewing history they won't send this and we should just leave what is there alone.
        if (liveCamera != null && liveCamera.bgrImageData != null) {
            rawTiffImageData = base64ToArray(liveCamera.bgrImageData);
        }
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = liveCamera.nativeWidth;
        canvas.height = liveCamera.nativeHeight;
        let imageData = ctx.createImageData(canvas.width, canvas.height);
        //rgbaImageData is a byte[] that get converted to a base64 string by the c# Serializer
        imageData.data.set(base64ToArray(liveCamera.rgbaImageData));
        ctx.putImageData(imageData, 0, 0);
        let regionEditorBaseImage = document.getElementById('regionEditorBaseImage');
        regionEditorBaseImage.src = canvas.toDataURL();
        tempsCelsius = liveCamera.temperaturesInCelsius;
        if (regionEditor == null) {
            regionEditor = getEmptyRegionEditor();
            regionEditor.imageNativeWidth = canvas.width;
            regionEditor.imageNativeHeight = canvas.height;
            distanceMap = new Array(canvas.width * canvas.height);
            materialMap = new Array(canvas.width * canvas.height);
            imageScale = cameraEditor.defaultZoomLevel;
            imageFilter = 'inferno';
            activeLayer = 'Spots';
            activeTool = 'look';
            if (cameraEditor != null && cameraEditor.cameras != null && cameraEditor.cameras.length > 0 && cameraEditor.selectedCameraIndex > -1) {
                let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
                if (!camera.isThermalCamera) {
                    imageScale = 1;
                    imageFilter = 'none';
                }
            }
        }
        clearStoredImageData();
        updateMagnifierIfShown();
        hideBusy();
    }
    CamManager.apiLiveCameraReceived = apiLiveCameraReceived;
    function getSavedCameraImage(src, api, usbIndex) {
        showBusy(true);
        let xhr = new XMLHttpRequest();
        xhr.open("GET", src + "?t=" + new Date().getTime()); //nocache please
        xhr.responseType = "arraybuffer";
        xhr.onload = function (e) {
            if (xhr.status === 200 || xhr.status == 0) {
                getDomButton('btnRefreshLiveImage').style.borderColor = '';
                getDomButton('btnRefreshSavedImage').style.borderColor = 'white';
                imgLoaded(e);
                if (api != null && usbIndex != null) {
                    getLiveCameraImage(api, usbIndex, null);
                }
            }
            else {
                hideBusy();
                showAlertDialog(null, 'Camera Error', 'There was an error loading the camera image.', true);
            }
        };
        xhr.onerror = function () {
            hideBusy();
            showAlertDialog(null, 'Camera Error', 'There was an error loading the camera image.', true);
        };
        xhr.send();
    }
    function changeCamera(cameraIndex, editing, startWithHasEdited) {
        cameraEditor.isWatchingLive = false;
        regionEditor = null;
        hasEdited = false;
        if (editing && startWithHasEdited) {
            hasEdited = true;
        }
        ;
        activeLayer = 'Spots';
        activeTool = 'look';
        //activeLayer = 'Spots';
        stagedUpdateCameraName = null;
        doEditing = editing;
        cameraEditor.isEditing = false; //will flip if camera index is found
        hideUI();
        hideTips();
        if (cameraEditor.cameras.length > 0) {
            cameraEditor.selectedCameraIndex = Math.max(0, Math.min(cameraIndex, cameraEditor.cameras.length - 1));
            let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
            getDomButton('btnRefreshLiveImage').style.visibility = 'hidden';
            getDomButton('btnRefreshSavedImage').style.visibility = 'hidden';
            getDomButton('btnRefreshLiveImage').style.borderColor = '';
            getDomButton('btnRefreshSavedImage').style.borderColor = '';
            let usbIndex = camera.usbIndex;
            let api = camera.api;
            let src = camera.url;
            if (src != null && src != "") {
                getDomButton('btnRefreshSavedImage').style.visibility = 'visible';
                getDomButton('btnRefreshSavedImage').style.borderColor = 'white';
                if (usbIndex != null && api != null) {
                    getDomButton('btnRefreshLiveImage').style.visibility = 'visible';
                }
                getSavedCameraImage(src, api, usbIndex);
            }
            else if (usbIndex != null && api != null) {
                getDomButton('btnRefreshLiveImage').style.visibility = 'visible';
                getDomButton('btnRefreshLiveImage').style.borderColor = 'white';
                getLiveCameraImage(api, usbIndex, null);
            }
            else {
                console.log("Camera With No Live Image:" + JSON.stringify(camera));
                showAlertDialog(null, 'Camera Error', 'There is no image for this camera available.', true);
            }
        }
        else {
            //they need to see no cameras and a refresh button.
            console.log('no cameras detected or configured');
            cameraChangedImageLoaded(-1, editing);
        }
    }
    CamManager.changeCamera = changeCamera;
    function refreshSavedImage() {
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        if (camera.isKnown) {
            let url = camera.url;
            if (url != null && url != "") {
                getLiveCameraImage(null, null, camera.url);
            }
        }
    }
    CamManager.refreshSavedImage = refreshSavedImage;
    function refreshLiveImage() {
        let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        let api = camera.api;
        let usbIndex = camera.usbIndex;
        if (usbIndex != null && api != null) {
            getLiveCameraImage(api, usbIndex, null);
        }
    }
    CamManager.refreshLiveImage = refreshLiveImage;
    function imgLoaded(e) {
        //@ts-ignore
        let ifds = UTIF.decode(e.target.response);
        let ifd = ifds[0];
        //@ts-ignore
        UTIF.decodeImage(e.target.response, ifd); //this adds width, height, and data to the ifd object.
        rawTiffImageData = [...ifd.data];
        //@ts-ignore
        let rgba = UTIF.toRGBA8(ifd); // Uint8Array with RGBA pixels
        let tags = ifd;
        let exifIFD = tags.exifIFD;
        let userCommentTagID = "t37510";
        let userComment = exifIFD[userCommentTagID];
        let thermalData = JSON.parse(userComment);
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = ifd.width;
        canvas.height = ifd.height;
        let imageData = ctx.createImageData(canvas.width, canvas.height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);
        let regionEditorBaseImage = document.getElementById('regionEditorBaseImage');
        regionEditorBaseImage.src = canvas.toDataURL();
        tempsCelsius = thermalData.temperaturesInCelsius;
        if (tempsCelsius == null) {
            tempsCelsius = new Array(canvas.width * canvas.height);
        }
        else if (tempsCelsius.length != canvas.width * canvas.height) {
            console.error('tempsCelsius.length != canvas.width * canvas.height');
            tempsCelsius = new Array(canvas.width * canvas.height);
        }
        if (!cameraEditor.isEditing) {
            imageScale = thermalData.imageScale ?? cameraEditor.defaultZoomLevel;
            if (imageScale < cameraEditor.minZoomLevel || imageScale > cameraEditor.maxZoomLevel) {
                imageScale = cameraEditor.defaultZoomLevel;
                console.warn('Image Scale Was Out Of Bounds');
            }
            regionEditor = getEmptyRegionEditor();
            regionEditor.imageNativeWidth = canvas.width;
            regionEditor.imageNativeHeight = canvas.height;
            regionEditor.imageRotation = thermalData.imageRotation ?? 0;
            //console.log('Saved Image Data: rotation:' + regionEditor.imageRotation + ' width:' + regionEditor.imageNativeWidth + ' height:' + regionEditor.imageNativeHeight);
            if (regionEditor.imageRotation == 0 || regionEditor.imageRotation == 180) {
                regionEditor.imageWidth = regionEditor.imageNativeWidth * imageScale;
                regionEditor.imageHeight = regionEditor.imageNativeHeight * imageScale;
            }
            else {
                regionEditor.imageWidth = regionEditor.imageNativeHeight * imageScale;
                regionEditor.imageHeight = regionEditor.imageNativeWidth * imageScale;
            }
            regionEditor.imageMirrorHorizontally = thermalData.imageMirrorHorizontally ?? false;
            regionEditor.regions = thermalData.regions ?? [];
            //the editor expect these pre rotated and pre mirrored.
            regionEditor.regions = adjustRegions(regionEditor.regions, false, regionEditor.imageMirrorHorizontally, 0, regionEditor.imageRotation, regionEditor.imageNativeWidth, regionEditor.imageNativeHeight);
            if (regionEditor.regions.length > 0) {
                regionEditor.selectedRegionIndex = 0;
            }
            if (thermalData.distanceMap != null) {
                distanceMap = [...thermalData.distanceMap];
            }
            else {
                distanceMap = new Array(canvas.width * canvas.height);
            }
            if (thermalData.materialMap != null) {
                materialMap = [...thermalData.materialMap];
            }
            else {
                materialMap = new Array(canvas.width * canvas.height);
            }
            cameraEditor.isViewingCelsius = !(thermalData.displayTemperatureInFahrenheit == true);
            imageFilter = 'inferno';
            activeLayer = 'Spots';
            activeTool = 'look';
            if (cameraEditor != null && cameraEditor.cameras != null && cameraEditor.cameras.length > 0 && cameraEditor.selectedCameraIndex > -1) {
                let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
                if (!camera.isThermalCamera) {
                    imageScale = 1;
                    imageFilter = 'none';
                }
            }
        }
        clearStoredImageData();
        updateMagnifierIfShown();
        hideBusy();
    }
    function cameraChangedImageLoaded(cameraIndex, editing) {
        clearStoredImageData();
        showUI();
        updateMagnifierIfShown();
        if (cameraEditor.cameras.length > 0) {
            cameraEditor.selectedCameraIndex = cameraIndex;
            if (regionEditor != null) {
                historyStack = [];
                historyIndex = -1;
            }
            else {
                console.log('getting region editor because region editor is null');
                regionEditor = getEmptyRegionEditor();
                materialMap = new Array(regionEditor.imageNativeWidth * regionEditor.imageNativeHeight);
                distanceMap = new Array(regionEditor.imageNativeWidth * regionEditor.imageNativeHeight);
                imageScale = cameraEditor.defaultZoomLevel;
                imageFilter = 'inferno';
                //imageRotation = 0;
                if (cameraEditor != null && cameraEditor.cameras != null && cameraEditor.cameras.length > 0 && cameraEditor.selectedCameraIndex > -1) {
                    let camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
                    if (!camera.isThermalCamera) {
                        imageScale = 1;
                        imageFilter = 'none';
                    }
                }
            }
        }
        let cameraTools = document.getElementById('cameraTools');
        let cameraList = document.getElementById('cameraList');
        cameraList.innerHTML = '';
        if (editing) {
            document.getElementById('cameraEditTools').style.display = '';
            cameraTools.style.display = 'none';
        }
        else {
            document.getElementById('cameraEditTools').style.display = 'none';
            cameraTools.style.display = '';
        }
        let sb = '';
        setStatusText('', 'white', false);
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
                        let elmCamType = document.getElementById('valCamType');
                        elmCamType.style.color = camera.isThermalCamera ? "skyblue" : "DarkGray";
                        elmCamType.innerHTML = camera.isThermalCamera ? "Thermal Cam" : "Picture Cam";
                        let elmCamName = document.getElementById('valCamName');
                        elmCamName.innerHTML = camera.name;
                        elmCamName.style.color = camera.name == unknownCameraName ? "red" : "white";
                        let elmCamIssues = document.getElementById('valCamIssues');
                        elmCamIssues.innerHTML = "0";
                        if (camera.isOnline) {
                            setStatusText('Editing Online' + camera.name + ' Camera', 'white', true);
                        }
                        else {
                            setStatusText('Editing Offline ' + camera.name + ' Camera', 'red', true);
                        }
                        break;
                    }
                    else {
                        if (cameraEditor.isWatchingLive) {
                            setStatusText('Viewing Live ' + camera.name + ' Camera', 'white', true);
                        }
                        else {
                            if (camera.isOnline) {
                                setStatusText('Viewing Online ' + camera.name + ' Camera', 'white', true);
                            }
                            else {
                                setStatusText('Viewing Offline ' + camera.name + ' Camera', 'red', true);
                            }
                        }
                        sb += '<button id="btnCam' + strIndex + '" onclick="CamManager.changeCamera(' + i + ',' + (camera.canEdit ? 'true' : 'false') + ',false)" class="resizebutton2" style="border-color:white">';
                        sb += '<div style="line-height: 14px;">';
                        if (!camera.isOnline) {
                            sb += '<div id="valCam' + strIndex + 'Status" style="color:red;margin-top:3px" class="regionditortextsub3">Offline</div>';
                        }
                        else {
                            sb += '<div id="valCam' + strIndex + 'Status" style="color:green;margin-top:3px" class="regionditortextsub3">Online</div>';
                        }
                        if (camera.canEdit) {
                            sb += '<div class="regioneditortext" style="margin-top:-10px;color:orange">Tap To Edit</div>';
                        }
                        else {
                            sb += '<div class="regioneditortext" style="margin-top:-12px;color:red">Read Only</div>';
                        }
                        let strViewing = camera.isThermalCamera ? 'Thermal Cam' : 'Picture Cam';
                        let strCamTypeColor = camera.isThermalCamera ? 'skyblue' : 'DarkGray';
                        sb += '<div id="valCam' + strIndex + 'View" style="margin-top:-6px;color:' + strCamTypeColor + '" class="regionditortextsub3">' + strViewing + '</div>';
                        let strStyle = 'margin-top:-2px;';
                        if (camera.name == unknownCameraName) {
                            strStyle += 'color:red;';
                        }
                        sb += '<div id="valCam' + strIndex + 'Name" class="regionditortextsub3" style="' + strStyle + '">' + escapeHTML(camera.name) + '</div>';
                        sb += '</div>';
                        sb += '</button>';
                    }
                }
                else if (!editing) {
                    sb += '<button id="btnCam' + strIndex + '" onclick="CamManager.changeCamera(' + i + ',false,false)" class="resizebutton2">';
                    sb += '<div style="line-height: 14px;">';
                    if (!camera.isOnline) {
                        sb += '<div id="valCam' + strIndex + 'Status" style="color:red;margin-top:3px" class="regionditortextsub3">Offline</div>';
                    }
                    else {
                        sb += '<div id="valCam' + strIndex + 'Status" style="color:green;margin-top:3px" class="regionditortextsub3">Online</div>';
                    }
                    sb += '<div class="regioneditortext" style="margin-top:-10px;">&nbsp;</div>'; //this was Tap To View
                    let strViewing = camera.isThermalCamera ? 'Thermal Cam' : 'Picture Cam';
                    let strCamTypeColor = camera.isThermalCamera ? 'skyblue' : 'DarkGray';
                    sb += '<div style="margin-top:-6px;color:' + strCamTypeColor + '" class="regionditortextsub3">' + strViewing + '</div>';
                    //camera names were already sanitized
                    let strStyle = 'margin-top:-2px;';
                    if (camera.name == unknownCameraName) {
                        strStyle += 'color:red;';
                    }
                    sb += '<div id="valCam' + strIndex + 'Name" class="regionditortextsub3" style="' + strStyle + '">' + escapeHTML(camera.name) + '</div>';
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
        cameraList.innerHTML = sb;
        cameraList.style.display = cameraEditor.isRetaining ? 'none' : '';
        if (cameraEditor.cameras.length > 0) {
            goRegionEditor();
        }
        else {
            hideUI();
            document.getElementById('cameraTools').style.display = '';
        }
    }
    function setupMouseEvents() {
        const image = document.querySelector("#regionEditorImageCanvas");
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
                e.preventDefault(); //stop mouse down event from firing
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
                e.preventDefault(); //stop scrolling of the page
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
            });
        });
    }
    function showTemp(showImageTemp, showHighTemp) {
        if (regionEditor == null) {
            return;
        }
        let regionTemps = null;
        let x = null;
        let y = null;
        if (showImageTemp) {
            regionTemps = getImageTemps();
        }
        else {
            if (regionEditor.selectedRegionIndex >= 0 && regionEditor.regions != null && regionEditor.selectedRegionIndex < regionEditor.regions.length) {
                regionTemps = getRegionTemps(regionEditor.regions[regionEditor.selectedRegionIndex]);
            }
        }
        if (regionTemps != null) {
            if (showHighTemp) {
                x = regionTemps.highX;
                y = regionTemps.highY;
            }
            else {
                x = regionTemps.lowX;
                y = regionTemps.lowY;
            }
            if (x != null && y != null) {
                console.log('Show Temp x:' + x + ' y:' + y);
                const image = document.querySelector("#regionEditorImageCanvas");
                let isLeftMouseClick = false;
                let minY = image.offsetTop;
                let maxY = image.offsetTop + image.offsetHeight - 1;
                let minX = image.offsetLeft;
                let maxX = image.offsetLeft + image.offsetWidth - 1;
                let myX = minX + (x * imageScale);
                let myY = minY + (y * imageScale);
                let pageX = Math.max(Math.min(myX, maxX), minX);
                let pageY = Math.max(Math.min(myY, maxY), minY);
                let offsetX = pageX - image.offsetLeft - 1;
                let offsetY = pageY - image.offsetTop - 1;
                pointerMove(offsetX, offsetY, pageX, pageY, false, isLeftMouseClick);
            }
        }
    }
    CamManager.showTemp = showTemp;
    function goRegionEditor() {
        historyStack = [];
        historyIndex = -1;
        metaHistoryStack = [];
        metaHistoryIndex = -1;
        recalcEditor();
        if (activeLayer == 'Spots') {
            addRegionHistory('Initial ' + activeLayer + ' State', null, true);
        }
        else {
            addMetaHistory('Initial ' + activeLayer + ' State', true);
        }
        setButtons();
        displayImageTemps();
    }
    function zoomRegionEditor(scale) {
        hideTips();
        let value = imageScale + scale;
        if (value < cameraEditor.minZoomLevel) {
            value = cameraEditor.maxZoomLevel;
        }
        else if (value > cameraEditor.maxZoomLevel) {
            value = cameraEditor.minZoomLevel;
        }
        imageScale = value;
        recalcEditor();
        //Zoom Is not Part of History
    }
    CamManager.zoomRegionEditor = zoomRegionEditor;
    function capitalizeFirstLetter(val) {
        return val.charAt(0).toUpperCase() + val.slice(1);
    }
    function addRegion(regionType) {
        if (regionEditor == null) {
            return;
        }
        let camera = null;
        if (cameraEditor.selectedCameraIndex != -1 && cameraEditor.selectedCameraIndex < cameraEditor.cameras.length) {
            camera = cameraEditor.cameras[cameraEditor.selectedCameraIndex];
        }
        else {
            return;
        }
        if (regionTypes.indexOf(regionType) == -1) {
            console.error('unsupported region type: ' + regionType);
            return;
        }
        else if (regionType == 'point' && (!camera.canAddPointSpot || !camera.canMoveSpots)) {
            console.error('not authorized to add point spots or move them');
            return;
        }
        else if (regionType == 'polygon' && (!camera.canAddPolygonSpot || !camera.canMoveSpots)) {
            console.error('not authorized to add polygon spots or move them');
            return;
        }
        if (regionEditor.regions.length >= 99) {
            console.error('You have reached the maximum number of regions allowed.');
            return;
        }
        let colorToUse = 'Lime';
        let regionPrefix = capitalizeFirstLetter(regionType);
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
        let regionPoints = [];
        let regionAngle = 0.0;
        if (regionEditor.regions.length > 0) {
            let lastRegion = null;
            //@ts-ignore
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
            let myHeight = 40;
            regionPoints = [{ "x": x, "y": y }, { "x": myWidth + x, "y": y }, { "x": myWidth + x, "y": myHeight + y }, { "x": x, "y": myHeight + y }];
            let bounds = getPolygonBounds(regionPoints);
            regionX = bounds.x;
            regionY = bounds.y;
            regionWidth = bounds.width;
            regionHeight = bounds.height;
            selectedSpotIndex = 0;
        }
        let region = {
            "name": regionName,
            "type": regionType,
            "color": colorToUse,
            "x": regionX,
            "y": regionY,
            "width": regionWidth,
            "height": regionHeight,
            "angle": regionAngle,
            "points": regionPoints,
            "mapIndexes": []
        };
        fixRegionOutOfBounds(region, regionEditor.imageRotation);
        regionEditor.regions.push(region);
        regionEditor.selectedRegionIndex = regionEditor.regions.length - 1;
        activeTool = 'move'; //when they add, immediately select the move tool
        recalcEditor();
        addRegionHistory('new ' + regionType, regionEditor.selectedRegionIndex, true);
    }
    CamManager.addRegion = addRegion;
})(CamManager || (CamManager = {}));
;
//# sourceMappingURL=rsethermal.js.map