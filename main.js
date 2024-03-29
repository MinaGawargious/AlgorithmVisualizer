let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
}

let numNodes = 0;
let sourceNode = newLine = newWeightText = draggedItem = null;
let selectedRect = document.createElementNS(svgns, "rect");
setAttributes(selectedRect, {"fill": "none", "stroke": "blue"});
let selected = null;

let adjacencyList = {}; // startID: [endIds]
let lines = {}; // startID: [lineObject, label]
let func = Dijkstra;
let code = document.getElementById(`${func.name}Code`);
let codeParagraphs = code.getElementsByTagName("p");
let current = document.getElementById("current");
let startNode = null;

let steps = []; // {elements: [], actions: [], attributeList: [], print: String, clearCurrent: Bool}
let discovered = [];

let algorithms = Array.from(document.getElementsByClassName("algorithm"));
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        code.classList.add("invisible");
        steps = [];
        discovered = [];
        func = window[algorithm.id];
        code = document.getElementById(func.name+"Code");
        code.classList.remove("invisible");
        codeParagraphs = code.getElementsByTagName("p");
        setWeightedAndDirected(algorithm.getAttribute("weighted") == "true", algorithm.getAttribute("directed") == "true");
        console.log(algorithm);
    });
}
let weighted = algorithms.find(element => element.id == func.name).getAttribute("weighted") == "true";
let directed = algorithms.find(element => element.id == func.name).getAttribute("directed") == "true"; 

let h = 6, w = 4;
let defs = document.createElementNS(svgns, "defs");
for (let color of ["Black"]){
    for (let distance of ["Near", "Far"]){
        let arrowheadMarker = document.createElementNS(svgns, "marker");
        setAttributes(arrowheadMarker, {"id": `arrowhead${color}_${distance}`, "markerWidth": h, "markerHeight": w, "refX": distance == "Far" ? 0 : h, "refY": w/2, "orient": "auto", "fill": color});
        let arrowhead = document.createElementNS(svgns, "polygon");
        arrowhead.setAttribute("points", `0 0, ${h} ${w/2}, 0 ${w}`);
        arrowheadMarker.appendChild(arrowhead);
        defs.appendChild(arrowheadMarker); 
    }
}
svg.appendChild(defs);

let started = false;
let stepSlider = document.getElementById("stepSlider");
let playPause = document.getElementsByClassName("playPause")[0];
playPause.onclick = (event) => {
    event.preventDefault();
    if(playPause.classList.contains("play") && stepSlider.value != stepSlider.max) { // Currently paused. Now play.
        playPause.classList.remove("play");
        if(!started){
            started = true;
            func(startNode);
            console.log("setting max to ", steps.length);
            stepSlider.setAttribute("max", steps.length);
            stepSlider.classList.remove("disableSelect", "disableElement");
        }
        timeoutId = setTimeout(doStep, 0, parseInt(stepSlider.value));
    } else{ // Currently playing. Now pause.
        pause();
    }
};

let form = document.getElementsByTagName("form")[0];
let start = form.getElementsByTagName("input")[0];
form.onpaste = (event) => event.preventDefault();
form.onsubmit = (event) => {
    event.preventDefault();
    if(start.value != "" && start.value < numNodes && start.value != startNode.id){
        startNode.classList.remove("startNode");
        startNode = svg.getElementById(parseInt(start.value));
        startNode.classList.add("startNode");
        start.value = "";
    }
}
form.onkeypress = (event) => {
    var charCode = event.keyCode;
    return ( (charCode <= 31) || (charCode >= 48 && charCode <= 57) );
}

// Returns stroke, arrowhead, and end coordinates.
function getLineProperties(x1, y1, x2, y2){
    let distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    if(distance > 4*h){
        let theta = Math.atan((x2-x1)/(y1-y2));
        let dx = (y2 > y1) ? -4*h*Math.sin(theta) : 4*h*Math.sin(theta); // The 4 is from the stroke width.
        let dy = (y2 > y1) ? -4*h*Math.cos(theta) : 4*h*Math.cos(theta);
        return [x2-dx, y2+dy, "black", "arrowheadBlack_Far"];
    }
    return [x2, y2, "transparent", "arrowheadBlack_Near"];
}

function updateLabelPosition(x1, y1, x2, y2, label){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dy = (y2 > y1) ? -Math.sin(theta) : Math.sin(theta);
    let dx = (y2 > y1) ? -Math.cos(theta) : Math.cos(theta);
    let padding = 0.1;
    let labelWidth = label.getBBox().width, labelHeight = label.getBBox().height;
    let labelCenter = {"x": (x2+x1)/2 - dx*labelWidth*(0.5+padding), "y": (y2+y1)/2 - dy*labelHeight*(0.5 + padding)};
    setAttributes(label, {"x": labelCenter.x, "y": labelCenter.y, "text-anchor": "middle", "dominant-baseline": "middle"});
}

// Used to shift when we create a double connection and when we drag. (x1, y1) is source point, (x2, y2) is end point.
function updateDoubleConnection(incoming, outgoing, incomingLabel, outgoingLabel, x1, y1, x2, y2, id1, id2){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dx = (y2 > y1) ? -Math.cos(theta) : Math.cos(theta);
    let dy = (y2 > y1) ? -Math.sin(theta) : Math.sin(theta);
    if(directed){
        let [incomingX2, incomingY2, incomingArrowheadColor, incomingArrowhead] = getLineProperties(x1, y1, x2, y2);
        let [outgoingX2, outgoingY2, outgoingArrowheadColor, outgoingArrowhead] = getLineProperties(x2, y2, x1, y1);

        setAttributes(incoming, {"x1": x1 - w*dx, "y1": y1 - w*dy, "x2": incomingX2 - w*dx, "y2": incomingY2 - w*dy, "stroke": incomingArrowheadColor, "marker-end": `url(#${incomingArrowhead})`});
        setAttributes(outgoing, {"x1": x2 + w*dx, "y1": y2 + w*dy, "x2": outgoingX2 + w*dx, "y2": outgoingY2 + w*dy, "stroke": outgoingArrowheadColor, "marker-end": `url(#${outgoingArrowhead})`});
        setAttributes(incomingLabel, {"pointer-events": weighted ? "auto" : "none", "opacity": weighted ? 1 : 0});
        setAttributes(outgoingLabel, {"pointer-events": weighted ? "auto" : "none", "opacity": weighted ? 1 : 0});
    }else{
        setAttributes(incoming, {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "stroke": "black"});
        setAttributes(outgoing, {"x1": x2, "y1": y2, "x2": x1, "y2": y1, "stroke": "black"});
        incoming.removeAttribute("marker-end");
        outgoing.removeAttribute("marker-end");
        let labelToRemove = id1 < id2 ? incomingLabel : outgoingLabel;
        setAttributes(labelToRemove, {"pointer-events": "none", "opacity": 0});
    }

    updateLabelPosition(x1 - w*dx, y1 - w*dy, x2 - w*dx, y2 - w*dy, incomingLabel);
    updateLabelPosition(x2 + w*dx, y2 + w*dy, x1 + w*dx, y1 + w*dy, outgoingLabel);
}

function updateSingleConnection(line, label, x1, y1, x2, y2){
    if(x1 != x2 || y1 != y2){ // Avoid 0/0.
        let [lineX2, lineY2, lineArrowheadColor, lineArrowhead] = getLineProperties(x1, y1, x2, y2);
        setAttributes(line, {"x1": x1, "y1": y1, "x2": directed ? lineX2 : x2, "y2": directed ? lineY2 : y2, "stroke": directed ? lineArrowheadColor : "black"});
        directed ? setAttributes(line, {"marker-end": `url(#${lineArrowhead})`}) : line.removeAttribute("marker-end");
        updateLabelPosition(x1, y1, x2, y2, label);
    }
}

function updateAllLines(node){
    let x1 = node.cx.baseVal.value, y1 = node.cy.baseVal.value;
    // Incoming (override double connection below):
    for(let i = 0; i < Object.keys(adjacencyList).length; i++){
        if(adjacencyList[i].includes(node.id)){
            let incoming = lines[i][adjacencyList[i].indexOf(node.id)];
            let endNode = svg.getElementById(i);
            let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
            updateSingleConnection(incoming.lineObject, incoming.label, x2, y2, x1, y1);
        }
    }

    for(let i = 0; i < adjacencyList[node.id].length; i++){
        let endNodeId = adjacencyList[node.id][i];
        let endNode = svg.getElementById(endNodeId);
        let outgoing = lines[node.id][i];
        let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
        
        if(!adjacencyList[endNodeId].includes(node.id)){ // Just outgoing edges.
            updateSingleConnection(outgoing.lineObject, outgoing.label, x1, y1, x2, y2);
        }else{ // Double connection
            let incoming = lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)];
            updateDoubleConnection(incoming.lineObject, outgoing.lineObject, incoming.label, outgoing.label, x2, y2, x1, y1, endNodeId, node.id);
        }
    }
}

function setWeightedAndDirected(newWeight, newDirected){
    if(weighted != newWeight){
        weighted = newWeight;
        for(let i in lines){
            for(let j in lines[i]){
                setAttributes(lines[i][j].label, {"pointer-events": weighted ? "auto" : "none", "opacity": weighted ? 1 : 0});
            }
        }
        if(!weighted && newWeightText != null){
            setAttributes(newWeightText, {"pointer-events": "none", "opacity": 0});
        }
        console.log("CHANGING TO " + (weighted ? "" : "un") + "weighted");
    }

    if(directed != newDirected){
        directed = newDirected;
        for(let node of svg.getElementsByTagNameNS(svgns, "circle")){
            updateAllLines(node);
        }
        console.log("CHANGING TO " + (directed ? "" : "un") + "directed");
    }
}

let radius = window.innerWidth/30;
function createNewNode(){
    let nodeTextGroup = document.createElementNS(svgns, "g");
    let node = document.createElementNS(svgns, "circle");

    setAttributes(node, {"r": radius, "cx": Math.random() * window.getComputedStyle(svg,null).getPropertyValue("width").slice(0, -2), "cy": Math.random() * window.getComputedStyle(svg,null).getPropertyValue("height").slice(0, -2), "style": "stroke-width:4", "id": numNodes});
    node.classList.add("node");
    if(numNodes == 0){
        node.classList.add("startNode");
        startNode = node;
    }

    let newText = document.createElementNS(svgns, "text");
    setAttributes(newText, {"text-anchor": "middle", "x": parseFloat(node.cx.baseVal.value)-0.5, "y": parseFloat(node.cy.baseVal.value)+4, "font-weight": "bold", "font-size": "16", "class": "disableSelect nodeText"});
    newText.textContent = numNodes;

    let distanceText = document.createElementNS(svgns, "text");
    setAttributes(distanceText, {"text-anchor": "middle", "x": parseFloat(node.cx.baseVal.value)-0.5, "y": parseFloat(node.cy.baseVal.value)+radius+6, "font-weight": "bold", "font-size": "16", "class": "disableSelect nodeText"});
    adjacencyList[numNodes] = [];
    lines[numNodes++] = [];
    nodeTextGroup.append(node, newText, distanceText);
    svg.appendChild(nodeTextGroup);

    nodeTextGroup.addEventListener("click", (event) => {
        if(sourceNode == null){
            sourceNode = node;
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": node.cx.baseVal.value, "y1": node.cy.baseVal.value, "x2": node.cx.baseVal.value, "y2": node.cy.baseVal.value, "style": "stroke-width:4", "pointer-events": "none", "stroke": "black", "marker-end": directed ? "url(#arrowheadBlack_Near)" : "none"});

            newWeightText = document.createElementNS(svgns, "text");
            newWeightText.textContent = "1";
            newWeightText.addEventListener("click", (event) => {
                selected = event.target; // We can reference newWeightText when setting fields upon creation because it's not null then. But upon click, it is null, so to reference this unique text field again, use event.target.
                console.log(selected);
                selected.textContent += "|";
              
                setAttributes(selectedRect, {"x": parseFloat(selected.getAttribute("x")) - selected.getBBox().width/2, "y": parseFloat(selected.getAttribute("y")) - selected.getBBox().height/2, "width": selected.getBBox().width, "height": selected.getBBox().height});
                svg.appendChild(selectedRect);
                editLabel(selected);
            });

            // LABELS MUST BE IN MEMORY AT ALL TIMES IN ORDER TO RESTORE AT CORRECT SPOT AND WEIGHTS WHEN GOING TO A WEIGHTED ALGORITHM.
            setAttributes(newWeightText, {"x": node.cx.baseVal.value, "y": node.cy.baseVal.value, "pointer-events": (weighted ? "auto" : "none"), "opacity": weighted ? 1 : 0}); // Instead of removing labels from DOM for unweighted (slow), make them invisible and unclickable.
            let lineWeightGroup = document.createElementNS(svgns, "g");
            lineWeightGroup.append(newLine, newWeightText);
            svg.appendChild(lineWeightGroup);
        }else if(sourceNode != node && !adjacencyList[sourceNode.id].includes(node.id) && (directed || !adjacencyList[node.id].includes(sourceNode.id))){ // Second node to establish connection. Make sure we don't make an edge to ourselves or a duplicate edge. Also only allow edge in undirected graph if no edge between these two nodes exists.
            newLine.id = `edge${sourceNode.id}_${node.id}`;
            playPause.classList.remove("disableElement", "disableSelect");
            adjacencyList[sourceNode.id].push(node.id);
            lines[sourceNode.id].push({lineObject: newLine, label: newWeightText});
            setAttributes(newWeightText, {"node1": sourceNode.id, "node2": node.id});

            if(adjacencyList[node.id].includes(sourceNode.id) && directed){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${sourceNode.id}`);
                let outgoing = lines[node.id][index]; // newLine is incoming.
                updateDoubleConnection(newLine, outgoing.lineObject, newWeightText, outgoing.label, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value, sourceNode.id, node.id);
            }else{
                updateSingleConnection(newLine, newWeightText, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value);
            }
            newLine = sourceNode = newWeightText = null;
        }
    });
    nodeTextGroup.addEventListener("mouseover", (event) => {  updateHighlight(true, node); }); // Entering. mouseenter?
    nodeTextGroup.addEventListener("mouseleave", (event) => { updateHighlight(false, node); }); // Leaving
}

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", (event) => { createNewNode(); });

// I may consider changing this for speed: have an array of length numNodes, with each node's parent id, DOM element, & edge element from parent to itself. This avoids a document lookup at the expense of more memory used to store the DOM elements.
function updateHighlightHelper(highlight, node){ 
    // Highlight or unhighlight all nodes and edges from startNode to NODE.
    highlight ? node.classList.add("highlightedNode") : node.classList.remove("highlightedNode");
    if(node != startNode && node.hasAttribute("parent")){
        let parentID = node.getAttribute("parent");
        let incomingEdge = svg.getElementById(`edge${parentID}_${node.id}`);
        highlight ? incomingEdge.classList.add("highlightedEdge") : incomingEdge.classList.remove("highlightedEdge");
        let parentNode = svg.getElementById(parentID);
        updateHighlightHelper(highlight, parentNode);
    }
}
function updateHighlight(highlight, node){
    if(started && stepSlider.value == steps.length){ // Execution done
        updateHighlightHelper(highlight, node);
    }
}

function doneEditing(){
    if(svg.contains(selectedRect)){
        svg.removeChild(selectedRect);
    }
    if(selected != null){
        let parsedWeight = parseInt(selected.textContent.replace('|', '')); // parseInt eliminates trailing 0s. Returns NaN for not-a-number, such as empty strings.
        selected.textContent = isNaN(parsedWeight) ? "1" : parsedWeight;
        editLabel(selected);
        selected = null;
    }
}

svg.addEventListener("mousemove", (event) => {
    event.preventDefault();
    let X = event.offsetX, Y = event.offsetY;
    if(newLine != null){
        updateSingleConnection(newLine, newWeightText, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, X, Y);
    }else if(draggedItem != null && draggedItem.tagName == "circle"){
        setAttributes(draggedItem, {"cx": X, "cy": Y});
        setAttributes(draggedItem.nextElementSibling, {"x": X-0.5, "y": Y+4});
        setAttributes(draggedItem.nextElementSibling.nextElementSibling, {"x": X-0.5, "y": Y+6+radius});
        updateAllLines(draggedItem);
    }
});
svg.addEventListener("mousedown", (event) => {
    if(event.target.tagName == "circle"){
        draggedItem = event.target;
    }
    doneEditing();
});
svg.addEventListener("mouseup", (event) => { draggedItem = null; });

// Called when we edit a label's text to adjust the position.
function editLabel(label){
    let node1Id = label.getAttribute("node1"), node2Id = label.getAttribute("node2");
    let node1 = svg.getElementById(node1Id), node2 = svg.getElementById(node2Id);
    let incomingEntry = lines[node1Id][adjacencyList[node1Id].indexOf(node2Id)];
    
    if(!adjacencyList[node2Id].includes(node1Id)){ // Single connection.
        updateSingleConnection(incomingEntry.lineObject, incomingEntry.label, node1.cx.baseVal.value, node1.cy.baseVal.value, node2.cx.baseVal.value, node2.cy.baseVal.value);
    }else{ // Double connection.
        let outgoingEntry = lines[node2Id][adjacencyList[node2Id].indexOf(node1Id)];
        updateDoubleConnection(outgoingEntry.lineObject, incomingEntry.lineObject, outgoingEntry.label, incomingEntry.label, node2.cx.baseVal.value, node2.cy.baseVal.value, node1.cx.baseVal.value, node1.cy.baseVal.value, node2Id, node1Id);
    }
    setAttributes(selectedRect, {"x": parseFloat(selected.getAttribute("x")) - selected.getBBox().width/2, "y": parseFloat(selected.getAttribute("y")) - selected.getBBox().height/2, "width": selected.getBBox().width, "height": selected.getBBox().height});
}

document.addEventListener("keydown", (event) => {
    if(event.key == "Escape" || event.key == "Enter"){
        if(newWeightText != null){
            svg.removeChild(newWeightText.parentElement);
        }
        doneEditing();
        sourceNode = newLine = newWeightText = null;
    }else if(selected != null){
        // SVG text do not allow editing like input fields do, so I have to mimic it myself with the pipe character as the cursor.
        let cursorIndex = selected.textContent.indexOf("|");
        if(event.key == "ArrowLeft" && cursorIndex != 0){ // Move left.
            selected.textContent = selected.textContent.replace("|","");
            selected.textContent = selected.textContent.slice(0, cursorIndex - 1) + "|" + selected.textContent.slice(cursorIndex-1);
        }else if(event.key == "ArrowRight" && cursorIndex != selected.textContent.length-1){
            selected.textContent = selected.textContent.replace("|","");
            selected.textContent = selected.textContent.slice(0, cursorIndex + 1) + "|" + selected.textContent.slice(cursorIndex+1);
        }else if(event.key == "Backspace" || event.key == "Delete" && cursorIndex > 0){
            selected.textContent = selected.textContent.slice(0, cursorIndex-1) + selected.textContent.slice(cursorIndex);
            editLabel(selected);
        }else if(isFinite(event.key) && event.key != " " && selected.textContent.length < 6){ // 0 - 9
            selected.textContent = selected.textContent.slice(0, cursorIndex) + event.key + selected.textContent.slice(cursorIndex);
            editLabel(selected);
        }
    }else if(event.key == "ArrowRight"){ // Step forward. Pause execution.
        if(parseInt(stepSlider.value) < parseInt(stepSlider.max)){
            pause();
            doStepHelper(parseInt(stepSlider.value), true);
            stepSlider.value = parseInt(stepSlider.value) + 1;
            oldValue++;  
        }
    }else if(event.key == "ArrowLeft"){ // TODO: Step back. Pause execution.
    }else if(event.key == " "){
        event.preventDefault();
        if(!playPause.classList.contains("disableElement")){
            playPause.click(); // execute() has event listener on click, so spacebar will simulate a click to trigger that event listener (vs. calling a function that won't trigger event listener).
        }
    }
});
let oldValue = 0;
let baseWait = 2500;
let speedSlider = document.getElementById("speedSlider");
let timeoutId = null;

function clear(){
    if(timeoutId != null) {
        console.log("CLEARING");
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

/************************************************************ */
function doStepHelper(step, forward){
    if(step > 0){
        for(let index of steps[step-1]["indices"]){
            codeParagraphs[index].removeAttribute("style");
        }
    }
    
    if(steps[step]["clearCurrent"]){
        current.innerHTML = "";
    }
    let newCurrentText = document.createElement("p");
    newCurrentText.innerText = steps[step]["print"];
    current.appendChild(newCurrentText);

    for(let index of steps[step]["indices"]){
        codeParagraphs[index].setAttribute("style", "background:green;");
    }
    for(let j = 0; j < steps[step]["elements"].length; j++){
        let action = steps[step]["actions"][j];
        let element = steps[step]["elements"][j];
        let currentAttribute = steps[step]["attributeList"][j];
        if(action == "add"){
            element.classList.add(currentAttribute);
        }else if(action == "remove"){
            element.classList.remove(currentAttribute);
        }else if(action == "newParent"){
            element.setAttribute("parent", currentAttribute);
            console.log(`${element.id}'s parent is ${currentAttribute}`);
        }else if(action == "newDistance"){
            element.setAttribute("distance", currentAttribute);
            element.nextElementSibling.nextElementSibling.textContent = currentAttribute == Infinity ? "∞" : currentAttribute;
            console.log(`${element.id}'s distance is ${currentAttribute}`);
        }
    }
}

function doStep(step){
    let stepSliderValue = parseInt(stepSlider.value);
    if(step < stepSlider.max){
        doStepHelper(step, true);
        stepSlider.value = stepSliderValue + 1;
        oldValue = stepSliderValue + 1;

        if(step < stepSlider.max - 1){
            timeoutId = setTimeout(doStep, baseWait/speedSlider.value, step+1)
        }else{
            pause();
        }
    }else{
        pause();
    }
}

function pause(){
    console.log("PAUSED");
    playPause.classList.add("play");
    clear();
}
stepSlider.onmousedown = pause;
stepSlider.oninput = (event) => {
    console.log(oldValue, stepSlider.value);
    let stepSliderValue = parseInt(stepSlider.value);
    if(oldValue < stepSliderValue){ // Going forward
        while(oldValue < stepSliderValue){
            console.log("oldValue = ", oldValue, " and stepSlider.value = ", stepSlider.value);
            doStepHelper(oldValue++, true);
        }
    }else if(stepSliderValue < oldValue){ // Going backward
        while(stepSliderValue < oldValue){
            doStepHelper(--oldValue, false); // TODO: Add backwards functionality to doStepHelper (add instead of remove...)
        }
    }
}
/************************************************************ */

function DFS(node){
    // Highlight node as current:
    steps.push({"elements": [node, node, node], "actions": ["add", "add", "remove"], "attributeList": ["discoveredNode", "currentNode", "goingTo"], "indices": [0], "print": `DFS(${node.id})`, "clearCurrent": true});
    discovered.push(node.id);

    // Loop through the edges:
    for(let i in adjacencyList[node.id]){
        // Dehighlight node, highlight current edge.
        let edge = lines[node.id][i].lineObject;
        let neighborId = adjacencyList[node.id][i];
        steps.push({"elements": [node, edge, edge], "actions": ["remove", "add", "add"], "attributeList": ["currentNode", "discoveredEdge", "currentEdge"], "indices": [1], "print": `Try edge ${node.id} -> ${neighborId}`, "clearCurrent": true});

        // Go on to neighbor node:
        if(!discovered.includes(neighborId)){
            let neighbor = svg.getElementById(neighborId);
            steps.push({"elements": [edge, neighbor, neighbor], "actions": ["remove", "add", "newParent"], "attributeList": ["currentEdge", "goingTo", node.id], "indices": [2], "print": `Node ${neighborId} unvisited`, "clearCurrent": false});
            DFS(neighbor);
            steps[steps.length-1] = {"elements": [neighbor, neighbor, node], "actions": ["remove", "add", "add"], "attributeList": ["currentNode", "finishedNode", "currentNode"], "indices": [4], "print": `Done with DFS(${neighborId}). Back to DFS(${node.id})`, "clearCurrent": true}; // Override prior entry to make node current.
        }else{
            // Node already discovered, so this edge will not actually be explored.
            steps.push({"elements": [edge, node], "actions": ["remove", "add"], "attributeList": ["currentEdge", "currentNode"], "indices": [3], "print": `Node ${neighborId} already visited. Back to node ${node.id}`, "clearCurrent": true}); // clearCurrent = false?
        }
    }
   
    // Node finished:
    steps.push({"elements": [node, node], "actions": ["remove", "add"], "attributeList": ["currentNode", "finishedNode"], "indices": [4], "print": `Done with DFS(${node.id})`, "clearCurrent": true});  // If node is startNode, this will not be overridden. Mark node as finished.
}

function BFS(node){
    let Q = [node.id];
    discovered = [node.id];
    let distances = [];
    for(let i = 0; i < numNodes; i++){
        distances.push(Infinity);
    }
    distances[node.id] = 0;

    steps.push({"elements": [node, node], "actions": ["add", "add"], "attributeList": ["discoveredNode", "currentNode"], "indices": [0, 1], "print": `BFS(${node.id}):\nInitialize Q = {${Q}}`, "clearCurrent": true});
    let priorNode = null, currentNode = null;
    while(Q.length > 0){
        let currentNodeId = Q.shift();
        currentNode = svg.getElementById(currentNodeId);
        if(priorNode == null){
            steps.push({"elements": [currentNode, currentNode], "actions": ["add", "add"], "attributeList": ["discoveredNode", "currentNode"], "indices": [2, 3], "print": `Q = {${[currentNodeId].concat(Q)}} is not empty\nExploring neighbors of node v = ${currentNodeId}`, "clearCurrent": true});
        }else{
            steps.push({"elements": [currentNode, currentNode, priorNode, priorNode, priorNode], "actions": ["add", "add", "remove", "add", "remove"], "attributeList": ["discoveredNode", "currentNode", "currentNode", "finishedNode", "comingFrom"], "indices": [2, 3], "print": `Q = {${[currentNodeId].concat(Q)}} is not empty\nExploring neighbors of node v = ${currentNodeId}`, "clearCurrent": true});
        }

        for(let neighborId of adjacencyList[currentNodeId]){
            let edge = svg.getElementById(`edge${currentNodeId}_${neighborId}`);
            steps.push({"elements": [edge, edge, currentNode, currentNode], "actions": ["add", "add", "remove", "add"], "attributeList": ["discoveredEdge", "currentEdge", "currentNode", "comingFrom"], "indices": [4], "print": `Try edge ${currentNodeId} -> ${neighborId}`, "clearCurrent": true}); // Removing currentNode and adding comingFrom is redunant after first iteration.
            if(!discovered.includes(neighborId)){
                let neighbor = svg.getElementById(neighborId);
                steps.push({"elements": [neighbor, edge, neighbor, neighbor, neighbor, neighbor], "actions": ["add", "remove", "oldParent", "newParent", "oldDistance", "newDistance"], "attributeList": ["discoveredNode", "currentEdge", null, currentNodeId, null, distances[currentNodeId] + 1], "indices": [5], "print": `Node ${neighborId} not discovered. Q.push(${neighborId})`, "clearCurrent": false});
                Q.push(neighborId);
                distances[neighborId] = distances[currentNodeId] + 1;
                discovered.push(neighborId);
            }else{ // Ignore this node.
                steps.push({"elements": [edge], "actions": ["remove"], "attributeList": ["currentEdge"], "indices": [6], "print": `Node ${neighborId} already discovered. Skip it`, "clearCurrent": false});
            }
        }
        priorNode = currentNode;
    }
    steps.push({"elements": [currentNode, currentNode, currentNode], "actions": ["remove", "remove", "add"], "attributeList": ["currentNode", "comingFrom", "finishedNode"], "indices": [], "print": `BFS(${node.id}) Done`, "clearCurrent": true});
}

function Dijkstra(node){
    // Dijkstra's is basically weighted BFS.
    // Initialize all distances to infinity, except distance from source to source is 0. Also initialize all parents as null and Q = all nodes:
    let allNodes = Array.from(svg.getElementsByClassName("node"));
    let distances = [];
    let parents = [];
    let remainingNodeIDs = []; // Q
    let initialActions = []; // For the first step, we need to go from null distances to Infinity distances for all nodes.

    for(let i = 0; i < numNodes; i++){
        distances.push(Infinity);
        parents.push(null);
        remainingNodeIDs.push(i); 
        initialActions.push("oldDistance", "newDistance");
    }
    initialActions.sort(); // ["new"..."new", "old"..."old"].
    distances[node.id] = 0;
    steps.push({"elements": allNodes.concat(allNodes), "actions": initialActions, "attributeList": distances.concat(parents), "indices": [0, 1], "print": `Distance from source node ${node.id} to itself = 0.\nAll other distances = Infinity\nAll parents = null\nQ = priority queue of all nodes`, "clearCurrent": true}); // Sets all nodes' newDistance to Infinity and oldDistance to null. I use the parents array here as the null array instead of creating a new one.
    let priorNode = null, currentNode = null;

    while(remainingNodeIDs.length > 0){
        // Extract remaining node with minimum distance:
        let minIndex = 0; // Initialize minIndex to 0 so if we have disconnected nodes with distance Infinity, we take the first one and continue without trying to index -1.
        for(let i = 1; i < remainingNodeIDs.length; i++){
            if(distances[remainingNodeIDs[i]] < distances[remainingNodeIDs[minIndex]]){
                minIndex = i;
            }
        }
        let currentNodeId = remainingNodeIDs[minIndex];
        currentNode = svg.getElementById(currentNodeId);

        if(priorNode == null){
            steps.push({"elements": [currentNode, currentNode], "actions": ["add", "add"], "attributeList": ["discoveredNode", "currentNode"], "indices": [2, 3], "print": `Q = {${remainingNodeIDs}} is not empty\nExploring neighbors of node v = ${currentNodeId}`, "clearCurrent": true});
        }else{
            steps.push({"elements": [currentNode, currentNode, priorNode, priorNode, priorNode], "actions": ["add", "add", "remove", "add", "remove"], "attributeList": ["discoveredNode", "currentNode", "currentNode", "finishedNode", "comingFrom"], "indices": [2, 3], "print": `Q = {${remainingNodeIDs}} is not empty\nExploring neighbors of node v = ${currentNodeId}`, "clearCurrent": true});
        }
        remainingNodeIDs.splice(minIndex, 1);

        // Relax each edge:
        for(let neighborId of adjacencyList[currentNodeId]){
            let neighbor = svg.getElementById(neighborId)
            let edge = svg.getElementById(`edge${currentNodeId}_${neighborId}`);
            let weight = parseInt(edge.nextElementSibling.textContent);
            
            steps.push({"elements": [currentNode, currentNode, edge, edge], "actions": ["remove", "add", "add", "add"], "attributeList": ["currentNode", "comingFrom", "discoveredEdge", "currentEdge"], "indices": [4], "print": `Try edge ${currentNodeId} -> ${neighborId}`, "clearCurrent": true});

            let currentNodeDistance = distances[currentNodeId];
            let neighborDistance = distances[neighborId];
            if(neighborDistance > currentNodeDistance + weight){
                steps.push({"elements": [edge, neighbor, neighbor, neighbor, neighbor, neighbor], "actions": ["remove", "add", "oldParent", "newParent", "oldDistance", "newDistance"], "attributeList": ["currentEdge", "discoveredNode", parents[neighborId],currentNodeId, neighborDistance, currentNodeDistance + weight], "indices": [5, 6, 7], "print": `Node ${neighborId}'s current distance ${neighborDistance == Infinity ? "∞" : neighborDistance} > new weight ${currentNodeDistance + weight} (${currentNodeDistance} + ${weight})\nSet node ${neighborId}'s distance = ${currentNodeDistance + weight}\nSet node ${neighborId}'s parent = node ${currentNodeId}`, "clearCurrent": false});
                // This new path is shorter.
                parents[neighborId] = currentNodeId;
                distances[neighborId] = currentNodeDistance + weight;
            }else{
                // Ignore this edge.
                steps.push({"elements": [edge], "actions": ["remove"], "attributeList": ["currentEdge"], "indices": [8], "print": `Node ${neighborId}'s current distance ${neighborDistance} ${neighborDistance < currentNodeDistance + weight ? "<" : "="} new weight ${currentNodeDistance + weight} (${currentNodeDistance} + ${weight})\nNo change needed`, "clearCurrent": false});
            }
        }
        priorNode = currentNode;
    }
    steps.push({"elements": [currentNode, currentNode, currentNode], "actions": ["remove", "remove", "add"], "attributeList": ["currentNode", "comingFrom", "finishedNode"], "indices": [], "print": `Dijkstra(${node.id}) Done`, "clearCurrent": true});
    console.log(distances);
}

function Bellman_Ford(){}

// To allow for forward and back movement, I need the old and the new statuses. With "add" and "remove", I have that for classes, but for distances and parents, I need to track the old and new.
